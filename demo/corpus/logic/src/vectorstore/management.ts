/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { DistanceStrategy, PGVectorStore } from '@aws/galileo-sdk/lib/vectorstores';
import { FakeEmbeddings } from 'langchain/embeddings/fake';
import { vectorStoreFactory } from '.';
import { ENV } from '../env';

/**
 * Setup the vector store.
 * - Add pgvector extension
 * - Create table(s)
 */
export async function initializeVectorStore(truncate: boolean = false) {
  // We don't need embeddings to initialize so just use fake
  const embeddings = new FakeEmbeddings();

  const vectorStore = await vectorStoreFactory(embeddings);

  if (vectorStore instanceof PGVectorStore) {
    await vectorStore.db.task('initialize-vector-store', async (task) => {
      if (truncate) {
        await vectorStore.truncate(task);
      }
      await vectorStore.createVectorExtension(task);
      await vectorStore.createTableIfNotExists(task);
    });
  }
}

/**
 * Create indexes for vector store based on distance strategies.
 *
 * @param distanceStrategy {DistanceStrategy[]} - List of strategies to create indexes for.
 *  Will use default vector store strategy if undefined
 * @param dropOthers {boolean} - Whether to drop of the index strategies.
 */
export async function indexVectorStore(distanceStrategy?: DistanceStrategy | DistanceStrategy[], dropOthers?: boolean) {
  // We don't need embeddings to initialize so just use fake
  const embeddings = new FakeEmbeddings();

  const vectorStore = await vectorStoreFactory(embeddings);

  if (vectorStore instanceof PGVectorStore) {
    if (distanceStrategy && !Array.isArray(distanceStrategy)) {
      distanceStrategy = [distanceStrategy];
    }
    await vectorStore.createIndexIfNotExisting(ENV.VECTOR_INDEX_LISTS, distanceStrategy, dropOthers);
  }
}
