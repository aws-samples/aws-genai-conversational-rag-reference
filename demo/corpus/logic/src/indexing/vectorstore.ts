/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { VectorStore } from 'langchain/vectorstores/base';
import { getEmbeddingsByModelId } from '../embedding/util';
import { vectorStoreFactory } from '../vectorstore';

export async function resolveVectorStore(
  embeddingTableName: string,
  embeddingModelId: string,
  vectorSize: number,
): Promise<VectorStore> {
  const embeddings = getEmbeddingsByModelId(embeddingModelId, { maxConcurrency: 10 });
  const vectorStore = await vectorStoreFactory({
    embeddingTableName,
    embeddings,
    vectorSize,
  });
  // TODO: support passing vector store config
  return vectorStore;
}
