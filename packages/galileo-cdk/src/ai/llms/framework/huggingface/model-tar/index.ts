/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { CustomResource, Duration, Stack } from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as assets from 'aws-cdk-lib/aws-s3-assets';
import * as cr from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import shortHash = require('shorthash2'); // eslint-disable-line @typescript-eslint/no-require-imports
import { IsCompleteFunction } from './handler/isComplete-function';
import { OnEventFunction } from './handler/onEvent-function';
import { SourceAsset } from './source-asset';
import { ResourceProperties, Data, MODEL_TAR_FILE, ARTIFACT_NAME } from './types';
import { SecureBucket } from '../../../../../common';

export interface HFModelTarProps {
  readonly hfModelId: string | string[];
  readonly customAsset?: string | assets.Asset;
  readonly forceModelFolders?: boolean;
  readonly snapshotDownloadOptions?: Record<string, any>;
  readonly environment?: Record<string, string>;
}

export class HFModelTar extends Construct {
  public readonly modelDataUrl: string;

  protected readonly customResource: CustomResource;
  protected readonly provider: HFModelTarProvider;

  constructor(scope: Construct, id: string, props: HFModelTarProps) {
    super(scope, id);

    this.provider = HFModelTarProvider.of(this);

    let customAsset: assets.Asset | undefined = undefined;
    if (props.customAsset) {
      if (typeof props.customAsset === 'string') {
        customAsset = new assets.Asset(this, 'CustomAsset', {
          path: props.customAsset,
        });
      } else {
        customAsset = props.customAsset;
      }

      // Make sure the CodeBuild project can read the asset
      customAsset.bucket.grantRead(this.provider.buildRole);
    }

    let environment = props.environment;
    if (props.snapshotDownloadOptions) {
      environment = {
        ...environment,
        SNAPSHOT_DOWNLOAD_OPTIONS: JSON.stringify(props.snapshotDownloadOptions),
      };
    }

    if (props.forceModelFolders) {
      environment = {
        ...environment,
        FORCE_MODEL_FOLDERS: 'True',
      };
    }

    const hfModelId = Array.isArray(props.hfModelId) ? props.hfModelId.join(',') : props.hfModelId;

    const properties: ResourceProperties = {
      HFModelId: hfModelId,
      CustomAsset: customAsset && {
        bucketName: customAsset.s3BucketName,
        objectKey: customAsset.s3ObjectKey,
      },
      EnvironmentVariables: environment && Object.entries(environment).map(([name, value]) => ({ name, value })),
    };

    this.customResource = new CustomResource(this, 'Resource', {
      serviceToken: this.provider.serviceToken,
      resourceType: 'Custom::ModelTar',
      properties,
    });
    this.customResource.node.addDependency(this.provider);

    this.modelDataUrl = this.getData('ModelDataUrl');
  }

  getData(key: keyof Data): string {
    return this.customResource.getAttString(key);
  }

  grantRead(grantable: iam.IGrantable): iam.Grant {
    return this.provider.artifactBucket.grantRead(grantable);
  }
}

export interface HFModelTarProviderProps {}

export class HFModelTarProvider extends Construct {
  static readonly UUID = 'ModelTarProvider_V81eY6Q3Rf';

  static of(scope: IConstruct): HFModelTarProvider {
    const stack = Stack.of(scope);
    const existing = stack.node.tryFindChild(HFModelTarProvider.UUID);
    if (existing) {
      return existing as HFModelTarProvider;
    }

    return new HFModelTarProvider(stack, HFModelTarProvider.UUID, {});
  }

  readonly serviceToken: string;

  readonly buildRole: iam.Role;

  readonly artifactBucket: s3.Bucket;

