/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CUSTOM_ASSET_PATH } from './custom-asset';
import { HuggingFaceModel } from '../../framework/huggingface/base';
import { ContainerImages } from '../../framework/huggingface/container-images';
import { HFModelTar } from '../../framework/huggingface/model-tar';
import { ImageRepositoryMapping } from '../../framework/sagemaker/image-repository-mapping';

export interface ManagedEmbeddingsMultiModelProps {
  /**
   * HuggingFace model id(s)
   * @example "sentence-transformer/all-mpnet-base-v2"
   * @example "sentence-transformer/all-mpnet-base-v2,intfloat/multilingual-e5-large"
   */
  readonly embeddingModelIds: string | string[];

  /**
   * Instance type for SageMaker Endpoint
   * @default 'ml.g4dn.xlarge'
   */
  readonly instanceType?: string;
}

export class ManagedEmbeddingsMultiModel extends HuggingFaceModel {
  constructor(scope: Construct, id: string, props: ManagedEmbeddingsMultiModelProps) {
    const { embeddingModelIds } = props;
    const region = Stack.of(scope).region;

    const modelTar = new HFModelTar(scope, `${id}-ModelTar`, {
      hfModelId: embeddingModelIds,
      customAsset: CUSTOM_ASSET_PATH,
      forceModelFolders: true,
    });

    const imageMapping = new ImageRepositoryMapping(scope, 'CustomScriptModelMapping', { region });

    super(scope, id, {
      ...props,
      modelId: id,
      modelDataUrl: modelTar.modelDataUrl,
      // TODO: need 2xlarge for pipeline bulk processing of 10K+ documents, can use smalling
      // if smaller corpus. Ideally when bulk processing starts, it would spool up an additional
      // instance to handle capacity, and shutdown after complete.
      instanceType: props.instanceType ?? 'ml.g4dn.xlarge',
      image: imageMapping.dkrImage(ContainerImages.HF_PYTORCH_INFERENCE_LATEST),
      environment: {
        // set env for the custom inference.py script to map models
        MANAGED_EMBEDDINGS_MODEL_IDS: Array.isArray(embeddingModelIds)
          ? embeddingModelIds.join(',')
          : embeddingModelIds,
      },
    });
  }
}
