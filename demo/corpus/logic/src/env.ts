/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { envBool } from '@aws/galileo-sdk/lib/common';
import { normalizePostgresTableName } from '@aws/galileo-sdk/lib/vectorstores/pgvector/utils';

export interface IProcessEnv {
  /** Necessary to connect to rds instance - https://github.com/brianc/node-postgres/issues/2607 */
  PGSSLMODE: 'no-verify';
  /** DynamoDB table name for caching index status */
  INDEXING_CACHE_TABLE: string;
  /** Indexing source S3 bucket to index */
  INDEXING_BUCKET: string;
  /** Name or Arn of secret storing RDS pgvector connection config */
  RDS_PGVECTOR_STORE_SECRET: string;
  /** Proxy endpoint for RDS pgvector connection */
  RDS_PGVECTOR_PROXY_ENDPOINT?: string;
  /** Indicates if IAM authentication is required for RDS connection */
  RDS_PGVECTOR_IAM_AUTH?: string;
  /** Indicates if Transport Layer Security (TLS) is enabled */
  RDS_PGVECTOR_TLS_ENABLED?: string;
  /** Port where embedding service is listening */
  EMBEDDING_PORT?: string;
  /** Sentence transformer model id */
  EMBEDDING_SENTENCE_TRANSFORMER_MODEL?: string;
  /** Vector Size */
  VECTOR_SIZE?: string;
  /** Chunk size for text splitter */
  CHUNK_SIZE?: string;
  /** Chunk overlap for text splitter */
  CHUNK_OVERLAP?: string;
  /** List length for vector store indexes */
  VECTOR_INDEX_LISTS?: string;
  /** Input local path for sagemaker processing job */
  PROCESSING_INPUT_LOCAL_PATH?: string;
  /** Glob pattern(s) to index in source bucket (CSV) */
  INDEXING_GLOB?: string;
  /**
   * Comma-separated list of supported 'Content-Type' values to index from source bucket.
   */
  INDEXING_SUPPORTED_CONTENT_TYPES?: string;
  /** Indicates if delta check is skipped, which is the per file last indexed checking */
  INDEXING_SKIP_DELTA_CHECK?: string;

  /**
   * Number of workers to parallelize document processing.
   * - Majority of work is I/O which does not benefit from parallelization, so be careful increasing much.
   * @default 2
   */
  INDEXING_WORKER_COUNT?: string;
  /**
   * Number of input files to process at a time within each worker. Each file is
   * split into chunks, with each chunk getting embeddings resolved, and later
   * inserted into vector store.
   * - This number should support thresholds/performance/bottlenecks of each of those
   * operations.
   * - Insert into vector store is the only remote call
   * @default 500
   */
  INDEXING_WORKER_BATCH_SIZE?: string;
  /**
   * Max number of documents to insert in a single query (vectorized document chunks).
   * @default 1000
   */
  INDEXING_VECTORSTOR_INSERT_MAX?: string;
}

export namespace ENV {
  export const INDEXING_CACHE_TABLE = process.env.INDEXING_CACHE_TABLE!;
  export const INDEXING_BUCKET = process.env.INDEXING_BUCKET!;
  export const RDS_PGVECTOR_STORE_SECRET = process.env.RDS_PGVECTOR_STORE_SECRET!;
  export const RDS_PGVECTOR_PROXY_ENDPOINT = process.env.RDS_PGVECTOR_PROXY_ENDPOINT;
  export const RDS_PGVECTOR_IAM_AUTH = envBool('RDS_PGVECTOR_IAM_AUTH', false);
  export const RDS_PGVECTOR_TLS_ENABLED = envBool('RDS_PGVECTOR_TLS_ENABLED', true);

  export const EMBEDDING_PORT = parseInt(process.env.EMBEDDING_PORT || '1337');
  export const EMBEDDING_SENTENCE_TRANSFORMER_MODEL =
    process.env.EMBEDDING_SENTENCE_TRANSFORMER_MODEL || 'all-mpnet-base-v2';
  export const VECTOR_SIZE = parseInt(process.env.VECTOR_SIZE || '768');
  export const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '1000');
  export const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || '200');
  export const VECTOR_INDEX_LISTS = parseInt(process.env.VECTOR_INDEX_LISTS || '1000');
  export const PROCESSING_INPUT_LOCAL_PATH = process.env.PROCESSING_INPUT_LOCAL_PATH || '/opt/ml/processing/input_data';
  export const INDEXING_GLOB = process.env.INDEXING_GLOB || '**/*.*';
  export const INDEXING_SUPPORTED_CONTENT_TYPES = process.env.INDEXING_SUPPORTED_CONTENT_TYPES || 'text/plain';

  export const EMBEDDING_TABLENAME = normalizePostgresTableName(
    `${EMBEDDING_SENTENCE_TRANSFORMER_MODEL}_${VECTOR_SIZE}`,
  );

  export const INDEXING_SKIP_DELTA_CHECK = envBool('INDEXING_SKIP_DELTA_CHECK', false);

  export const INDEXING_WORKER_COUNT = parseInt(process.env.INDEXING_WORKER_COUNT || '2');
  export const INDEXING_WORKER_BATCH_SIZE = parseInt(process.env.INDEXING_WORKER_BATCH_SIZE || '500');
  export const INDEXING_VECTORSTOR_INSERT_MAX = parseInt(process.env.INDEXING_VECTORSTOR_INSERT_MAX || '1000');
}

console.debug('process.env:', JSON.stringify(process.env, null, 2));
console.debug('ENV:', JSON.stringify(ENV, null, 2));
