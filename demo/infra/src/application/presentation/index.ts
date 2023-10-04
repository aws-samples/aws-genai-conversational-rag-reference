/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { FOUNDATION_MODEL_INVENTORY_SECRET } from "@aws/galileo-sdk/lib/models/env";
import { PDKNag } from "@aws/pdk/pdk-nag";
import { StaticWebsite, StaticWebsiteOrigin } from "@aws/pdk/static-website";
import {
  Authorizers,
  Integrations,
  TypeSafeApiIntegration,
} from "@aws/pdk/type-safe-api";
import {
  Api as TypeSafeApi,
  ApiIntegrations,
  MockIntegrations,
} from "api-typescript-infra";
import { INTERCEPTOR_IAM_ACTIONS } from "api-typescript-interceptors";
import { OperationConfig } from "api-typescript-runtime";
import {
  ArnFormat,
  CfnJson,
  NestedStack,
  NestedStackProps,
  Reference,
  Stack,
} from "aws-cdk-lib";
import { Cors } from "aws-cdk-lib/aws-apigateway";
import { GeoRestriction } from "aws-cdk-lib/aws-cloudfront";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import {
  Effect,
  IGrantable,
  Policy,
  PolicyStatement,
} from "aws-cdk-lib/aws-iam";
import { Function, IFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { IIdentityLayer } from "../identity";

export interface PresentationStackProps
  extends NestedStackProps,
    IIdentityLayer {
  readonly websiteContentPath: string;
  readonly geoRestriction?: GeoRestriction;
  readonly datastore: ITable;
  readonly datastoreIndex: string;
  readonly vpc: IVpc;
  readonly apiIntegrations?: Partial<ApiIntegrations>;
  readonly createChatMessageFn: IFunction;
  readonly corpusApiFn: IFunction;
  readonly runtimeConfigs?: object;
  readonly foundationModelInventorySecret: ISecret;
}

export class PresentationStack extends NestedStack {
  readonly typesafeApi: TypeSafeApi;
  readonly website: StaticWebsite;

  get apiEndpoint(): string {
    return this.typesafeApi.api.urlForPath();
  }

  get websiteUrl(): string {
    return `https://${this.website.cloudFrontDistribution.distributionDomainName}`;
  }

  constructor(scope: Construct, id: string, props: PresentationStackProps) {
    super(scope, id, props);

    const listChatsFn = new NodejsFunction(this, `listChats-Lambda`, {
      handler: "handler",
      runtime: Runtime.NODEJS_18_X,
      entry: require.resolve("./lambdas/chat/listChats"),
    });
    const createChatFn = new NodejsFunction(this, `createChat-Lambda`, {
      handler: "handler",
      runtime: Runtime.NODEJS_18_X,
      entry: require.resolve("./lambdas/chat/createChat"),
    });

    const updateChatFn = new NodejsFunction(this, `updateChat-Lambda`, {
      handler: "handler",
      runtime: Runtime.NODEJS_18_X,
      entry: require.resolve("./lambdas/chat/updateChat"),
    });

    const deleteChatFn = new NodejsFunction(this, `deleteChat-Lambda`, {
      handler: "handler",
      runtime: Runtime.NODEJS_18_X,
      entry: require.resolve("./lambdas/chat/deleteChat"),
    });

    const listChatMessagesFn = new NodejsFunction(
      this,
      `listChatMessages-Lambda`,
      {
        handler: "handler",
        runtime: Runtime.NODEJS_18_X,
        entry: require.resolve("./lambdas/chat/listChatMessages"),
      }
    );

    const deleteChatMessageFn = new NodejsFunction(
      this,
      `deleteChatMessage-Lambda`,
      {
        handler: "handler",
        runtime: Runtime.NODEJS_18_X,
        entry: require.resolve("./lambdas/chat/deleteChatMessage"),
      }
    );

    const listChatMessageSourcesFn = new NodejsFunction(
      this,
      `listChatMessageSources-Lambda`,
      {
        handler: "handler",
        runtime: Runtime.NODEJS_18_X,
        entry: require.resolve("./lambdas/chat/listChatMessageSources"),
      }
    );

    const llmInventoryFn = new NodejsFunction(this, `llmInventory-Lambda`, {
      handler: "handler",
      runtime: Runtime.NODEJS_18_X,
      entry: require.resolve("./lambdas/llm/inventory"),
      environment: {
        [FOUNDATION_MODEL_INVENTORY_SECRET]:
          props.foundationModelInventorySecret.secretName,
      },
    });
    props.foundationModelInventorySecret.grantRead(llmInventoryFn);

    // List of all lambda functions for automatic mappings
    const lambdas: Record<string, Function> = {
      listChats: listChatsFn,
      createChat: createChatFn,
      updateChat: updateChatFn,
      deleteChat: deleteChatFn,
      listChatMessages: listChatMessagesFn,
      deleteChatMessage: deleteChatMessageFn,
      listChatMessageSources: listChatMessageSourcesFn,
      lLMInventory: llmInventoryFn,
    };

    const corpusApiIntegration = Integrations.lambda(props.corpusApiFn);

    // Create the API
    this.typesafeApi = new TypeSafeApi(this, "Api", {
      defaultAuthorizer: Authorizers.iam(),
      corsOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
      // Supply an integration for every operation
      integrations: {
        ...MockIntegrations.mockAll(),
        ...Object.entries(lambdas).reduce((accum, [_path, _fn]) => {
          accum = {
            ...accum,
            [_path]: {
              integration: Integrations.lambda(_fn),
            },
          };
          return accum;
        }, {} as OperationConfig<TypeSafeApiIntegration>),
        createChatMessage: {
          integration: Integrations.lambda(props.createChatMessageFn),
        },
        similaritySearch: {
          integration: corpusApiIntegration,
        },
        embedDocuments: {
          integration: corpusApiIntegration,
        },
        embedQuery: {
          integration: corpusApiIntegration,
        },
        ...props.apiIntegrations,
      },
    });

    Object.values(lambdas).forEach((lambda) => {
      // interceptor access (identity)
      lambda.addToRolePolicy(
        new PolicyStatement({
          sid: "ApiInterceptors",
          effect: Effect.ALLOW,
          // TODO: the action and resources required should be handled by the api-typescript-interceptors package
          actions: [...INTERCEPTOR_IAM_ACTIONS],
          resources: [
            Stack.of(this).formatArn({
              resource: "userpool",
              resourceName: props.userPoolId,
              service: "cognito-idp",
              arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            }),
          ],
        })
      );
      // table
      lambda.addEnvironment("TABLE_NAME", props.datastore.tableName);
      lambda.addEnvironment("GSI_INDEX_NAME", props.datastoreIndex);
      props.datastore.grantReadWriteData(lambda);
      NagSuppressions.addResourceSuppressions(
        this,
        [
          {
            id: "AwsPrototyping-IAMNoManagedPolicies",
            reason:
              "AWS lambda basic execution role is acceptable since it allows for logging",
          },
          {
            id: "AwsPrototyping-IAMNoWildcardPermissions",
            reason:
              "Actions are scoped. Resource is scoped to specific DDB resource, /index/* is required",
          },
        ],
        true
      );
    });

    const policy = new Policy(this, "ApiAuthenticatedRolePolicy", {
      roles: [props.authenticatedUserRole],
      statements: [
        // Grant authenticated users in user pool "execute-api" permissions
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["execute-api:Invoke"],
          resources: [this.typesafeApi.api.arnForExecuteApi("*", "/*", "*")],
        }),
      ],
    });
    NagSuppressions.addResourceSuppressions(
      policy,
      [
        {
          id: "AwsPrototyping-IAMNoWildcardPermissions",
          reason: "needed for greedy api resource paths",
        },
      ],
      true
    );

    const createRuntimeConfig = <T extends Record<string, string>>(
      config: T
    ): Record<string, Reference> => {
      // Each value needs to be wrapped with CfnJson to resolve tokens cross-stack, wrapping everything in CfnJson will not work.
      return Object.fromEntries(
        Object.entries(config).map(([key, value]) => {
          return [
            key,
            new CfnJson(this, `RuntimeConfig-${key}`, { value }).value,
          ];
        })
      );
    };

    this.website = new StaticWebsite(this, "StaticWebsite", {
      websiteContentPath: props.websiteContentPath,
      runtimeOptions: {
        // Must wrap in CfnJson to resolve the cross-stack tokens (export/import)
        jsonPayload: createRuntimeConfig({
          apiUrl: this.typesafeApi.api.urlForPath(),
          region: Stack.of(this).region,
          identityPoolId: props.identityPoolId,
          userPoolId: props.userPoolId,
          userPoolWebClientId: props.userPoolWebClientId,
          ...props.runtimeConfigs,
        }),
      },
      distributionProps: {
        defaultBehavior: {
          origin: new StaticWebsiteOrigin(),
        },
        geoRestriction: props.geoRestriction,
      },
    });

    if (props.geoRestriction == null) {
      PDKNag.addResourceSuppressionsByPathNoThrow(
        Stack.of(this.website),
        this.website.cloudFrontDistribution.node.defaultChild!.node.path,
        [
          {
            id: "AwsPrototyping-CloudFrontDistributionGeoRestrictions",
            reason: "geo restrictions not applicable to this use case",
          },
        ]
      );
    }
  }

  grantInvokeApi(grantable: IGrantable) {
    return grantable.grantPrincipal.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["execute-api:Invoke"],
        resources: [this.typesafeApi.api.arnForExecuteApi("*", "/*", "*")],
      })
    );
  }
}
