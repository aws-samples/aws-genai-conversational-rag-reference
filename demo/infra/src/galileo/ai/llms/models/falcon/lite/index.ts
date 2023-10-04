/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import path from "node:path";
import {
  FALCON_ADAPTER,
  FALCON_MODEL_KWARGS,
} from "@aws/galileo-sdk/lib/models/llms/falcon";
import { DockerImageAsset, Platform } from "aws-cdk-lib/aws-ecr-assets";
import * as sagemaker from "aws-cdk-lib/aws-sagemaker";
import { Construct } from "constructs";
import { BaseLLM, BaseLLMProps } from "../../../framework/base";
import { HFModelTar } from "../../../framework/huggingface/model-tar";

export enum FalconLiteInstances {
  G5_12XLARGE = "ml.g5.12xlarge",
  G5_48XLARGE = "ml.g5.48xlarge",
  P4D_24XLARGE = "ml.p4d.24xlarge",
}

export interface FalconLiteProps extends Omit<BaseLLMProps, "modelId"> {}

export class FalconLite extends BaseLLM {
  static readonly HF_MODEL_ID = "amazon/FalconLite";
  static readonly MAX_TOTAL_TOKENS: number = 12001;

  public readonly model: sagemaker.CfnModel;

  constructor(scope: Construct, id: string, props: FalconLiteProps) {
    super(scope, id, {
      ...props,
      modelId: FalconLite.HF_MODEL_ID,
      modelConstraints: {
        maxInputLength: FalconLite.MAX_TOTAL_TOKENS - 1,
        maxTotalTokens: FalconLite.MAX_TOTAL_TOKENS,
      },
      adapter: FALCON_ADAPTER,
      // default model args
      modelKwargs: {
        ...FALCON_MODEL_KWARGS,
      },
    });

    const modelTar = new HFModelTar(this, "ModelTar", {
      hfRepoId: FalconLite.HF_MODEL_ID,
      snapshotDownloadOptions: {
        revision: "main",
        // load safetensor weights only
        ignore_patterns: ["*.msgpack*", "*.h5*", "*.bin*"],
      },
    });
    modelTar.grantRead(this.role);

    // https://github.com/awslabs/extending-the-context-length-of-open-source-llms/tree/main/custom-tgi-ecr
    const modelImage = new DockerImageAsset(this, "ModelImage", {
      directory: path.join(__dirname, "image"),
      platform: Platform.LINUX_AMD64,
    });

    this.model = new sagemaker.CfnModel(this, "Model", {
      executionRoleArn: this.role.roleArn,
      enableNetworkIsolation: true,
      primaryContainer: {
        image: modelImage.imageUri,
        modelDataUrl: modelTar.modelDataUrl,
        // https://github.com/awslabs/extending-the-context-length-of-open-source-llms/blob/main/custom-tgi-ecr/deploy.ipynb
        environment: {
          HF_MODEL_ID: "/opt/ml/model",
          SM_NUM_GPUS: String(4),
          MAX_INPUT_LENGTH: String(FalconLite.MAX_TOTAL_TOKENS - 1),
          MAX_TOTAL_TOKENS: String(FalconLite.MAX_TOTAL_TOKENS),
          HF_MODEL_QUANTIZE: "gptq",
          TRUST_REMOTE_CODE: String(true),
          MAX_BATCH_PREFILL_TOKENS: String(FalconLite.MAX_TOTAL_TOKENS),
          MAX_BATCH_TOTAL_TOKENS: String(FalconLite.MAX_TOTAL_TOKENS),
          GPTQ_BITS: String(4),
          GPTQ_GROUPSIZE: String(128),
          DNTK_ALPHA_SCALER: String(0.25),
        },
      },
    });
  }
}
