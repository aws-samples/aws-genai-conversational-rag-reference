/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Stack } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sagemaker from "aws-cdk-lib/aws-sagemaker";
import { Construct } from "constructs";
import { BaseLLM, BaseLLMProps } from "../../framework/base";

/**
 * @see https://docs.ai21.com/docs/choosing-the-right-instance-type-for-amazon-sagemaker-models#jurassic-2-ultra-formerly-jumbo-instruct
 */
export enum AI21Jurassic2UltraInstanceType {
  MAX_CONTEXT_2048 = "ml.g5.12xlarge",
  MAX_CONTEXT_4096 = "ml.g5.48xlarge",
  MAX_CONTEXT_8191 = "ml.p4d.24xlarge",
}

export interface AI21Jurassic2UltraProps
  extends Omit<BaseLLMProps, "modelId" | "instanceType"> {
  readonly modelUUID: string;
  readonly instanceType: AI21Jurassic2UltraInstanceType;
  readonly instanceCount?: number;
  readonly executionRole?: iam.Role;
}

export class AI21Jurassic2Ultra extends BaseLLM {
  public readonly model: sagemaker.CfnModel;

  constructor(scope: Construct, id: string, props: AI21Jurassic2UltraProps) {
    super(scope, id, {
      ...props,
      modelId: "a121/jurassic-utra",
      instanceType: props.instanceType,
    });

    const region = Stack.of(this).region;

    if (!(region in AI21Jurassic2UltraModelPackageMap)) {
      throw new Error(
        `${
          this.constructor.name
        } does not support region ${region}: [${Object.keys(
          AI21Jurassic2UltraModelPackageMap
        ).join(",")}]`
      );
    }
    const modePackageArn =
      AI21Jurassic2UltraModelPackageMap[
        region as keyof typeof AI21Jurassic2UltraModelPackageMap
      ];

    this.model = new sagemaker.CfnModel(this, "Model", {
      executionRoleArn: this.role.roleArn,
      enableNetworkIsolation: true,
      // TODO: add VPC
      containers: [
        {
          modelPackageName: modePackageArn,
        } as sagemaker.CfnModel.ContainerDefinitionProperty,
      ],
    });
  }
}

export const AI21Jurassic2UltraModelPackageMap = {
  "us-east-1":
    "arn:aws:sagemaker:us-east-1:865070037744:model-package/j2-ultra-v1-1-053-65756ea489973147b387b960b7f5b02d",
  "us-east-2":
    "arn:aws:sagemaker:us-east-2:057799348421:model-package/j2-ultra-v1-1-053-65756ea489973147b387b960b7f5b02d",
  "us-west-1":
    "arn:aws:sagemaker:us-west-1:382657785993:model-package/j2-ultra-v1-1-053-65756ea489973147b387b960b7f5b02d",
  "us-west-2":
    "arn:aws:sagemaker:us-west-2:594846645681:model-package/j2-ultra-v1-1-053-65756ea489973147b387b960b7f5b02d",
  "ca-central-1":
    "arn:aws:sagemaker:ca-central-1:470592106596:model-package/j2-ultra-v1-1-053-65756ea489973147b387b960b7f5b02d",
  "eu-central-1":
    "arn:aws:sagemaker:eu-central-1:446921602837:model-package/j2-ultra-v1-1-053-65756ea489973147b387b960b7f5b02d",
  "eu-west-1":
    "arn:aws:sagemaker:eu-west-1:985815980388:model-package/j2-ultra-v1-1-053-65756ea489973147b387b960b7f5b02d",
  "eu-west-2":
    "arn:aws:sagemaker:eu-west-2:856760150666:model-package/j2-ultra-v1-1-053-65756ea489973147b387b960b7f5b02d",
  "eu-west-3":
    "arn:aws:sagemaker:eu-west-3:843114510376:model-package/j2-ultra-v1-1-053-65756ea489973147b387b960b7f5b02d",
  "eu-north-1":
    "arn:aws:sagemaker:eu-north-1:136758871317:model-package/j2-ultra-v1-1-053-65756ea489973147b387b960b7f5b02d",
  "ap-southeast-1":
    "arn:aws:sagemaker:ap-southeast-1:192199979996:model-package/j2-ultra-v1-1-053-65756ea489973147b387b960b7f5b02d",
  "ap-southeast-2":
    "arn:aws:sagemaker:ap-southeast-2:666831318237:model-package/j2-ultra-v1-1-053-65756ea489973147b387b960b7f5b02d",
  "ap-northeast-2":
    "arn:aws:sagemaker:ap-northeast-2:745090734665:model-package/j2-ultra-v1-1-053-65756ea489973147b387b960b7f5b02d",
  "ap-northeast-1":
    "arn:aws:sagemaker:ap-northeast-1:977537786026:model-package/j2-ultra-v1-1-053-65756ea489973147b387b960b7f5b02d",
  "ap-south-1":
    "arn:aws:sagemaker:ap-south-1:077584701553:model-package/j2-ultra-v1-1-053-65756ea489973147b387b960b7f5b02d",
  "sa-east-1":
    "arn:aws:sagemaker:sa-east-1:270155090741:model-package/j2-ultra-v1-1-053-65756ea489973147b387b960b7f5b02d",
} as const;
