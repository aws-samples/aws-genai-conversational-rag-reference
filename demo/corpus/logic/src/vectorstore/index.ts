/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { PGVectorStore, PGVectorStoreOptions } from '@aws/galileo-sdk/lib/vectorstores';
import { RDSConnConfig, getRDSConnConfig } from '@aws/galileo-sdk/lib/vectorstores/pgvector/rds';
import { Embeddings } from 'langchain/embeddings/base';
import { VectorStore } from 'langchain/vectorstores/base';
import { ENV } from '../env';

let __RDS_CONN__: RDSConnConfig;
const __VECTOR_STORE_CACHE__ = new Map<string, VectorStore>();

export interface VectorStoreFactoryProps {
  // embeddingTableName {string} The name of the table to store embeddings in
  readonly embeddingTableName: string;

  // vectorSize {number} The dimensions of vector store
  readonly vectorSize: number;

  // embeddings {Embeddings} The embeddings instance to create vectors
  readonly embeddings: Embeddings;

  // config [{object}] Instance config
  readonly config?: Partial<PGVectorStoreOptions>;
}

/**
 * Create VectorStore instance
 * @param vectorStoreFactoryProps {VectorStoreFactoryProps} Properties to create vector store instance
 * @returns {VectorStore} VectorStore instance
 */
export const vectorStoreFactory = async (vectorStoreFactoryProps: VectorStoreFactoryProps): Promise<VectorStore> => {
  const { embeddingTableName, vectorSize, embeddings, config } = vectorStoreFactoryProps;

  const cacheKey = JSON.stringify(vectorStoreFactoryProps);
  if (__VECTOR_STORE_CACHE__.has(cacheKey)) {
    __VECTOR_STORE_CACHE__.get(cacheKey);
  }

  if (__RDS_CONN__ == null) {
    __RDS_CONN__ = await getRDSConnConfig({
      secretId: ENV.RDS_PGVECTOR_STORE_SECRET,
      proxyEndpoint: ENV.RDS_PGVECTOR_PROXY_ENDPOINT,
      // Since we are using master secret for credentials, we do not use iam auth
      iamAuthentication: false,
    });
  }
  const dbConfig = PGVectorStore.getDbConfigFromRdsConfig(
    __RDS_CONN__,
    ENV.RDS_PGVECTOR_TLS_ENABLED ? 'verify-full' : 'prefer',
  );

  const store = new PGVectorStore({
    dbConfig,
    embeddings,
    tableName: embeddingTableName,
    vectorSize,
    ...config,
  });

  __VECTOR_STORE_CACHE__.set(cacheKey, store);

  return store;
};
