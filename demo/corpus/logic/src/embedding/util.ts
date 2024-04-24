/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { IEmbeddingModelInfo } from '@aws/galileo-sdk/lib/models';
import { AsyncCallerParams } from 'langchain/dist/util/async_caller';
import { Embeddings } from 'langchain/embeddings/base';
import { SageMakerEndpointEmbeddings } from '.';
import { ENV } from '../env';

// A map to store the mappings between embedding model id and embeddings
const __EMBEDDINGS_CACHE__ = new Map<string, Embeddings>();

export function getEmbeddingsByModelId(embeddingModelId: string, params?: AsyncCallerParams): Embeddings {
  if (__EMBEDDINGS_CACHE__.has(embeddingModelId)) {
    return __EMBEDDINGS_CACHE__.get(embeddingModelId)!;
  } else {
    const embeddings = new SageMakerEndpointEmbeddings(params ?? {}, embeddingModelId);
    __EMBEDDINGS_CACHE__.set(embeddingModelId, embeddings);
    return embeddings;
  }
}

export function findEmbeddingModelByRefKey(modelRefKey?: string): IEmbeddingModelInfo {
  const embeddingModels = ENV.EMBEDDINGS_SAGEMAKER_MODELS;

  if (!modelRefKey) return embeddingModels[0];

  return embeddingModels.find((model: IEmbeddingModelInfo) => model.modelRefKey === modelRefKey) || embeddingModels[0];
}
