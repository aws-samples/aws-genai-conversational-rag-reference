/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as Models from '@aws/galileo-sdk/lib/models';
import { ScalableInstanceCount } from '@aws-cdk/aws-sagemaker-alpha';
import { Duration, Lazy, Stack, Tags } from 'aws-cdk-lib';
import * as appscaling from 'aws-cdk-lib/aws-applicationautoscaling';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { ServiceQuotas } from '../../../common';

export interface BaseLLMProps {
  /**
   * Model id within its respective framework (canonical id)
   * - JumpStart model id
   * - HuggingFace model repoId/tag
   * - etc.
   */
  readonly modelId: string;
  /**
   * UUID of the model within the application. If multiple variants of the same
   * modelId are deployed, this will be necessary to discern between them.
   * > This is the id used throughout galileo to identify the model
   * @default `modelId` - will default to the model id
   */
  readonly modelUUID?: string;
  /**
   * Display name for the model.
   */
  readonly displayName?: string;
  /** @see {@link Models.IModelConstraints} */
  readonly modelConstraints?: Models.IModelConstraints;
  /** Default model kwargs used to call the model */
  readonly modelKwargs?: Models.Kwargs;
  /** Default endpoint kwargs to call the endpoint */
  readonly endpointKwargs?: Models.Kwargs;
  readonly adapter?: Models.IModelAdapter;
  readonly instanceType?: string;
  readonly instanceCount?: number;
  readonly executionRole?: iam.Role;
  readonly modelDataDownloadTimeout?: Duration;
  readonly containerStartupHealthCheckTimeout?: Duration;
  readonly disableServiceQuota?: boolean;
  readonly vpc?: ec2.IVpc;
}

export abstract class BaseLLM extends Construct implements Models.IModelInfoProvider {
  static defaultExecutionRole(scope: Construct): iam.Role {
    const uuid = 'BaseLLM-DefaultExecutionRole';
    const stack = Stack.of(scope);
    const existing = stack.node.tryFindChild(uuid) as iam.Role | undefined;
    if (existing) {
      return existing;
    }

    const role = new iam.Role(stack, uuid, {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      inlinePolicies: {
        // https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-roles.html#sagemaker-roles-createmodel-perms
        CreateModel: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'sts:AssumeRole',
                'cloudwatch:PutMetricData',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:CreateLogGroup',
                'logs:DescribeLogStreams',
                's3:GetObject',
                's3:ListBucket',
                'ecr:GetAuthorizationToken',
                'ecr:BatchCheckLayerAvailability',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    NagSuppressions.addResourceSuppressions(
      [role],
      [
        {
          id: 'AwsPrototyping-IAMNoWildcardPermissions',
          reason: 'Exact resources not known until runtime',
          appliesTo: ['Resource::*'],
        },
      ],
      true,
    );

    return role;
  }

  readonly region: string;
  readonly role: iam.Role;
  readonly modelUUID: string;
  readonly modelInfo: Models.IModelInfo;

  readonly endpointConfig: sagemaker.CfnEndpointConfig;
  readonly endpoint: sagemaker.CfnEndpoint;

  readonly productionVariant: sagemaker.CfnEndpointConfig.ProductionVariantProperty;

  public scalableInstanceCount?: ScalableInstanceCount;

  abstract readonly model: sagemaker.CfnModel;

  constructor(scope: Construct, id: string, props: BaseLLMProps) {
    super(scope, id);

    if (props.instanceType == null) {
      throw new Error('LLM missing `instanceType` prop');
    }

    this.region = Stack.of(this).resolve(Stack.of(this).region);

    this.modelUUID = props.modelUUID || props.modelId;

    Tags.of(this).add('galileo::FoundationModel:modelUUID', this.modelUUID);

    this.role = props.executionRole || BaseLLM.defaultExecutionRole(this);

    const modelName = Lazy.string({
      produce: () => {
        return this.model.attrModelName;
      },
    });

    this.productionVariant = {
      modelName,
      instanceType: props.instanceType,
      variantName: 'AllTraffic',
      initialInstanceCount: props.instanceCount ?? 1,
      initialVariantWeight: 1,
      modelDataDownloadTimeoutInSeconds: (props.modelDataDownloadTimeout || Duration.minutes(60)).toSeconds(),
      containerStartupHealthCheckTimeoutInSeconds:
        props.containerStartupHealthCheckTimeout && props.containerStartupHealthCheckTimeout.toSeconds(),
    };

    this.endpointConfig = new sagemaker.CfnEndpointConfig(this, 'Config', {
      productionVariants: [this.productionVariant],
    });

    this.endpoint = new sagemaker.CfnEndpoint(this, 'Endpoint', {
      endpointConfigName: this.endpointConfig.attrEndpointConfigName,
    });

    if (props.disableServiceQuota !== true) {
      ServiceQuotas.addRequirement(this.endpoint, {
        serviceCode: 'sagemaker',
        quotaName: `${props.instanceType} for endpoint usage`,
        minimumValue: props.instanceCount ?? 1,
      });
    }

    this.modelInfo = {
      uuid: this.modelUUID,
      modelId: props.modelId,
      name: props.displayName,
      framework: {
        type: Models.ModelFramework.SAGEMAKER_ENDPOINT,
        endpointName: this.endpoint.attrEndpointName,
        endpointRegion: Stack.of(this).region,
        endpointKwargs: props.endpointKwargs,
        modelKwargs: props.modelKwargs,
      },
      constraints: props.modelConstraints,
      adapter: props.adapter,
    };
  }

  get variantName(): string {
    return this.productionVariant.variantName;
  }

  get initialInstanceCount(): number {
    return this.productionVariant.initialInstanceCount!;
  }

  get instanceType(): string {
    return this.productionVariant.instanceType!;
  }

  get endpointName(): string {
    return this.endpoint.attrEndpointName;
  }

  grantInvoke(grantable: iam.IGrantable): void {
    grantable.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sagemaker:InvokeEndpoint', 'sagemaker:DescribeEndpoint'],
        resources: [this.endpoint.ref],
      }),
    );
  }

