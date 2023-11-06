/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { ManagedEmbeddingsMultiModel } from '@aws/galileo-cdk/lib/ai/llms/models/managed-embeddings';
import { SecureBucket } from '@aws/galileo-cdk/lib/common';
import { RDSVectorStore } from '@aws/galileo-cdk/lib/data';
import { sortRagEmbeddingModels } from '@aws/galileo-cdk/src/core/app/context/utils';
import { IEmbeddingModelInfo } from '@aws/galileo-sdk/lib/models';
import { normalizePostgresTableName } from '@aws/galileo-sdk/lib/vectorstores/pgvector/utils';
import { INTERCEPTOR_IAM_ACTIONS } from 'api-typescript-interceptors';
import { OperationLookup } from 'api-typescript-runtime';
import { Duration, Size } from 'aws-cdk-lib';
import { EnableScalingProps } from 'aws-cdk-lib/aws-applicationautoscaling';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { IVpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import * as iam from 'aws-cdk-lib/aws-iam';
import {
  Alias,
  Architecture,
  DockerImageCode,
  DockerImageFunction,
  FunctionUrl,
  FunctionUrlAuthType,
  InvokeMode,
} from 'aws-cdk-lib/aws-lambda';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { IndexingPipeline, IndexingPipelineOptions } from './pipeline';
import { MonitoredNestedStack, MonitoredNestedStackProps } from '../monitoring';
import { GalileoComponentTags, tagAsComponent } from '../tags';

export interface CorpusProps extends MonitoredNestedStackProps {
  readonly vpc: IVpc;
  readonly dockerImagePath: string;
  readonly userPoolId: string;
  readonly userPoolClientId: string;
  readonly pipeline?: IndexingPipelineOptions;
  readonly autoScaling?: boolean;
  readonly embeddingInstanceType?: string;
  readonly embeddingModels: IEmbeddingModelInfo[];
  readonly embeddingModelAutoScaling?: EnableScalingProps;
  /**
   * Max requests per second (RPS) for embedding model autoscaling.
   * @default 10
   */
  readonly embeddingMaxRequestsPerSecond?: number;
}

export class CorpusStack extends MonitoredNestedStack {
  readonly vectorStore: RDSVectorStore;
  readonly processedDataBucket: IBucket;

  readonly pipeline: IndexingPipeline;

  readonly apiLambda: DockerImageFunction;

  readonly apiUrl: FunctionUrl;

  get similaritySearchUrl(): string {
    return this.apiUrl.url + OperationLookup.similaritySearch.path;
  }

  get pgvectorConnSecret(): ISecret {
    return this.vectorStore.connectionSecret;
  }

  get pipelineStateMachineArn(): string {
    return this.pipeline.stateMachine.stateMachineArn;
  }

  constructor(scope: Construct, id: string, props: CorpusProps) {
    super(scope, id, props);

    if (props.embeddingModels.length < 1) {
      throw new Error('Must define at least 1 embedding model in config');
    }

    // make the default the first model, if no default the first is considered default
    const sortedEmbeddingModels = sortRagEmbeddingModels(props.embeddingModels);
    const defaultEmbeddingModel = sortedEmbeddingModels[0];

    this.vectorStore = new RDSVectorStore(this, 'VectorStore', {
      vpc: props.vpc,
    });

    this.processedDataBucket = new SecureBucket(this, 'ProcessedDataBucket');
    tagAsComponent(GalileoComponentTags.CORPUS_INDEXING_BUCKET, this.processedDataBucket);

    const cacheTable = new Table(this, 'CacheTable', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    const embeddingsModel = new ManagedEmbeddingsMultiModel(this, 'ManagedEmbeddingsMultiModel', {
      instanceType: props.embeddingInstanceType,
      embeddingModelIds: sortedEmbeddingModels.map((v) => v.modelId),
    });
    props.embeddingModelAutoScaling &&
      embeddingsModel.autoScaleInstanceCount(props.embeddingModelAutoScaling).scaleOnInvocations('LimitRPS', {
        maxRequestsPerSecond: props.embeddingMaxRequestsPerSecond ?? 10,
      });

    // Environment vars for dockers (lambda + processing)
    const embeddingEnv: Record<string, string> = {
      EMBEDDINGS_SAGEMAKER_MODEL: defaultEmbeddingModel.modelId,
      EMBEDDINGS_SAGEMAKER_ENDPOINT: embeddingsModel.endpoint.attrEndpointName,
      VECTOR_SIZE: defaultEmbeddingModel.dimensions.toString(),
      // later list will be "workspace", but matching initial naming to prevent data loss
      EMBEDDING_TABLENAME: normalizePostgresTableName(
        `${defaultEmbeddingModel.uuid}_${defaultEmbeddingModel.dimensions}`,
      ),
    } as const;

    const dockerImageCode = DockerImageCode.fromImageAsset(props.dockerImagePath, {
      platform: Platform.LINUX_AMD64,
      cmd: ['lambda', 'api.handler'],
      // TODO: consider defining "embedding model" in context/props and passing to docker build here
    });

    this.apiLambda = new DockerImageFunction(this, 'ApiLambda', {
      description: 'Corpus api lambda',
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      code: dockerImageCode,
      architecture: Architecture.X86_64,
      timeout: Duration.minutes(15),
      memorySize: Size.gibibytes(2).toMebibytes(),
      ephemeralStorageSize: Size.gibibytes(1),
      environment: {
        // Available envs are defined in demo/corpus/logic/src/env.ts
        ...this.vectorStore.environment,
        ...embeddingEnv,
        USER_POOL_CLIENT_ID: props.userPoolClientId,
        USER_POOL_ID: props.userPoolId,
        TRANSFORMER_CACHE: '/tmp/.cache',
      },
      initialPolicy: [
        new iam.PolicyStatement({
          sid: 'ApiInterceptors',
          effect: iam.Effect.ALLOW,
          actions: [...INTERCEPTOR_IAM_ACTIONS],
          resources: ['*'],
        }),
      ],
    });
    embeddingsModel.grantInvoke(this.apiLambda);
    this.vectorStore.grantConnect(this.apiLambda);
    NagSuppressions.addResourceSuppressions(
      this.apiLambda,
      [
        {
          id: 'AwsPrototyping-IAMNoManagedPolicies',
          reason: 'AWS lambda managed execution policy is least privilege and permits logging',
        },
        {
          id: 'AwsPrototyping-IAMNoWildcardPermissions',
          reason: 'Needed for API interception',
        },
      ],
      true,
    );

    let alias: Alias | undefined;
    if (props.autoScaling) {
      // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda-readme.html#autoscaling
      const version = this.apiLambda.currentVersion;
      alias = new Alias(this, 'ApiLambdaAlias', {
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

    this.apiUrl = new FunctionUrl(this, 'ApiFunctionUrl', {
      authType: FunctionUrlAuthType.AWS_IAM,
      function: alias || this.apiLambda,
      cors: {
        allowedHeaders: ['*'],
        allowedOrigins: ['*'],
      },
      invokeMode: InvokeMode.BUFFERED,
    });

    this.pipeline = new IndexingPipeline(this, 'Pipeline', {
      dockerImagePath: props.dockerImagePath,
      cacheTable,
      vpc: props.vpc,
      inputBucket: this.processedDataBucket,
      vectorStore: this.vectorStore,
      additionalEnvironment: {
        ...props.pipeline?.additionalEnvironment,
        ...embeddingEnv,
        // HINT: to easily set chunk size/overlap and index list size, update these env
        // - later these will be configurable in "workspace"
        // CHUNK_SIZE: "1000",
        // CHUNK_OVERLAP: "200",
        // VECTOR_INDEX_LISTS: "1000",
      },
      ...props.pipeline,
    });

    embeddingsModel.grantInvoke(this.pipeline.processingJobRole);

    // add dependency from pipeline stateMachine to apiLambda to make sure image has been deployed
    this.pipeline.stateMachine.node.addDependency(this.apiLambda);
    tagAsComponent(GalileoComponentTags.CORPUS_INDEXING_STATEMACHINE, this.pipeline.stateMachine);

    NagSuppressions.addStackSuppressions(this, [
      {
        id: 'CdkNagValidationFailure',
        reason: 'Suppressing errors due to dynamic tasks',
      },
    ]);
  }
}
