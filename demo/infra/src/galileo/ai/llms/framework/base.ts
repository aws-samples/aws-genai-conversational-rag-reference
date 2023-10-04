/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as Models from "@aws/galileo-sdk/lib/models";
import { Duration, Lazy, Stack, Tags } from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sagemaker from "aws-cdk-lib/aws-sagemaker";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { ServiceQuotas } from "../../../core/service-quota";

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
  readonly instanceType: string;
  readonly instanceCount?: number;
  readonly executionRole?: iam.Role;
  readonly modelDataDownloadTimeout?: Duration;
  readonly containerStartupHealthCheckTimeout?: Duration;
  readonly disableServiceQuota?: boolean;
  readonly vpc?: IVpc;
}

export abstract class BaseLLM
  extends Construct
  implements Models.IModelInfoProvider
{
  static defaultExecutionRole(scope: Construct): iam.Role {
    const uuid = "BaseLLM-DefaultExecutionRole";
    const stack = Stack.of(scope);
    const existing = stack.node.tryFindChild(uuid) as iam.Role | undefined;
    if (existing) {
      return existing;
    }

    const role = new iam.Role(stack, uuid, {
      assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
      inlinePolicies: {
        // https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-roles.html#sagemaker-roles-createmodel-perms
        CreateModel: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                "sts:AssumeRole",
                "cloudwatch:PutMetricData",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:CreateLogGroup",
                "logs:DescribeLogStreams",
                "s3:GetObject",
                "s3:ListBucket",
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
              ],
              resources: ["*"],
            }),
          ],
        }),
      },
    });

    NagSuppressions.addResourceSuppressions(
      [role],
      [
        {
          id: "AwsPrototyping-IAMNoWildcardPermissions",
          reason: "Exact resources not known until runtime",
          appliesTo: ["Resource::*"],
        },
      ],
      true
    );

    return role;
  }

  readonly region: string;
  readonly role: iam.Role;
  readonly modelUUID: string;
  readonly modelInfo: Models.IModelInfo;

  readonly endpointConfig: sagemaker.CfnEndpointConfig;
  readonly endpoint: sagemaker.CfnEndpoint;

  abstract readonly model: sagemaker.CfnModel;

  constructor(scope: Construct, id: string, props: BaseLLMProps) {
    super(scope, id);

    this.region = Stack.of(this).resolve(Stack.of(this).region);

    this.modelUUID = props.modelUUID || props.modelId;

    Tags.of(this).add("galileo::FoundationModel:modelUUID", this.modelUUID);

    this.role = props.executionRole || BaseLLM.defaultExecutionRole(this);

    const modelName = Lazy.string({
      produce: () => {
        return this.model.attrModelName;
      },
    });

    this.endpointConfig = new sagemaker.CfnEndpointConfig(this, "Config", {
      productionVariants: [
        {
          modelName,
          instanceType: props.instanceType,
          variantName: "AllTraffic",
          initialInstanceCount: props.instanceCount ?? 1,
          initialVariantWeight: 1,
          modelDataDownloadTimeoutInSeconds: (
            props.modelDataDownloadTimeout || Duration.minutes(60)
          ).toSeconds(),
          containerStartupHealthCheckTimeout:
            props.containerStartupHealthCheckTimeout &&
            props.containerStartupHealthCheckTimeout.toSeconds(),
        } as sagemaker.CfnEndpointConfig.ProductionVariantProperty,
      ],
    });

    this.endpoint = new sagemaker.CfnEndpoint(this, "Endpoint", {
      endpointConfigName: this.endpointConfig.attrEndpointConfigName,
    });

    if (props.disableServiceQuota !== true) {
      ServiceQuotas.addRequirement(this.endpoint, {
        serviceCode: "sagemaker",
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
}
