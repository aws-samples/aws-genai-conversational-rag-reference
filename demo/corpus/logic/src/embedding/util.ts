/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { IEmbeddingModelInfo } from '@aws/galileo-sdk/lib/models';
import { AsyncCallerParams } from 'langchain/dist/util/async_caller';
import { Embeddings } from 'langchain/embeddings/base';
import { SageMakerEndpointEmbeddings } from '.';
import { ENV } from '../env';

// A map to store the mappings between embedding model id and embeddings
const __EMBEDDINGS_CACHE__ = new Map<string, Embeddings>();

/**
 * Retrieves the SageMakerEndpointEmbeddings instance associated with the provided embedding model ID.
 * @param {string} embeddingModelId - The unique identifier of the embedding model.
 * @param {AsyncCallerParams} params - The parameters required for the asynchronous caller.
 * @returns {SageMakerEndpointEmbeddings} The SageMakerEndpointEmbeddings instance corresponding to the provided embedding model ID.
 */
export function getEmbeddingsByModelId(embeddingModelId: string, params?: AsyncCallerParams): Embeddings {
  if (__EMBEDDINGS_CACHE__.has(embeddingModelId)) {
    return __EMBEDDINGS_CACHE__.get(embeddingModelId)!;
  } else {
    const embeddings = new SageMakerEndpointEmbeddings(params ?? {}, embeddingModelId);
    __EMBEDDINGS_CACHE__.set(embeddingModelId, embeddings);
    return embeddings;
  }
}

/**
 * Retrieves the embedding model associated with the provided reference key.
 * @param {string} modelRefKey - The reference key used to identify the embedding model.
 * @returns {Object|null} The embedding model object if found, or null if not found.
 *                        Default model is returned when no model reference key is provided
 */
export function findEmbeddingModelByRefKey(modelRefKey?: string): IEmbeddingModelInfo | null {
  const embeddingModels = ENV.EMBEDDINGS_SAGEMAKER_MODELS;

  // Return the default model if no modelRefKey is provided. Default model is always placed at the first element in the list
  if (!modelRefKey) return embeddingModels[0];

  return embeddingModels.find((model: IEmbeddingModelInfo) => model.modelRefKey === modelRefKey) || null;
}
