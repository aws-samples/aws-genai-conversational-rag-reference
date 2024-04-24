/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { PGVectorStoreOptions, distanceStrategyFromValue } from '@aws/galileo-sdk/lib/vectorstores';

import { getPostgresTableName } from '@aws/galileo-sdk/lib/vectorstores/pgvector/utils';
import { corsInterceptor } from 'api-typescript-interceptors';
import {
  Document,
  EmbeddingModel,
  embedDocumentsHandler,
  embedQueryHandler,
  embeddingModelInventoryHandler,
  similaritySearchHandler,
} from 'api-typescript-runtime';
import { findEmbeddingModelByRefKey, getEmbeddingsByModelId } from '../embedding/util';
import { ENV } from '../env';
import { vectorStoreFactory } from '../vectorstore';

const interceptors = [corsInterceptor] as const;

export const similaritySearch = similaritySearchHandler(...interceptors, async ({ input }) => {
  const { query, k, filter, distanceStrategy, modelRefKey } = input.body;

  // NB: changing distanceStrategy should only be used for development since
  // unless the strategy is also indexes as performance will be slower.
  let vectorStoreConfig: Partial<PGVectorStoreOptions> | undefined;
  if (distanceStrategy) {
    vectorStoreConfig = {
      distanceStrategy: distanceStrategyFromValue(distanceStrategy),
    };
  }

  const embeddingModel = findEmbeddingModelByRefKey(modelRefKey);
  const vectorStore = await vectorStoreFactory({
    embeddingTableName: getPostgresTableName(embeddingModel),
    vectorSize: embeddingModel.dimensions,
    embeddings: getEmbeddingsByModelId(embeddingModel.modelId, {}),
    config: vectorStoreConfig,
  });

  if (query == null || query.length < 1) {
    throw new Error('InvalidPayload: query is required');
  }

  if (input.requestParameters.withScore) {
    const result = await vectorStore.similaritySearchWithScore(query, k, filter);
    const documents = result.map(
      ([{ pageContent, metadata }, score]): Document => ({
        pageContent,
        metadata,
        score,
      }),
    );

    return {
      statusCode: 200,
      body: {
        documents,
      },
    };
  } else {
    const documents = await vectorStore.similaritySearch(query, k, filter);

    return {
      statusCode: 200,
      body: {
        documents,
      },
    };
  }
});

export const embedDocuments = embedDocumentsHandler(...interceptors, async ({ input }) => {
  const { texts, modelRefKey } = input.body;

  const embeddingModel = findEmbeddingModelByRefKey(modelRefKey);

  const embeddings = await getEmbeddingsByModelId(embeddingModel.modelId).embedDocuments(texts);

  return {
    statusCode: 200,
    body: {
      embeddings,
      model: embeddingModel.modelId,
    },
  };
});

export const embedQuery = embedQueryHandler(...interceptors, async ({ input }) => {
  const { text, modelRefKey } = input.body;

  if (text == null || text.length < 1) {
    throw new Error('InvalidPayload: text is required');
  }

  const embeddingModel = findEmbeddingModelByRefKey(modelRefKey);

  const embedding = await getEmbeddingsByModelId(embeddingModel.modelId).embedQuery(text);

  return {
    statusCode: 200,
    body: {
      embedding,
      model: embeddingModel.modelId,
    },
  };
});

export const embeddingModelInventory = embeddingModelInventoryHandler(...interceptors, async () => {
  return {
    statusCode: 200,
    body: {
      models: ENV.EMBEDDINGS_SAGEMAKER_MODELS as EmbeddingModel[],
    },
  };
});
