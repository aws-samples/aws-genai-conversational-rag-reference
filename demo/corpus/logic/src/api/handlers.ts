/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { PGVectorStoreOptions, distanceStrategyFromValue } from '@aws/galileo-sdk/lib/vectorstores';
import { corsInterceptor } from 'api-typescript-interceptors';
import { Document, embedDocumentsHandler, embedQueryHandler, similaritySearchHandler } from 'api-typescript-runtime';
import { VectorStore } from 'langchain/vectorstores/base';
import { memoize } from 'lodash';
import * as Embeddings from '../embedding';
import { vectorStoreFactory } from '../vectorstore';

let __EMBEDDINGS__: Embeddings.LocalEmbeddings;

function getEmbeddings(): Embeddings.LocalEmbeddings {
  if (__EMBEDDINGS__ == null) {
    __EMBEDDINGS__ = new Embeddings.LocalEmbeddings({});
  }

  return __EMBEDDINGS__;
}

async function _getVectorStore(config?: Partial<PGVectorStoreOptions>): Promise<VectorStore> {
  return vectorStoreFactory(getEmbeddings(), config);
}
const getVectorStore = memoize(_getVectorStore);

const interceptors = [corsInterceptor] as const;

export const similaritySearch = similaritySearchHandler(
  ...interceptors,
  async ({ input }) => {
    const { query, k, filter, distanceStrategy } = input.body;

    // NB: changing distanceStrategy should only be used for development since
    // unless the strategy is also indexes as performance will be slower.
    let vectorStoreConfig: Partial<PGVectorStoreOptions> | undefined;
    if (distanceStrategy) {
      vectorStoreConfig = {
        distanceStrategy: distanceStrategyFromValue(distanceStrategy),
      };
    }

    const vectorStore = await getVectorStore(vectorStoreConfig);

    if (query == null || query.length < 1) {
      throw new Error('InvalidPayload: query is required');
    }

    if (input.requestParameters.withScore) {
      const result = await vectorStore.similaritySearchWithScore(query, k, filter);
      const documents = result.map(([{ pageContent, metadata }, score]): Document => ({
        pageContent,
        metadata,
        score,
      }));

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
  },
);

export const embedDocuments = embedDocumentsHandler(
  ...interceptors,
  async ({ input }) => {

    const { texts } = input.body;

    const { embeddings, model } = await Embeddings.embedDocuments(texts);

    return {
      statusCode: 200,
      body: {
        embeddings,
        model,
      },
    };
  },
);

export const embedQuery = embedQueryHandler(
  ...interceptors,
  async ({ input }) => {

    const { text } = input.body;

    if (text == null || text.length < 1) {
      throw new Error('InvalidPayload: text is required');
    }

    const { embedding, model } = await Embeddings.embedQuery(text);

    return {
      statusCode: 200,
      body: {
        embedding,
        model,
      },
    };
  },
);