  private constructor(scope: IConstruct, id: string, _props?: HFModelTarProviderProps) {
    super(scope, id);

    this.artifactBucket = new SecureBucket(this, 'ArtifactBucket');

    const ARTIFACT_BASE_DIR = 'out';

    const buildSpec = codebuild.BuildSpec.fromObject({
      version: '0.2',
      env: {
        variables: {
          ARTIFACT_BASE_DIR,
          HF_HUB_ENABLE_HF_TRANSFER: '1',
          HF_HUB_DISABLE_PROGRESS_BARS: '1',
          HF_HUB_DISABLE_TELEMETRY: '1',
          HF_HOME: '/root/.cache/huggingface',
          HUGGINGFACE_HUB_CACHE: '/root/.cache/huggingface/hub',
        },
      },
      phases: {
        install: {
          'runtime-versions': {
            python: '3.11',
          },
          commands: [
            'apt-get update',
            'apt-get install -y tar pigz awscli',
            'pip3 install --upgrade pip',
            'pip3 install poetry',
          ],
        },
        build: {
          commands: ['poetry update', 'poetry run python3 -u build.py'],
        },
      },
      artifacts: {
        files: [MODEL_TAR_FILE],
        'base-directory': ARTIFACT_BASE_DIR,
      },
      cache: {
        paths: [
          '/var/cache/apt/**/*',
          '/var/lib/apt/lists/**/*',
          '/root/.composer/**/*',
          '/root/.cache/pip/**/*',
          '/root/venv/**/*',
          '/root/.cache/huggingface/**/*',
        ],
      },
    });

    const sourceAsset = new SourceAsset(this, 'BuildSourceAsset');

    this.buildRole = new iam.Role(this, 'BuildRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      inlinePolicies: {
        CodeBuildPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });
    this.artifactBucket.grantReadWrite(this.buildRole);
    sourceAsset.bucket.grantRead(this.buildRole);

    NagSuppressions.addResourceSuppressions(
      this.buildRole,
      [
        {
          id: 'AwsPrototyping-IAMNoWildcardPermissions',
          reason: 'CodeBuild dynamic resources',
          appliesTo: ['Resource::*'],
        },
      ],
      true,
    );

    const buildProject = new codebuild.Project(this, 'CodeBuildProject', {
      // change description to with spec hash to force update of project
      description: `HuggingFace model.tar.gz builder - ${shortHash(JSON.stringify(buildSpec))}`,
      buildSpec,
      role: this.buildRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        // privileged: true, // Only need if performing docker builds
        computeType: codebuild.ComputeType.LARGE,
      },
      source: codebuild.Source.s3({
        bucket: sourceAsset.bucket,
        path: sourceAsset.s3ObjectKey,
      }),
      artifacts: codebuild.Artifacts.s3({
        bucket: this.artifactBucket,
        packageZip: false,
        encryption: false,
        includeBuildId: true,
        name: ARTIFACT_NAME,
      }),
    });

    NagSuppressions.addResourceSuppressions(
      buildProject,
      [
        {
          id: 'AwsPrototyping-CodeBuildProjectKMSEncryptedArtifacts',
          reason: 'CodeBuild Project builds publicly available data',
        },
        {
          id: 'AwsPrototyping-CodeBuildProjectPrivilegedModeDisabled',
          reason: 'Privileged mode required for docker image builds',
        },
      ],
      true,
    );

    const onEventHandler = new OnEventFunction(this, 'OnEventHandler', {
      architecture: lambda.Architecture.ARM_64,
      initialPolicy: [
        new iam.PolicyStatement({
          actions: ['codebuild:StartBuild'],
          resources: [buildProject.projectArn],
        }),
      ],
      environment: {
        BUILD_PROJECT: buildProject.projectName,
        ARTIFACT_BUCKET: this.artifactBucket.bucketName,
      },
    });

    const isCompleteHandler = new IsCompleteFunction(this, 'IsCompleteHandler', {
      architecture: lambda.Architecture.ARM_64,
      initialPolicy: [
        new iam.PolicyStatement({
          actions: ['codebuild:BatchGetBuilds'],
          resources: [buildProject.projectArn],
        }),
      ],
      environment: {
        BUILD_PROJECT: buildProject.projectName,
        ARTIFACT_BUCKET: this.artifactBucket.bucketName,
      },
    });

    const provider = new cr.Provider(this, 'Provider', {
      onEventHandler: onEventHandler,
      isCompleteHandler: isCompleteHandler,
      queryInterval: Duration.seconds(30),
      totalTimeout: Duration.hours(2),
    });
    provider.node.addDependency(buildProject);

    this.serviceToken = provider.serviceToken;

    NagSuppressions.addResourceSuppressions(
      [onEventHandler, isCompleteHandler, provider],
      [
        {
          id: 'AwsPrototyping-IAMNoManagedPolicies',
          reason: 'CDK CustomResource Provider resource used for deployment purposes',
        },
        {
          id: 'AwsPrototyping-IAMNoWildcardPermissions',
          reason: 'CDK CustomResource Provider resource used for deployment purposes',
        },
      ],
      true,
    );
  }
}
