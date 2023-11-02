/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { CUSTOM_ASSET_PATH } from './custom-asset';
import { BaseLLMProps } from '../../framework/base';
import { HuggingFaceModel } from '../../framework/huggingface/base';
import { HFModelTar } from '../../framework/huggingface/model-tar';

export interface HuggingFaceSentenceTransformerProps extends Omit<BaseLLMProps, 'modelId'> {
  readonly modelTarBucket: Bucket;
  readonly modelTarBucketKeyPrefix?: string;
  /**
   * HuggingFace sentence-transformer model id
   * @example "all-mpnet-base-v2"
   */
  readonly hfModelId: string;
}

export class HuggingFaceSentenceTransformer extends HuggingFaceModel {
  constructor(scope: Construct, id: string, props: HuggingFaceSentenceTransformerProps) {
    const { hfModelId } = props;

    let hfRepoId = hfModelId;
    if (!hfRepoId.includes('/')) {
      hfRepoId = `sentence-transformer/${hfRepoId}`;
    }

    const modelTar = new HFModelTar(scope, `${id}-ModelTar`, {
      hfRepoId,
      customAsset: CUSTOM_ASSET_PATH,
    });

    super(scope, id, {
      ...props,
      modelId: hfRepoId,
      modelDataUrl: modelTar.modelDataUrl,
      image: {
        repoId: 'huggingface-pytorch-inference',
        tag: '1.9-transformers4.12-gpu-py38-cu111-ubuntu20.04',
      },
    });
  }
}
