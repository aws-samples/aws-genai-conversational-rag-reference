/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { VectorStore } from 'langchain/vectorstores/base';
import { SageMakerEndpointEmbeddings } from '../embedding';
import { vectorStoreFactory } from '../vectorstore';

let __VECTOR_STORE__: VectorStore;

export async function resolveVectorStore(): Promise<VectorStore> {
  if (__VECTOR_STORE__ == null) {
    const embeddings = new SageMakerEndpointEmbeddings({ maxConcurrency: 10 });
    // TODO: support passing vector store config
    __VECTOR_STORE__ = await vectorStoreFactory(embeddings, undefined);
  }

  return __VECTOR_STORE__;
}
