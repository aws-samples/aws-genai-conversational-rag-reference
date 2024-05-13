/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { ApplicationConfig } from '@aws/galileo-cdk/src/core/app/context';
import { FOUNDATION_MODEL_INVENTORY_SECRET } from '@aws/galileo-sdk/lib/models/env';
import { PDKNag } from '@aws/pdk/pdk-nag';
import { StaticWebsite, StaticWebsiteOrigin } from '@aws/pdk/static-website';
import { Authorizers, Integrations, TypeSafeApiIntegration } from '@aws/pdk/type-safe-api';
import { Api as TypeSafeApi, ApiIntegrations, MockIntegrations } from 'api-typescript-infra';
import { INTERCEPTOR_IAM_ACTIONS } from 'api-typescript-interceptors';
import { OperationConfig } from 'api-typescript-runtime';
import { ArnFormat, CfnJson, Duration, NestedStack, NestedStackProps, Reference, Stack, Token } from 'aws-cdk-lib';
import { Cors } from 'aws-cdk-lib/aws-apigateway';
import { WebSocketLambdaAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { GeoRestriction } from 'aws-cdk-lib/aws-cloudfront';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, IGrantable, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function, IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { $ConnectFunction, $DisconnectFunction, WebSocketApi } from 'ws-api-typescript-infra';
import { InferenceEngine } from '../ai/inference-engine';
import { AppDataLayer } from '../data';
import { IIdentityLayer } from '../identity';

export interface PresentationStackProps extends NestedStackProps {
  readonly apiIntegrations?: Partial<ApiIntegrations>;
  readonly appData: AppDataLayer;
  readonly config: ApplicationConfig;
  readonly corpus: {
    readonly corpusApiFn: IFunction;
    readonly searchUrl: string;
  };
  readonly enableInferenceEngineAutoscaling?: boolean;
  readonly foundationModels: {
    readonly inventorySecret: ISecret;
    readonly policyStatements: PolicyStatement[];
    readonly crossAccountRoleArn?: string;
  };
  readonly identity: IIdentityLayer;
  readonly runtimeConfigs?: object;
  readonly vpc: IVpc;
  readonly websiteProps: {
    readonly geoRestriction?: string | string[] | GeoRestriction;
    readonly websiteContentPath: string;
  };
}

const NODE_RUNTIME = Runtime.NODEJS_20_X;

export class PresentationStack extends NestedStack {
  readonly engine: InferenceEngine;
  readonly typesafeApi: TypeSafeApi;
  readonly website: StaticWebsite;
  readonly wsApi: WebSocketApi;

  get apiEndpoint(): string {
    return this.typesafeApi.api.urlForPath();
  }

  get websiteUrl(): string {
    return `https://${this.website.cloudFrontDistribution.distributionDomainName}`;
  }

  constructor(scope: Construct, id: string, props: PresentationStackProps) {
    super(scope, id, props);

    const { appData, config, corpus, foundationModels, identity, vpc, websiteProps } = props;

    this.engine = new InferenceEngine(this, 'InferenceEngine', {
      vpc,
      chatMessageTable: appData.datastore,
      chatMessageTableGsiIndexName: appData.gsiIndexName,
      wsConnectionsTable: appData.wsConnections,
      chatDomain: config.chat.domain,
      searchUrl: corpus.searchUrl,
      foundationModelInventorySecret: foundationModels.inventorySecret,
      foundationModelPolicyStatements: foundationModels.policyStatements,
      // Arn is from other account provided in context, not local deployment
      // Useful for developer account access to deployed models in their developer accounts without deploying models
      // Only available in Dev stage and is optional
      foundationModelCrossAccountRoleArn: foundationModels.crossAccountRoleArn,
      adminGroups: [identity.adminGroupName],
      userPoolClientId: identity.userPoolWebClientId,
      userPoolId: identity.userPoolId,
      userPoolArn: identity.userPoolArn,
      enableAutoScaling: true,
    });

    const listChatsFn = new NodejsFunction(this, `listChats-Lambda`, {
      handler: 'handler',
      runtime: NODE_RUNTIME,
      entry: require.resolve('./lambdas/chat/listChats'),
    });
    const createChatFn = new NodejsFunction(this, `createChat-Lambda`, {
      handler: 'handler',
      runtime: NODE_RUNTIME,
      entry: require.resolve('./lambdas/chat/createChat'),
    });

    const updateChatFn = new NodejsFunction(this, `updateChat-Lambda`, {
      handler: 'handler',
      runtime: NODE_RUNTIME,
      entry: require.resolve('./lambdas/chat/updateChat'),
    });

    const deleteChatFn = new NodejsFunction(this, `deleteChat-Lambda`, {
      handler: 'handler',
      runtime: NODE_RUNTIME,
      entry: require.resolve('./lambdas/chat/deleteChat'),
      // TODO: need to optimize how dependent entities are deletes to be bulk (sources + messages)
      // until then just setting this to 60s timeout
      timeout: Duration.seconds(60),
    });

    const listChatMessagesFn = new NodejsFunction(this, `listChatMessages-Lambda`, {
      handler: 'handler',
      runtime: NODE_RUNTIME,
      entry: require.resolve('./lambdas/chat/listChatMessages'),
    });

    const deleteChatMessageFn = new NodejsFunction(this, `deleteChatMessage-Lambda`, {
      handler: 'handler',
      runtime: NODE_RUNTIME,
      entry: require.resolve('./lambdas/chat/deleteChatMessage'),
    });

    const listChatMessageSourcesFn = new NodejsFunction(this, `listChatMessageSources-Lambda`, {
      handler: 'handler',
      runtime: NODE_RUNTIME,
      entry: require.resolve('./lambdas/chat/listChatMessageSources'),
    });

    const llmInventoryFn = new NodejsFunction(this, `llmInventory-Lambda`, {
      handler: 'handler',
      runtime: NODE_RUNTIME,
      entry: require.resolve('./lambdas/llm/inventory'),
      environment: {
        [FOUNDATION_MODEL_INVENTORY_SECRET]: foundationModels.inventorySecret.secretName,
      },
    });
    foundationModels.inventorySecret.grantRead(llmInventoryFn);

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

    const corpusApiIntegration = Integrations.lambda(corpus.corpusApiFn);

    // Create the API
    this.typesafeApi = new TypeSafeApi(this, 'Api', {
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
          integration: Integrations.lambda(this.engine.lambda),
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
        embeddingModelInventory: {
          integration: corpusApiIntegration,
        },
        ...props.apiIntegrations,
      },
    });

    const webSocketAuthFn = new NodejsFunction(this, `WsAuthorizer`, {
      handler: 'handler',
      runtime: NODE_RUNTIME,
      entry: require.resolve('./lambdas/websocket/authorizer'),
      environment: {
        USER_POOL_ID: identity.userPoolId,
        CLIENT_ID: identity.userPoolWebClientId,
      },
    });

    const connectFn = new $ConnectFunction(this, 'Connect', {
      environment: {
        DDB_TABLENAME: appData.wsConnections.tableName,
        USER_POOL_ID: identity.userPoolId,
        CLIENT_ID: identity.userPoolWebClientId,
      },
    });
    const disconnectFn = new $DisconnectFunction(this, 'Disconnect', {
      environment: {
        DDB_TABLENAME: appData.wsConnections.tableName,
        USER_POOL_ID: identity.userPoolId,
        CLIENT_ID: identity.userPoolWebClientId,
      },
    });

    [connectFn, disconnectFn].forEach((fn) => {
      appData.wsConnections.grantWriteData(fn);
    });

    this.wsApi = new WebSocketApi(this, 'WsApi', {
      authorizer: new WebSocketLambdaAuthorizer('Authorizer', webSocketAuthFn, {
        identitySource: ['route.request.querystring.authToken'],
      }),
      description: 'Galileo WS Api',
      connect: {
        integration: new WebSocketLambdaIntegration('ConnectI', connectFn),
      },
      disconnect: {
        integration: new WebSocketLambdaIntegration('DisconnectI', disconnectFn),
      },
      integrations: {
        sendChatMessage: {
          integration: new WebSocketLambdaIntegration('SendChatMessageI', this.engine.wsLambda),
        },
      },
    });

    Object.values(lambdas).forEach((lambda) => {
      // interceptor access (identity)
      lambda.addToRolePolicy(
        new PolicyStatement({
          sid: 'ApiInterceptors',
          effect: Effect.ALLOW,
          // TODO: the action and resources required should be handled by the api-typescript-interceptors package
          actions: [...INTERCEPTOR_IAM_ACTIONS],
          resources: [
            Stack.of(this).formatArn({
              resource: 'userpool',
              resourceName: identity.userPoolId,
              service: 'cognito-idp',
              arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            }),
          ],
        }),
      );
      // table
      lambda.addEnvironment('TABLE_NAME', appData.datastore.tableName);
      lambda.addEnvironment('GSI_INDEX_NAME', appData.gsiIndexName);
      appData.datastore.grantReadWriteData(lambda);
      NagSuppressions.addResourceSuppressions(
        this,
        [
          {
            id: 'AwsPrototyping-IAMNoManagedPolicies',
            reason: 'AWS lambda basic execution role is acceptable since it allows for logging',
          },
          {
            id: 'AwsPrototyping-IAMNoWildcardPermissions',
            reason: 'Actions are scoped. Resource is scoped to specific DDB resource, /index/* is required',
          },
        ],
        true,
      );
    });

    const policy = new Policy(this, 'ApiAuthenticatedRolePolicy', {
      roles: [identity.authenticatedUserRole],
      statements: [
        // Grant authenticated users in user pool "execute-api" permissions
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['execute-api:Invoke'],
          resources: [
            this.typesafeApi.api.arnForExecuteApi('*', '/*', '*'),
            this.wsApi.api.arnForExecuteApi('*', '/*', '*'),
          ],
        }),
      ],
    });
    // policy.attachToRole(props.authenticatedUserRole);
    // props.authenticatedUserRole.attachInlinePolicy(policy);

    NagSuppressions.addResourceSuppressions(
      policy,
      [
        {
          id: 'AwsPrototyping-IAMNoWildcardPermissions',
          reason: 'needed for greedy api resource paths',
        },
      ],
      true,
    );

    const createRuntimeConfig = <T extends Record<string, string>>(cfg: T): Record<string, Reference> => {
      // Each value needs to be wrapped with CfnJson to resolve tokens cross-stack, wrapping everything in CfnJson will not work.
      return Object.fromEntries(
        Object.entries(cfg).map(([key, value]) => {
          if (Token.isUnresolved(value)) {
            return [key, new CfnJson(this, `RuntimeConfig-${key}`, { value }).value];
          } else {
            return [key, value];
          }
        }),
      );
    };

    this.website = new StaticWebsite(this, 'StaticWebsite', {
      websiteContentPath: websiteProps.websiteContentPath,
      runtimeOptions: {
        // Must wrap in CfnJson to resolve the cross-stack tokens (export/import)
        jsonPayload: createRuntimeConfig({
          apiUrl: this.typesafeApi.api.urlForPath(),
          region: Stack.of(this).region,
          identityPoolId: identity.identityPoolId,
          inferenceBufferedFunctionUrl: this.engine.inferenceBufferedUrl,
          userPoolId: identity.userPoolId,
          userPoolWebClientId: identity.userPoolWebClientId,
          wsApiUrl: this.wsApi.defaultStage.url,
          ...props.runtimeConfigs,
        }),
      },
      distributionProps: {
        defaultBehavior: {
          origin: new StaticWebsiteOrigin(),
        },
        geoRestriction: this._resolveGeoRestriction(websiteProps.geoRestriction),
      },
    });

    if (websiteProps.geoRestriction == null) {
      PDKNag.addResourceSuppressionsByPathNoThrow(
        Stack.of(this.website),
        this.website.cloudFrontDistribution.node.defaultChild!.node.path,
        [
          {
            id: 'AwsPrototyping-CloudFrontDistributionGeoRestrictions',
            reason: 'geo restrictions not applicable to this use case',
          },
        ],
      );
    }
  }

  grantInvokeApi(grantable: IGrantable) {
    return grantable.grantPrincipal.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['execute-api:Invoke'],
        resources: [this.typesafeApi.api.arnForExecuteApi('*', '/*', '*')],
      }),
    );
  }

  /** @internal */
  _resolveGeoRestriction(value?: string | string[] | GeoRestriction): GeoRestriction | undefined {
    if (value == null || value instanceof GeoRestriction) {
      return value;
    }

    if (typeof value === 'string') {
      value = [value];
    }

    return GeoRestriction.allowlist(...value);
  }
}
