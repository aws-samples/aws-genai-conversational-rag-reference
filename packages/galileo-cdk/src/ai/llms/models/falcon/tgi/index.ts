/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { FALCON_ADAPTER, FALCON_MODEL_KWARGS } from '@aws/galileo-sdk/lib/models/llms/openassistant';
import { Construct } from 'constructs';
import { BaseLLMProps } from '../../../framework/base';
import { HuggingFaceModel } from '../../../framework/huggingface/base';

// https://github.com/aws/amazon-sagemaker-examples/blob/main/introduction_to_amazon_algorithms/jumpstart-foundation-models/text-generation-falcon.ipynb
// no public information about suitable values for MAX_INPUT_LENGTH and MAX_TOTAL_TOKENS on the size of memory
// instance type,    SM_NUM_GPUS,  MAX_INPUT_LENGTH, MAX_TOTAL_TOKENS
// ml.g5.12xlarge,   4,            1024,             2048
// ml.g5.48xlarge,   8,            1024,             2048
// ml.p4d.24xlarge,  8,            1024,             2048
export enum HuggingFaceFalconInstances {
  G5_16XLARGE = 'ml.g5.16xlarge',
  G5_12XLARGE = 'ml.g5.12xlarge',
  G5_48XLARGE = 'ml.g5.48xlarge',
  P4D_24XLARGE = 'ml.p4d.24xlarge',
}

export interface HuggingFaceFalconProps extends BaseLLMProps {
  /**
   * Indicates if model quantize ("bitsandbytes") is enabled, which halves the memory usages from 16 to 8.
   * This is beneficial to still get large context size on the small model, but may degrade the model performance.
   *
   * @default "true for SMALL instance, otherwise false"
   */
  readonly quantize?: boolean;

  // /**
  //  * HuggingFace model id to deploy
  //  * @example "OpenAssistant/falcon-40b-sft-top1-560"
  //  * @example "OpenAssistant/falcon-7b-sft-mix-2000"
  //  */
  // readonly hgModelId: string;

  /**
   * Max input length
   * @default 2047
   */
  readonly maxInputLength?: number;
  /**
   * Max total tokens
   * @default 2048
   */
  readonly maxTotalTokens?: number;

  /**
   * Number of GPUs
   * @default - Based on instance type
   */
  readonly numGpus?: number;
}

export class HuggingFaceFalcon extends HuggingFaceModel {
  static numGpuFromInstanceType(instanceType?: HuggingFaceFalconInstances | string): number {
    switch (instanceType) {
      case HuggingFaceFalconInstances.G5_16XLARGE:
        return 1;
      case HuggingFaceFalconInstances.G5_12XLARGE:
        return 4;
      case HuggingFaceFalconInstances.G5_48XLARGE:
      case HuggingFaceFalconInstances.P4D_24XLARGE:
        return 8;
      default:
        return 1;
    }
  }

  constructor(scope: Construct, id: string, props: HuggingFaceFalconProps) {
    const { modelId, maxInputLength = 2047, maxTotalTokens = 2048, numGpus } = props;

    if (maxInputLength >= maxTotalTokens) {
      throw new Error(
        `InvalidArgs: maxInputLength must be < maxTotalTokens; found ${maxInputLength} >= ${maxTotalTokens}`,
      );
    }

    super(scope, id, {
      ...props,
      modelId,
      modelConstraints: {
        maxTotalTokens,
        maxInputLength,
      },
      adapter: FALCON_ADAPTER,
      // default model kwargs
      modelKwargs: {
        ...FALCON_MODEL_KWARGS,
      },
      image: {
        repoId: 'huggingface-pytorch-tgi-inference',
        tag: '2.0.0-tgi0.8.2-gpu-py39-cu118-ubuntu20.04',
      },
      environment: {
        HF_MODEL_ID: modelId,
        SM_NUM_GPUS: String(numGpus || HuggingFaceFalcon.numGpuFromInstanceType(props.instanceType)),
        MAX_INPUT_LENGTH: String(maxInputLength),
        MAX_TOTAL_TOKENS: String(maxTotalTokens),
        ...(props.quantize
          ? {
              HF_MODEL_QUANTIZE: 'bitsandbytes',
            }
          : {}),
      },
    });
  }
}
