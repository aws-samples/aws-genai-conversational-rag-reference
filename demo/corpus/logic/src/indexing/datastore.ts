/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as path from 'node:path';
import { getLogger } from '@aws/galileo-sdk/lib/common';
import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { S3Client, S3ClientConfig, HeadObjectCommand } from '@aws-sdk/client-s3';
import {
  BatchGetCommand,
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import * as async from 'async';
import { chunkArray } from './utils';
import { ENV } from '../env';
import { measurable } from '../metrics';

const logger = getLogger('indexing/datastore');

type Keys = {
  PK: string;
  SK: string;
};

type DDBEntity = Keys & {
  id: string;
  timestamp: string;
};

export interface IndexEntity {
  readonly objectKey: string;
  readonly localPath: string;
  readonly sourceLocation: string;
  readonly metadata: Record<string, any>;
  readonly lastModified: Date;
}

export interface IndexingCacheProps {
  readonly bucketName: string;
  readonly tableName: string;
  readonly model: string;
  readonly baseLocalPath: string;
  readonly ddbClientConfig?: DynamoDBClientConfig;
  readonly s3ClientConfig?: S3ClientConfig;
}

export class IndexingCache {
  readonly bucketName: string;
  readonly tableName: string;
  readonly model: string;
  readonly baseLocalPath: string;

  protected ddbClient: DynamoDBClient;
  protected ddbDocClient: DynamoDBDocumentClient;
  protected s3Client: S3Client;

  protected entities: Map<string, IndexEntity> = new Map();
  protected lastIndexedMap: Map<string, Date> = new Map();
  protected modelLastExecuted?: Date;

  private supportedContentTypes: string[];

  get entityCount(): number {
    return this.entities.size;
  }

  constructor({ bucketName, tableName, model, baseLocalPath, ddbClientConfig, s3ClientConfig }: IndexingCacheProps) {
    this.bucketName = bucketName;
    this.tableName = tableName;
    this.model = model;
    this.baseLocalPath = baseLocalPath;

    this.ddbClient = new DynamoDBClient(ddbClientConfig ?? {});
    this.ddbDocClient = DynamoDBDocumentClient.from(this.ddbClient);
    this.s3Client = new S3Client(s3ClientConfig ?? {});

    // remove spaces and split by comma
    this.supportedContentTypes = ENV.INDEXING_SUPPORTED_CONTENT_TYPES.replace(' ', '').split(',');
  }

  formatSourceLocation(key: string): string {
    if (key.startsWith('s3://')) {
      return key;
    }

    return `s3://${this.bucketName}/${key}`;
  }

  idFromPK(pk: string): string {
    return pk.split('#')[1];
  }

  getModelPK(model: string): string {
    return `MODEL#${model}`;
  }

  getSourceLocationPK(key: string): string {
    return `SOURCE_LOCATION#${this.formatSourceLocation(key)}`;
  }

  @measurable('IndexingCache-resolveEntitiesToIndex')
  async resolveEntitiesToIndex(objectKeys: string[], skipDeltaCheck: boolean = false): Promise<IndexEntity[]> {
    await this._resolveS3Metadata(objectKeys);
    !skipDeltaCheck && (await this._resolveLastIndexed(objectKeys));

    const _entities = Array.from(this.entities.values());
    if (skipDeltaCheck || this.modelLastExecuted == null || this.lastIndexedMap.size === 0) {
      return _entities;
    }

    // only return entities modified after last index of the entity
    return _entities.filter((_entity) => {
      const _lastIndexed = this.lastIndexedMap.get(_entity.sourceLocation);
      return _lastIndexed == null || _lastIndexed < _entity.lastModified;
    });
  }

  @measurable('IndexingCache-updateLastIndexed')
  async updateLastIndexed(sourceLocations: string[]): Promise<void> {
    const unprocessed: string[] = [];
    const now = new Date();
    const timestamp = now.toISOString();

    const entities: DDBEntity[] = sourceLocations.map((_sourceLocation) => ({
      PK: this.getSourceLocationPK(_sourceLocation),
      SK: this.model,
      id: _sourceLocation,
      timestamp,
    }));
    const chunks = chunkArray(entities, 25);

    for (const chunk of chunks) {
      const { UnprocessedItems } = await this.ddbDocClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: chunk.map((Item) => ({
              PutRequest: {
                Item,
              },
            })),
          },
        }),
      );
      if (UnprocessedItems && UnprocessedItems[this.tableName]) {
        UnprocessedItems[this.tableName].forEach((v) => {
          if (v.PutRequest?.Item) {
            unprocessed.push(v.PutRequest.Item.id);
          }
        });
      }
    }

    if (unprocessed.length) {
      await this.updateLastIndexed(unprocessed);
    }

    sourceLocations.forEach((_sourceLocation) => {
      this.lastIndexedMap.set(_sourceLocation, now);
    });
  }

  @measurable('IndexingCache-updateModelLastExecuted')
  async updateModelLastExecuted(): Promise<void> {
    const now = new Date();
    const timestamp = now.toISOString();

    await this.ddbDocClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: this.getModelPK(this.model),
          SK: 'status',
          id: this.model,
          timestamp,
        },
      }),
    );

    this.modelLastExecuted = now;
  }

  async getModelLastExecuted(): Promise<Date | undefined> {
    if (this.modelLastExecuted == null) {
      const { Item } = await this.ddbDocClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: {
            PK: this.getModelPK(this.model),
            SK: 'status',
          },
        }),
      );

      if (Item && 'timestamp' in Item) {
        this.modelLastExecuted = new Date(Item.timestamp);
      }
    }

    return this.modelLastExecuted;
  }

  @measurable('IndexingCache-resolveS3Metadata')
  async _resolveS3Metadata(objectKeys: string[]) {
    logger.info(`Resolving S3 metadata: ${objectKeys.length}`, { count: objectKeys.length });
    logger.debug({
      message: 'S3 objects keys to resolve (sample)',
      sampleSize: 100,
      totalSize: objectKeys.length,
      objectKeys: objectKeys.slice(0, 100),
    });

    const task: async.AsyncBooleanIterator<string> = async (_objectKey: string) =>
      async.retry(
        {
          times: 5,
          interval: exponentialBackoff,
        },
        async () => {
          const sourceLocation = this.formatSourceLocation(_objectKey);
          try {
            const response = await this.s3Client.send(
              new HeadObjectCommand({
                Bucket: this.bucketName,
                Key: _objectKey,
              }),
            );

            if (response.ContentType && this.supportedContentTypes.includes(response.ContentType)) {
              const entity: IndexEntity = {
                objectKey: _objectKey,
                localPath: path.join(this.baseLocalPath, _objectKey),
                sourceLocation,
                metadata: normalizeMetadata(response.Metadata),
                lastModified: response.LastModified ?? new Date(),
              };

              this.entities.set(sourceLocation, entity);

              return;
            } else {
              logger.warn(`${sourceLocation}'s Content-Type (${response.ContentType} not supported. Skipping...)`);
              return;
            }
          } catch (error) {
            logger.warn(`Failed to resolve S3 object key: "${sourceLocation}"`, error as Error);
            throw error;
          }
        },
      );

    // Process all requests in parallel up to limit
    await async.eachLimit(objectKeys, 1000, task.bind(this));

    logger.info(`Successfully resolved all S3 object metadata for ${objectKeys.length}`);
  }

  async filterS3KeysByLastIndexedSince(objectKeys: string[], since: Date): Promise<string[]> {
    logger.info(`Filter S3 Keys by last indexed since: ${since}`, {
      count: objectKeys.length,
      since: since.toISOString(),
    });
    await this._resolveLastIndexed(objectKeys);

    const result = objectKeys.filter((key) => {
      const lastIndexed = this.lastIndexedMap.get(this.idFromPK(this.getSourceLocationPK(key)));
      return lastIndexed == null || since > lastIndexed;
    });

    logger.debug(
      `Successfully filtered S3 Keys by last indexed since: ${since}; from ${objectKeys.length} to ${result.length} keys.`,
    );
    return result;
  }

  @measurable('IndexingCache-resolveLastIndexed')
  async _resolveLastIndexed(objectKeys: string[], attempt: number = 1): Promise<void> {
    const lastExecuted = await this.getModelLastExecuted();

    // If the model has never been executed we can ignore individual object status
    // which results in processing every object
    if (lastExecuted == null) {
      return;
    }

    const unprocessed: string[] = [];
    const chunks = chunkArray(objectKeys, 100);

    for (const chunk of chunks) {
      const { Responses, UnprocessedKeys } = await this.ddbDocClient.send(
        new BatchGetCommand({
          RequestItems: {
            [this.tableName]: {
              Keys: chunk.map(
                (objectKey) =>
                  ({
                    PK: this.getSourceLocationPK(objectKey),
                    SK: this.model,
                  } as Keys),
              ),
            },
          },
        }),
      );
      if (Responses && Responses[this.tableName]) {
        Responses[this.tableName].forEach((_entity) => {
          this.lastIndexedMap.set(_entity.id, new Date(_entity.timestamp));
        });
      }
      if (UnprocessedKeys && UnprocessedKeys[this.tableName]) {
        UnprocessedKeys[this.tableName].Keys?.forEach((_keys) => {
          unprocessed.push(this.idFromPK(_keys.PK));
        });
      }
    }

    if (unprocessed.length && attempt < 3) {
      await delay(exponentialBackoff(attempt));
      await this._resolveLastIndexed(unprocessed, attempt + 1);
    }
  }

  /**
   * Deletes the last executed date for the model, which to some degree nullifies
   * individual entries.
   * TODO: improve this by also deleting all object values for this model, but that is slow
   * and might not be necessary for purposes of re-indexing
   */
  async resetCache(): Promise<void> {
    if (await this.getModelLastExecuted()) {
      await this.ddbDocClient.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: {
            PK: this.getModelPK(this.model),
            SK: 'status',
          },
        }),
      );
    }
  }
}

function exponentialBackoff(retryCount: number): number {
  return 100 * Math.pow(2, retryCount);
}

async function delay(interval: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, interval);
  });
}

export function normalizeMetadata(metadata: Record<string, string> = {}): Record<string, string> {
  let metadataNormalized: Record<string, string> = {};

  for (const key in metadata) {
    if (key === 'json-base64' || key === 'json-base-64') {
      try {
        // base64 decode
        const decodedValue = Buffer.from(metadata[key], 'base64').toString('utf-8');
        const decodedObject = JSON.parse(decodedValue) as Record<string, string>;

        Object.entries(decodedObject).forEach(([dKey, value]) => {
          metadataNormalized[dKey] = value;
        });
      } catch (err: any) {
        logger.error('Error decoding json-base64 field. Skipping...', err.message);
      }
    } else {
      metadataNormalized[key] = metadata[key];
    }
  }

  return metadataNormalized;
}
