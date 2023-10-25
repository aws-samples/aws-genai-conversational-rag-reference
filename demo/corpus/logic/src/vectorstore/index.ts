/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { PGVectorStore, PGVectorStoreOptions } from '@aws/galileo-sdk/lib/vectorstores';
import {
  RDSConnConfig,
  getRDSConnConfig,
} from '@aws/galileo-sdk/lib/vectorstores/pgvector/rds';
import {
  normalizePostgresTableName,
} from '@aws/galileo-sdk/lib/vectorstores/pgvector/utils';
import { Embeddings } from 'langchain/embeddings/base';
import { VectorStore } from 'langchain/vectorstores/base';
import { ENV } from '../env';

let __RDS_CONN__: RDSConnConfig;

/**
 * Create VectorStore instance
 * @param embeddings {Embeddings} The embeddings instance to create vectors
 * @param config [{object}] Instance config
 * @param initialize {boolean} If true, will ensure extension/tables/etc are created within the store as expected by consumers
 * @returns
 */
export const vectorStoreFactory = async (
  embeddings: Embeddings,
  config?: Partial<PGVectorStoreOptions>,
): Promise<VectorStore> => {
  if (__RDS_CONN__ == null) {
    __RDS_CONN__ = await getRDSConnConfig({
      secretId: ENV.RDS_PGVECTOR_STORE_SECRET,
      proxyEndpoint: ENV.RDS_PGVECTOR_PROXY_ENDPOINT,
      // Since we are using master secret for credentials, we do not use iam auth
      iamAuthentication: false,
    });
  }
  const dbConfig = PGVectorStore.getDbConfigFromRdsConfig(__RDS_CONN__, ENV.RDS_PGVECTOR_TLS_ENABLED ? 'verify-full' : 'prefer');

  const vectorSize = Number(ENV.VECTOR_SIZE);

  const tableName = normalizePostgresTableName(ENV.EMBEDDING_TABLENAME);

  const store = new PGVectorStore({
    dbConfig,
    embeddings,
    tableName,
    vectorSize,
    ...config,
  });

  return store;
};