  autoScaleInstanceCount(scalingProps: appscaling.EnableScalingProps): ScalableInstanceCount {
    const errors: string[] = [];
    if (scalingProps.minCapacity && scalingProps.minCapacity > this.initialInstanceCount) {
      errors.push(`minCapacity cannot be greater than initial instance count: ${this.initialInstanceCount}`);
    }
    if (scalingProps.maxCapacity && scalingProps.maxCapacity < this.initialInstanceCount) {
      errors.push(`maxCapacity cannot be less than initial instance count: ${this.initialInstanceCount}`);
    }
    if (BURSTABLE_INSTANCE_TYPE_PREFIXES.some((prefix) => this.instanceType.toString().startsWith(prefix))) {
      errors.push(`AutoScaling not supported for burstable instance types like ${this.instanceType}`);
    }
    if (this.scalableInstanceCount) {
      errors.push('AutoScaling of task count already enabled for this service');
    }

    if (errors.length > 0) {
      throw new Error(`Invalid Application Auto Scaling configuration: ${errors.join('\n')}`);
    }

    return (this.scalableInstanceCount = new ScalableInstanceCount(this, 'AutoScaling', {
      serviceNamespace: appscaling.ServiceNamespace.SAGEMAKER,
      resourceId: `endpoint/${this.endpointName}/variant/${this.productionVariant.variantName}`,
      dimension: 'sagemaker:variant:DesiredInstanceCount',
      role: this.makeScalingRole(),
      minCapacity: scalingProps.minCapacity || this.initialInstanceCount,
      maxCapacity: scalingProps.maxCapacity || this.initialInstanceCount,
    }));
  }

  /**
   * Return the service linked role which will automatically be created by Application Auto Scaling
   * for scaling purposes.
   *
   * @see https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-service-linked-roles.html
   */
  private makeScalingRole(): iam.IRole {
    // Use a Service Linked Role.
    return iam.Role.fromRoleArn(
      this.endpoint,
      'ScalingRole',
      Stack.of(this.endpoint).formatArn({
        service: 'iam',
        region: '',
        resource: 'role/aws-service-role/sagemaker.application-autoscaling.amazonaws.com',
        resourceName: 'AWSServiceRoleForApplicationAutoScaling_SageMakerEndpoint',
      }),
    );
  }
}

/*
 * Amazon SageMaker automatic scaling doesn't support automatic scaling for burstable instances such
 * as T2, because they already allow for increased capacity under increased workloads.
 * https://docs.aws.amazon.com/sagemaker/latest/dg/endpoint-auto-scaling-add-console.html
 */
const BURSTABLE_INSTANCE_TYPE_PREFIXES = Object.entries(ec2.InstanceClass)
  .filter(([name, _]) => name.startsWith('T'))
  .map(([_, prefix]) => `ml.${prefix}.`);
