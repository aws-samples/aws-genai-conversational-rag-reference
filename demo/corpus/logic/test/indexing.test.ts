/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
// @ts-ignore
import type {} from '@types/jest';
import { logger } from '@aws/galileo-sdk/lib/common';
import { normalizePostgresTableName } from '@aws/galileo-sdk/lib/vectorstores/pgvector/utils';
import { HeadObjectCommand, HeadObjectCommandOutput, S3Client } from '@aws-sdk/client-s3';
import {
  BatchGetCommand,
  BatchGetCommandOutput,
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandOutput,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { FakeEmbeddings } from 'langchain/embeddings/fake';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

/* eslint-disable @typescript-eslint/no-require-imports */

const dynamoDBDocumentMock = mockClient(DynamoDBDocumentClient);
const s3Mock = mockClient(S3Client);

logger.setLogLevel('DEBUG');

const PROCESSING_INPUT_LOCAL_PATH = '/tmp/mock/ml/input';
const EMBEDDING_TABLENAME = 'MockEmbeddingTable';
const INDEXING_CACHE_TABLE = 'MockIndexingCache';
const INDEXING_BUCKET = 'mock-bucket';
const EMBEDDINGS_SAGEMAKER_MODEL = 'mock-model';
const EMBEDDINGS_SAGEMAKER_ENDPOINT = 'mock-endpoint-name';
const VECTOR_SIZE = '768';
const MODEL = normalizePostgresTableName(`${EMBEDDINGS_SAGEMAKER_MODEL}_${VECTOR_SIZE}`);

jest.mock('../src/embedding', () => ({
  SageMakerEndpointEmbeddings: FakeEmbeddings,
}));

jest.mock('../src/vectorstore', () => ({
  vectorStoreFactory: async () =>
    new MemoryVectorStore(new (require('../src/embedding').SageMakerEndpointEmbeddings)()),
}));

const inputFiles = Object.fromEntries([...Array(100).keys()].map((_, i) => [`file-${i}.txt`, `Content #${i}`]));

describe('indexing', () => {
  beforeAll(() => {
    process.env.PROCESSING_INPUT_LOCAL_PATH = PROCESSING_INPUT_LOCAL_PATH;
    process.env.EMBEDDING_TABLENAME = EMBEDDING_TABLENAME;
    process.env.INDEXING_CACHE_TABLE = INDEXING_CACHE_TABLE;
    process.env.INDEXING_BUCKET = INDEXING_BUCKET;
    process.env.EMBEDDINGS_SAGEMAKER_MODEL = EMBEDDINGS_SAGEMAKER_MODEL;
    process.env.EMBEDDINGS_SAGEMAKER_ENDPOINT = EMBEDDINGS_SAGEMAKER_ENDPOINT;
    process.env.EMBEDDING_TABLENAME = MODEL;
    process.env.VECTOR_SIZE = VECTOR_SIZE;

    jest.spyOn(require('../src/indexing/utils'), 'globDir').mockImplementation(async () => {
      return Object.keys(inputFiles);
    });
    jest.spyOn(require('node:fs/promises'), 'readFile').mockImplementation(async (file) => {
      return `Content for ${file}`;
    });
  });

  afterEach(() => {
    dynamoDBDocumentMock.reset();
    s3Mock.reset();
  });

  test('bulk', async () => {
    s3Mock.on(HeadObjectCommand).resolves({
      $metadata: {},
      LastModified: new Date(),
      Metadata: {
        a: 'a',
        b: 'b',
      },
      ContentType: 'text/plain',
    } as HeadObjectCommandOutput);

    dynamoDBDocumentMock.on(GetCommand).resolves({});
    dynamoDBDocumentMock.on(PutCommand).resolves({});

    dynamoDBDocumentMock.on(BatchGetCommand).resolves({
      $metadata: {} as any,
      Responses: {
        [INDEXING_CACHE_TABLE]: [],
      },
    } as BatchGetCommandOutput);

    dynamoDBDocumentMock.on(BatchWriteCommand).resolves({});

    const count = await require('../src/indexing').main();
    expect(count).toBe(Object.keys(inputFiles).length);
  });

  test('all cached', async () => {
    dynamoDBDocumentMock.reset();
    s3Mock.reset();

    s3Mock.on(HeadObjectCommand).resolves({
      $metadata: {},
      LastModified: new Date(Date.now() - 720 * 1000),
      Metadata: {
        a: 'a',
        b: 'b',
      },
      ContentType: 'text/plain',
    } as HeadObjectCommandOutput);

    // model last indexed
    dynamoDBDocumentMock.on(GetCommand).resolves({
      $metadata: {},
      Item: {
        id: MODEL,
        timestamp: new Date().toISOString(),
      },
    } as GetCommandOutput);
    dynamoDBDocumentMock.on(PutCommand).resolves({});

    dynamoDBDocumentMock.on(BatchGetCommand).resolves({
      $metadata: {} as any,
      Responses: {
        [INDEXING_CACHE_TABLE]: Object.keys(inputFiles).map((_file) => ({
          PK: `SOURCE_LOCATION#s3://${INDEXING_BUCKET}/${_file}`,
          SK: MODEL,
          id: `s3://${INDEXING_BUCKET}/${_file}`,
          timestamp: new Date().toISOString(),
        })),
      },
    } as BatchGetCommandOutput);

    dynamoDBDocumentMock.on(BatchWriteCommand).resolves({});

    const count = await require('../src/indexing').main();
    expect(count).toBe(0);
  });

  test('partial', async () => {
    dynamoDBDocumentMock.reset();
    s3Mock.reset();

    const currentDate = new Date();
    const lastIndexed = new Date(Date.now() - 720 * 1000);

    const _s3Head = s3Mock.on(HeadObjectCommand);
    Object.keys(inputFiles).forEach((_, i) => {
      _s3Head.resolvesOnce({
        $metadata: {},
        LastModified: i % 2 === 0 ? currentDate : lastIndexed,
        Metadata: {
          a: 'a',
          b: 'b',
        },
        ContentType: 'text/plain',
      } as HeadObjectCommandOutput);
    });

    // model last indexed
    dynamoDBDocumentMock.on(GetCommand).resolves({
      $metadata: {},
      Item: {
        id: MODEL,
        timestamp: lastIndexed.toISOString(),
      },
    } as GetCommandOutput);
    dynamoDBDocumentMock.on(PutCommand).resolves({});

    dynamoDBDocumentMock.on(BatchGetCommand).resolves({
      $metadata: {} as any,
      Responses: {
        [INDEXING_CACHE_TABLE]: Object.keys(inputFiles).map((_file) => ({
          PK: `SOURCE_LOCATION#s3://${INDEXING_BUCKET}/${_file}`,
          SK: MODEL,
          id: `s3://${INDEXING_BUCKET}/${_file}`,
          timestamp: lastIndexed.toISOString(),
        })),
      },
    } as BatchGetCommandOutput);

    dynamoDBDocumentMock.on(BatchWriteCommand).resolves({});

    const count = await require('../src/indexing').main();
    expect(count).toBe(Object.keys(inputFiles).length / 2);
  });

  test('content-type filtered', async () => {
    const _s3Head = s3Mock.on(HeadObjectCommand);
    Object.keys(inputFiles).forEach((_, i) => {
      _s3Head.resolvesOnce({
        $metadata: {},
        LastModified: new Date(),
        Metadata: {
          a: 'a',
          b: 'b',
        },
        ContentType: i % 2 == 0 ? 'text/plain' : 'application/octet-stream',
      } as HeadObjectCommandOutput);
    });

    dynamoDBDocumentMock.on(GetCommand).resolves({});
    dynamoDBDocumentMock.on(PutCommand).resolves({});

    dynamoDBDocumentMock.on(BatchGetCommand).resolves({
      $metadata: {} as any,
      Responses: {
        [INDEXING_CACHE_TABLE]: [],
      },
    } as BatchGetCommandOutput);

    dynamoDBDocumentMock.on(BatchWriteCommand).resolves({});

    const count = await require('../src/indexing').main();
    expect(count).toBe(Object.keys(inputFiles).length / 2);
  });
});
