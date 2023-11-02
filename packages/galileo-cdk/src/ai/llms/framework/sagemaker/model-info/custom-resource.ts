/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { CfnOutput, CustomResource, Duration, Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { CODE_ASSET_PATH } from './code-asset';

export class SageMakerModelInfoProvider extends Construct {
  static readonly UUID: string = 'SageMakerModelInfoProvider_13x9CRpooX';

  static of(scope: Construct): SageMakerModelInfoProvider {
    const stack = Stack.of(scope);
    const existing = stack.node.tryFindChild(SageMakerModelInfoProvider.UUID) as SageMakerModelInfoProvider | undefined;
    if (existing) {
      return existing;
    }
    return new SageMakerModelInfoProvider(stack);
  }

  readonly handler: IFunction;
  readonly provider: Provider;

  private constructor(scope: Construct) {
    super(scope, SageMakerModelInfoProvider.UUID);

    this.handler = new PythonFunction(this, 'Handler', {
      entry: CODE_ASSET_PATH,
      runtime: Runtime.PYTHON_3_11,
      timeout: Duration.minutes(5),
      initialPolicy: [
        new PolicyStatement({
          actions: ['sagemaker:Describe*', 'sagemaker:Get*', 'sagemaker:List*', 's3:Get*', 's3:List*', 'iam:PassRole'],
          resources: ['*'],
        }),
      ],
    });
    NagSuppressions.addResourceSuppressions(
      this.handler,
      [
        {
          id: 'AwsPrototyping-IAMNoWildcardPermissions',
          reason: 'Specific resources are unknown and actions scoped to read only',
          appliesTo: ['Resource::*'],
        },
      ],
      true,
    );

    this.provider = new Provider(this, 'Provider', {
      onEventHandler: this.handler,
    });
  }

  get serviceToken(): string {
    return this.provider.serviceToken;
  }
}

export interface SageMakerModelInfoOptions {
  // TODO: support other frameworks for better resolution support (HuggingFace, etc)
  readonly framework?: 'JumpStart';

  readonly instanceType?: string;
  /**
   * @default `Stack.region`
   */
  readonly modelRegion?: string;
  /**
   * @default "inference"
   */
  readonly scope?: string;
  /**
   * @default "*" - latest
   */
  readonly version?: string;

  /**
   * Only resolve the image uri, which will not resolve model and script uris.
   * - The unresolved fields in response will be `<unresolved>`
   */
  readonly imageUriOnly?: boolean;
}

export interface SageMakerModelInfoProps extends SageMakerModelInfoOptions {
  readonly modelId: string;
}

export class SageMakerModelInfo extends Construct {
  readonly customResource: CustomResource;

  readonly modelId: string;
  readonly version: string;
  readonly scope: string;
  readonly modelInstanceType: string;
  readonly modelRegion: string;

  readonly modelImageUri: string;
  readonly modelUri?: string;
  readonly modelScriptUri?: string;
  readonly modelPackageArn?: string;

  readonly modelBucketName?: string;
  readonly modeBucketKey?: string;

  readonly imageUriOnly: boolean;

  constructor(scope: Construct, id: string, props: SageMakerModelInfoProps) {
    super(scope, id);

    this.customResource = new CustomResource(this, 'CustomResource', {
      resourceType: 'Custom::SageMakerModelInfo',
      serviceToken: SageMakerModelInfoProvider.of(this).serviceToken,
      properties: {
        ModelId: props.modelId,
        Framework: props.framework,
        ModelInstanceType: props.instanceType,
        ModelRegion: props.modelRegion || Stack.of(this).region,
        Scope: props.scope,
        Version: props.version,
        ImageUriOnly: props.imageUriOnly ?? false,
      },
    });

    this.modelId = this.customResource.getAttString('ModelId');
    this.version = this.customResource.getAttString('Version');
    this.scope = this.customResource.getAttString('Scope');
    this.modelUri = this.customResource.getAttString('ModelUri');
    this.modelBucketName = this.customResource.getAttString('ModelBucketName');
    this.modeBucketKey = this.customResource.getAttString('ModeBucketKey');
    this.modelImageUri = this.customResource.getAttString('ModelImageUri');
    this.modelPackageArn = this.customResource.getAttString('ModelPackageArn');
    this.modelRegion = this.customResource.getAttString('ModelRegion');
    this.modelInstanceType = this.customResource.getAttString('ModelInstanceType');
    this.modelScriptUri = this.customResource.getAttString('ModelScriptUri');
    (this.imageUriOnly = props.imageUriOnly ?? false),
      new CfnOutput(this, 'ModelInfo', {
        value: this.toJson(),
      });
  }

  toJson(indent: number = 2): string {
    return JSON.stringify(
      {
        ModelId: this.modelId,
        Version: this.version,
        Scope: this.scope,
        ModelUri: this.modelUri,
        ModelBucketName: this.modelBucketName,
        ModeBucketKey: this.modeBucketKey,
        ModelImageUri: this.modelImageUri,
        ModelPackageArn: this.modelPackageArn,
        ModelRegion: this.modelRegion,
        ModelInstanceType: this.modelInstanceType,
        ModelScriptUri: this.modelScriptUri,
        ImageUriOnly: this.imageUriOnly,
      },
      null,
      indent,
    );
  }
}
