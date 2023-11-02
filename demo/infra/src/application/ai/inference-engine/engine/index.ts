/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { isDevStage } from '@aws/galileo-cdk/lib/common';
import { INTERCEPTOR_IAM_ACTIONS } from 'api-typescript-interceptors';
import { CfnOutput, Duration, Size } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Alias, FunctionUrl, FunctionUrlAuthType, InvokeMode, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { ILambdaEnvironment } from './handler/env';

export interface InferenceEngineProps {
  readonly searchUrl: string;
  readonly foundationModelInventorySecret: ISecret;
  readonly foundationModelPolicyStatements: iam.PolicyStatement[];
  readonly foundationModelCrossAccountRoleArn?: string;
  readonly chatMessageTable: ITable;
  readonly chatMessageTableGsiIndexName: string;
  readonly chatDomain: string;
  readonly vpc: ec2.IVpc;
  readonly adminGroups?: string[];
  readonly userPool: UserPool;
  readonly userPoolClientId: string;
  readonly enableAutoScaling?: boolean;
}

export interface IInferenceEngine {
  readonly inferenceBufferedUrl: string;
  readonly inferenceBufferedArn: string;
}

export class InferenceEngine extends Construct implements IInferenceEngine {
  readonly lambda: NodejsFunction;
  readonly lambdaBufferedFunctionUrl: FunctionUrl;
  readonly role: iam.Role;
  // TODO: add support for streaming url once python is supported - https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html

  get inferenceBufferedUrl(): string {
    return this.lambdaBufferedFunctionUrl.url;
  }

  get inferenceBufferedArn(): string {
    return this.lambdaBufferedFunctionUrl.functionArn;
  }

  constructor(scope: Construct, id: string, props: InferenceEngineProps) {
    super(scope, id);

    this.role = new iam.Role(this, 'InferenceRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
      inlinePolicies: {
        Resources: new iam.PolicyDocument({
          statements: [
            ...props.foundationModelPolicyStatements,
            new iam.PolicyStatement({
              sid: 'ApiInterceptors',
              effect: iam.Effect.ALLOW,
              actions: [...INTERCEPTOR_IAM_ACTIONS],
              resources: [props.userPool.userPoolArn],
            }),
          ],
        }),
      },
    });

    NagSuppressions.addResourceSuppressions(
      this.role,
      [
        {
          id: 'AwsPrototyping-IAMNoManagedPolicies',
          reason: 'AWS lambda basic execution role is acceptable since it allows for logging',
        },
      ],
      true,
    );

    if (isDevStage(this)) {
      const crossAccountDevPolicy = new iam.Policy(this, 'FoundationModelCrossAccountPolicy', {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['sts:AssumeRole'],
            resources: ['*'],
          }),
        ],
      });
      // Grant the function access to assume roles for cross-account model development
      this.role.attachInlinePolicy(crossAccountDevPolicy);

      NagSuppressions.addResourceSuppressions(
        crossAccountDevPolicy,
        [
          {
            id: 'AwsPrototyping-IAMNoWildcardPermissions',
            reason: 'used for open-ended dev against dynamically created resources',
            appliesTo: ['Resource::*'],
          },
        ],
        true,
      );
    }

    props.foundationModelInventorySecret.grantRead(this.role);
    props.chatMessageTable.grantReadWriteData(this.role);
    NagSuppressions.addResourceSuppressions(
      this.role,
      [
        {
          id: 'AwsPrototyping-IAMNoWildcardPermissions',
          reason: 'Actions are scoped. Resource is scoped to specific DDB resource, /index/* is required',
        },
      ],
      true,
    );

    this.lambda = new NodejsFunction(this, 'InferenceLambda', {
      description: 'Chat agent handler ',
      timeout: Duration.minutes(5), // API gateway timeout for request?? TODO: if we use streaming?
      memorySize: 512, // TODO: [COST] right size (currently about Max Memory Used: 207 MB)
      ephemeralStorageSize: Size.gibibytes(1),
      tracing: Tracing.ACTIVE,
      handler: 'handler',
      entry: require.resolve('./handler/index'),
      // Must use NodeJs 18 to get @aws-sdk v3
      runtime: Runtime.NODEJS_18_X,
      reservedConcurrentExecutions: 50,
      // TODO: need to make sure this path works during compile
      environment: {
        USER_POOL_CLIENT_ID: props.userPoolClientId,
        USER_POOL_ID: props.userPool.userPoolId,
        SEARCH_URL: props.searchUrl,
        FOUNDATION_MODEL_INVENTORY_SECRET: props.foundationModelInventorySecret.secretName,
        FOUNDATION_MODEL_CROSS_ACCOUNT_ROLE_ARN: props.foundationModelCrossAccountRoleArn,
        CHAT_MESSAGE_TABLE_NAME: props.chatMessageTable.tableName,
        CHAT_MESSAGE_TABLE_GSI_INDEX_NAME: props.chatMessageTableGsiIndexName,
        ADMIN_GROUPS: JSON.stringify(props.adminGroups || []),
        DOMAIN: props.chatDomain,
      } as ILambdaEnvironment,
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      role: this.role,
    });

    let alias: Alias | undefined;
    if (props.enableAutoScaling) {
      // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda-readme.html#autoscaling
      const version = this.lambda.currentVersion;
      alias = new Alias(this, 'LambdaAlias', {
        aliasName: 'prod',
        version,
      });

      const scalingTarget = alias.addAutoScaling({
        minCapacity: 1,
        maxCapacity: 20,
      });
      scalingTarget.scaleOnUtilization({
        utilizationTarget: 0.75,
      });
    }

    this.lambdaBufferedFunctionUrl = new FunctionUrl(this, 'LambdaBufferedFunctionUrl', {
      authType: FunctionUrlAuthType.AWS_IAM,
      function: alias || this.lambda,
      cors: {
        allowedHeaders: ['*'],
        allowedOrigins: ['*'],
      },
      invokeMode: InvokeMode.BUFFERED,
    });

    new CfnOutput(this, 'BufferedFunctionUrl', {
      value: this.lambdaBufferedFunctionUrl.url,
    });
  }

  grantInvokeFunctionUrls(grantable: iam.IGrantable): void {
    this.lambdaBufferedFunctionUrl.grantInvokeUrl(grantable);
  }
}
