/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as sagemaker from "aws-cdk-lib/aws-sagemaker";
import { Construct } from "constructs";
import { BaseLLM, BaseLLMProps } from "../base";
import { SageMakerModelInfo } from "../sagemaker/model-info/custom-resource";

// consider just using sagemaker python SDK as custom resource
// https://huggingface.co/blog/gptj-sagemaker

export const DEFAULT_MODEL_ENVIRONMENT = {
  MODEL_CACHE_ROOT: "/opt/ml/model",
  SAGEMAKER_ENV: "1",
  SAGEMAKER_MODEL_SERVER_TIMEOUT: "3600",
  SAGEMAKER_MODEL_SERVER_WORKERS: "1",
  SAGEMAKER_PROGRAM: "inference.py",
  SAGEMAKER_SUBMIT_DIRECTORY: "/opt/ml/model/code/",
  TS_DEFAULT_WORKERS_PER_MODEL: "1",
};

export interface JumpStartModelProps extends BaseLLMProps {
  /**
   * Model version
   * @default "*" Latest
   */
  readonly modelVersion?: string;
  readonly environment?: Record<string, any>;
}

export class JumpStartModel extends BaseLLM {
  public readonly model: sagemaker.CfnModel;

  constructor(scope: Construct, id: string, props: JumpStartModelProps) {
    super(scope, id, props);

    const info = new SageMakerModelInfo(scope, "ModelInfo", {
      framework: "JumpStart",
      modelId: props.modelId,
      instanceType: props.instanceType,
      version: props.modelVersion,
    });

    this.model = new sagemaker.CfnModel(this, "Model", {
      executionRoleArn: this.role.roleArn,
      containers: [
        {
          image: info.modelImageUri,
          modelDataUrl: info.modelUri,
          modelPackageName: info.modelPackageArn,
          environment: props.environment ?? DEFAULT_MODEL_ENVIRONMENT,
        } as sagemaker.CfnModel.ContainerDefinitionProperty,
      ],
    });
  }
}
