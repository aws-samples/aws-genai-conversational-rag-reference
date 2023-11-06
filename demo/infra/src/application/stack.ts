/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { FoundationModelIds } from '@aws/galileo-cdk/lib/ai/predefined';
import { ServiceQuotas, isDevStage } from '@aws/galileo-cdk/lib/common';
import { IApplicationContext } from '@aws/galileo-cdk/lib/core/app';
import { ApplicationConfig } from '@aws/galileo-cdk/lib/core/app/context/types';
import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { FoundationModelStack } from './ai/foundation-models';
import { InferenceEngineStack } from './ai/inference-engine';
import { CorpusStack } from './corpus';
import { AppDataLayer } from './data';
import { IdentityLayer } from './identity';
import { NetworkingStack } from './networking/stack';
import { PresentationStack } from './presentation';
import { Tooling } from './tooling';

export interface ApplicationProps extends StackProps, IApplicationContext {
  readonly supportCrossAccountModelAccess?: boolean;
  readonly config: ApplicationConfig;
}

export class Application extends Stack {
  readonly corpusProcessedBucketArn: string;

  readonly corpusEtlStateMachineArn: string;

  constructor(scope: Construct, id: string, props: ApplicationProps) {
    super(scope, id);

    const {
      supportCrossAccountModelAccess,
      corpusDockerImagePath,
      websiteContentPath,
      foundationModelCrossAccountRoleArn,
      config,
    } = props;

    // Deploy will fail if ServiceQuotas are not met based on underlying infra requirements
    // To only report requirements in logs, change to `true` for reporting only.
    ServiceQuotas.of(this).reportOnly(false);

    const { vpc } = new NetworkingStack(this, 'Networking');

    const identity = new IdentityLayer(this, 'IdentityLayer', {
      adminUser: config.identity.admin && {
        email: config.identity.admin?.email,
        username: config.identity.admin.username,
      },
    });

    const foundationModelStack = new FoundationModelStack(this, 'FoundationModelStack', {
      env: {
        // [Optional] cross-region model deployment to support capacity/availability constraints on a given region
        // If undefined, will default to application region
        region: config.llms.region,
      },
      // If in same region as application, it will reuse the vpc; otherwise will create its own
      applicationVpc: vpc,
      enableCrossAccountRole: supportCrossAccountModelAccess,
      config,
    });

    const foundationModelInventorySecret = foundationModelStack.proxyInventorySecret(this);

    const appData = new AppDataLayer(this, 'AppData');

    const corpus = new CorpusStack(this, 'Corpus', {
      vpc,
      dockerImagePath: corpusDockerImagePath,
      userPoolClientId: identity.userPoolWebClientId,
      userPoolId: identity.userPoolId,
      pipeline: {
        // Enable this to setup scheduling rule to automatically run the pipeline based on duration
        scheduled: false,
        scheduleDuration: Duration.hours(1),
        ...config.rag.indexing?.pipeline,
      },
      autoScaling: true,
      embeddingInstanceType: config.rag.managedEmbeddings.instanceType,
      embeddingModels: config.rag.managedEmbeddings.embeddingsModels!,
      embeddingModelAutoScaling: config.rag.managedEmbeddings.autoscaling,
    });
    this.corpusEtlStateMachineArn = corpus.pipelineStateMachineArn;
    this.corpusProcessedBucketArn = corpus.processedDataBucket.bucketArn;

    const inferenceEngineStack = new InferenceEngineStack(this, 'InferenceEngine', {
      vpc,
      chatMessageTable: appData.datastore,
      chatMessageTableGsiIndexName: appData.gsiIndexName,
      chatDomain: config.chat.domain,
      searchUrl: corpus.similaritySearchUrl,
      foundationModelInventorySecret: foundationModelInventorySecret,
      foundationModelPolicyStatements: foundationModelStack.invokeModelsPolicyStatements,
      // Arn is from other account provided in context, not local deployment
      // Useful for developer account access to deployed models in their developer accounts without deploying models
      // Only available in Dev stage and is optional
      foundationModelCrossAccountRoleArn,
      adminGroups: [identity.adminGroupName],
      userPoolClientId: identity.userPoolWebClientId,
      userPool: identity.userPool,
      enableAutoScaling: true,
    });
    const inferenceEngine = inferenceEngineStack.engine;

    // Allow inference engine to invoke search url
    corpus.apiUrl.grantInvokeUrl(inferenceEngine.lambda);
    // Allow authenticated users to invoked the inference lambda function url
    inferenceEngine.grantInvokeFunctionUrls(identity.authenticatedUserRole);

    const presentation = new PresentationStack(this, 'Presentation', {
      vpc,
      // app data
      datastore: appData.datastore,
      datastoreIndex: appData.gsiIndexName,
      // identity
      authenticatedUserRole: identity.authenticatedUserRole,
      identityPoolId: identity.identityPoolId,
      userPoolWebClientId: identity.userPoolWebClientId,
      userPoolId: identity.userPoolId,
      // website
      geoRestriction: config.website?.geoRestriction,
      websiteContentPath,
      // lambdas
      createChatMessageFn: inferenceEngine.lambda,
      corpusApiFn: corpus.apiLambda,
      // runtime config
      runtimeConfigs: {
        // Indicate in the UI if potential data sovereignty risk caused from cross-region inference
        dataSovereigntyRisk: foundationModelStack.isCrossRegion,
        inferenceBufferedFunctionUrl: inferenceEngine.inferenceBufferedUrl,
      },
      foundationModelInventorySecret,
    });

    // Only add tooling for development stage
    if ((config.tooling?.pgadmin || config.tooling?.sagemakerStudio) && isDevStage(this)) {
      const tooling = new Tooling(this, 'Tooling', {
        vpc,
        sagemakerStudio: config.tooling.sagemakerStudio
          ? {
              domainName: config.app.name,
            }
          : undefined,
        pgAdmin:
          config.tooling.pgadmin && config.identity.admin?.email
            ? {
                pgSecurityGroup: corpus.vectorStore.securityGroup,
                adminEmail: config.identity.admin.email,
              }
            : undefined,
      });

      const studioUserRole = tooling.studioUserRole;
      if (studioUserRole != null) {
        // Grant the studio user access to application resources for development
        inferenceEngine.grantInvokeFunctionUrls(studioUserRole);
        corpus.pgvectorConnSecret.grantRead(studioUserRole);
        corpus.apiUrl.grantInvokeUrl(studioUserRole);
        corpus.processedDataBucket.grantReadWrite(studioUserRole);
        corpus.pipeline.stateMachine.grantRead(studioUserRole);
        corpus.pipeline.stateMachine.grantStartExecution(studioUserRole);
        appData.datastore.grantReadWriteData(studioUserRole);
        foundationModelInventorySecret.grantRead(studioUserRole);
        foundationModelStack.crossAccountRoleArn && foundationModelStack.grantAssumeCrossAccountRole(studioUserRole);
        presentation.grantInvokeApi(studioUserRole);
      }
    }

    new CfnOutput(this, 'ApiEndpoint', {
      value: presentation.apiEndpoint,
      description: 'The URL for the API HTTP endpoint',
    });
    new CfnOutput(this, 'WebsiteUrl', {
      value: presentation.websiteUrl,
      description: 'The URL for the website HTTP distribution endpoint',
    });

    new CfnOutput(this, 'CorpusPipelineStateMachineConsoleLink', {
      description: 'Console url for the StateMachine to execute indexing of corpus data',
      value: `https://${this.region}.console.aws.amazon.com/states/home?region=${this.region}#/statemachines/view/${corpus.pipelineStateMachineArn}`,
    });

    new CfnOutput(this, 'CorpusPipelineStateMachineArn', {
      description: 'StateMachine ARN to execute indexing of corpus data',
      value: corpus.pipelineStateMachineArn,
    });
  }
}
