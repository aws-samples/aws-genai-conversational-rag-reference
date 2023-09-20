/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { randomUUID } from 'node:crypto';
import { Document } from 'langchain/document';
import { Embeddings } from 'langchain/embeddings/base';
import { VectorStore } from 'langchain/vectorstores/base';
import pg from 'pg-promise';

import { RDSConnConfig } from './rds.js';
import { getLogger } from '../../common/index.js';

const logger = getLogger(__dirname);

export enum DistanceStrategy {
  EUCLIDEAN = 'l2',
  COSINE = 'cosine',
  MAX_INNER_PRODUCT = 'inner',
}

export interface IEmbeddingColumns {
  readonly id: string;
  readonly source_location: string;
  readonly document: string;
  readonly cmetadata: string;
  readonly embeddings: string;
}

export type PGVectorDbConfig = Parameters<pg.IMain>[0];

export interface PGVectorStoreOptions {
  readonly embeddings: Embeddings;
  readonly dbConfig: PGVectorDbConfig;
  readonly tableName: string;
  readonly vectorSize: number;
  /**
   * Column names for embeddings.
   * @default {IEmbeddingColumns} name of property is column name by default
   */
  readonly embeddingsColumns?: IEmbeddingColumns;
  /**
   * Distance strategy for search
   * @default {DistanceStrategy.EUCLIDEAN} "l2"
   */
  readonly distanceStrategy?: DistanceStrategy;

  /**
   * Source location to store documents without a `source_location` metadata property.
   * @default "unknown"
   */
  readonly defaultSourceLocation?: string;

  /**
   * Indicates if errors thrown during search methods are trapped or exposed.
   * - If `true`, errors will be logged but not thrown, resulting in empty document list being returned
   * - If `false`, errors will be thrown.
   *
   * Helpful for preventing search results errors from breaking nested chain flows that are hard to control.
   * @default false
   */
  readonly catchSearchErrors?: boolean;
}

export class PGVectorStore extends VectorStore {
  static getDbConfigFromRdsConfig(conn: RDSConnConfig, sslmode?: string): Exclude<PGVectorDbConfig, string> {
    const { engine, host, port, username, password } = conn;

    sslmode ??= process.env.PGSSLMODE || 'prefer';

    return {
      // https://github.com/brianc/node-postgres/issues/2607
      connectionString: `postgresql://${username}:${password}@${host}:${port}/${engine}?sslmode=${sslmode}`,
      database: engine,
      host,
      port: Number(port),
      user: username,
      password,
      // https://github.com/vitaly-t/pg-promise/wiki/Connection-Syntax
      allowExitOnIdle: true,
      idleTimeoutMillis: 10000,
      max: 3,
    };
  }

  readonly tableName: string;
  readonly embeddingsColumns: IEmbeddingColumns;
  readonly vectorSize: number;
  readonly db: pg.IDatabase<{}>;
  readonly distanceStrategy: DistanceStrategy;
  readonly defaultSourceLocation: string;

  protected readonly _columns: Set<string>;
  protected readonly _embeddingColumn: string;
  protected readonly _catchSearchErrors: boolean;

  protected _vectorTypeOid?: number;
  protected readonly pgp: pg.IMain;

  constructor(options: PGVectorStoreOptions) {
    const {
      embeddings,
      tableName,
      embeddingsColumns,
      vectorSize,
      distanceStrategy,
      defaultSourceLocation,
      catchSearchErrors,
    } = options;

    const dbConfig = options.dbConfig;

    super(embeddings, dbConfig as any);

    logger.debug({ message: 'Initializing PGVectorStore', options });

    this._catchSearchErrors = catchSearchErrors ?? false;

    this.pgp = pg({
      connect: async ({ client }) => {
        if (this._vectorTypeOid == null) {
          try {
            await this._resolveVectorExtensionType();

            logger.info(
              'Successfully connected to pgvector database: %s',
              {
                host: client.host,
                vectorOid: this._vectorTypeOid,
              },
            );
          } catch (error) {
            // Connection might be intentionally before extension is added, so not throwing
            logger.warn('Failed to initialize connection and setup vector store type', error as Error);
          }
        }
      },
      query: ({ query, params }) => {
        logger.debug({ message: 'Executing query', query: truncate(query), params });
      },
      receive: ({ data, result, ctx }) => {
        logger.debug({
          message: 'Received results',
          data,
          result,
          query: truncate(ctx.query),
          params: ctx.params,
        });
      },
      task({ ctx, query, params }) {
        const { finish, duration, start, result, success, useCount, isTX, level, txLevel, inTransaction, connected } = ctx;
        if (finish) {
          if (success) {
            logger.debug({ message: 'Task finished', level, txLevel, inTransaction, connected, isTX, useCount, duration, success, result, query: truncate(query), params });
          } else {
            logger.warn({ message: 'Task failed', level, txLevel, inTransaction, connected, isTX, useCount, duration, success, result, query: truncate(query), params }, result as Error);
          }
        } else {
          logger.debug({ message: 'Task started', level, txLevel, inTransaction, connected, isTX, useCount, start, query: truncate(query), params });
        }
      },
      transact({ ctx, query, params }) {
        const { finish, duration, start, result, success, useCount, isTX, level, txLevel, inTransaction, connected } = ctx;
        if (finish) {
          if (success) {
            logger.debug({ message: 'Transaction finished', level, txLevel, inTransaction, connected, isTX, useCount, duration, success, result, query: truncate(query), params });
          } else {
            logger.warn({ message: 'Transaction failed', level, txLevel, inTransaction, connected, isTX, useCount, duration, success, result, query: truncate(query), params }, result as Error);
          }
        } else {
          logger.debug({ message: 'Transaction started', level, txLevel, inTransaction, connected, isTX, useCount, start, query: truncate(query), params });
        }
      },
      error: (error, e) => {
        logger.warn({
          message: String(error),
          query: truncate(e.query),
          params: e.params,
        });
        console.error(error, e);
        logger.error(String(error), error as Error);
      },
    });

    this.db = this.pgp(dbConfig);
    this.tableName = tableName;
    this.embeddingsColumns = embeddingsColumns ?? {
      id: 'id',
      cmetadata: 'cmetadata',
      document: 'document',
      embeddings: 'embeddings',
      source_location: 'source_location',
    };
    this._embeddingColumn = this.embeddingsColumns.embeddings;
    this._columns = new Set(
      Object.entries(this.embeddingsColumns)
        .filter(([k]) => k !== this._embeddingColumn)
        .map(([k, v]) => {
          return k === v ? k : `${v} AS ${k}`;
        }),
    );
    this.vectorSize = vectorSize;
    this.distanceStrategy = distanceStrategy ?? DistanceStrategy.EUCLIDEAN;
    this.defaultSourceLocation = defaultSourceLocation ?? 'unknown';
  }

  _vectorstoreType(): string {
    return 'pgvector';
  }

  protected _initVectorTypeParser(oid: number) {
    if (this.pgp.pg.types.getTypeParser(oid) == null) {
      this.pgp.pg.types.setTypeParser(
        oid,
        'text',
        function (value) {
          return value
            .substring(1, value.length - 1)
            .split(',')
            .map((v) => parseFloat(v));
        },
      );
    }

    return this.pgp.pg.types.getTypeParser(oid);
  }

  protected async _resolveVectorExtensionType(task?: pg.ITask<any>): Promise<number> {
    if (this._vectorTypeOid == null) {
      const result = await (task || this.db).oneOrNone<{ oid: number }>(
        'SELECT typname, oid, typarray FROM pg_type WHERE typname = $1',
        ['vector'],
      );
      if (result?.oid == null) {
        throw new Error('Vector extension not available');
      }

      this._vectorTypeOid = result.oid;

      this._initVectorTypeParser(this._vectorTypeOid);
    }

    return this._vectorTypeOid;
  }

  async createVectorExtension(task?: pg.ITask<any>): Promise<void> {
    const query = 'CREATE EXTENSION IF NOT EXISTS vector';
    logger.debug(`createVectorExtension: "${query}"`);
    await (task || this.db).query(query);

    await this._resolveVectorExtensionType(task);
  }

  async createTableIfNotExists(task?: pg.ITask<any>): Promise<void> {
    const query = `CREATE TABLE IF NOT EXISTS ${this.tableName} (${this.embeddingsColumns.id} uuid primary key, ${this.embeddingsColumns.source_location} text, ${this.embeddingsColumns.document} text, ${this.embeddingsColumns.cmetadata} jsonb, ${this.embeddingsColumns.embeddings} vector(${this.vectorSize}));`;
    logger.debug(`createTableIfNotExists: "${query}"`);
    await (task || this.db).query(query);
  }

  async createIndexIfNotExisting(
    lists: number = 100,
    indexes?: DistanceStrategy[],
    dropOthers: boolean = false,
    concurrently: boolean = true,
  ): Promise<void> {

    await this.db.task('create-indexes', async (task) => {
      indexes ??= [this.distanceStrategy];
      const CONCURRENTLY = concurrently ? 'CONCURRENTLY' : '';

      if (indexes.includes(DistanceStrategy.COSINE)) {
        await task.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS content_cosine_idx ON ${this.tableName} USING ivfflat (${this._embeddingColumn} vector_cosine_ops) WITH (lists = ${lists});`);
      } else if (dropOthers) {
        await task.query(`DROP INDEX ${CONCURRENTLY} IF EXISTS content_cosine_idx;`);
      }

      if (indexes.includes(DistanceStrategy.EUCLIDEAN)) {
        await task.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS content_l2_idx ON ${this.tableName} USING ivfflat (${this._embeddingColumn} vector_l2_ops) WITH (lists = ${lists});`);
      } else if (dropOthers) {
        await task.query(`DROP INDEX ${CONCURRENTLY} IF EXISTS content_l2_idx;`);
      }

      if (indexes.includes(DistanceStrategy.MAX_INNER_PRODUCT)) {
        await task.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS content_inner_idx ON ${this.tableName} USING ivfflat (${this._embeddingColumn} vector_ip_ops) WITH (lists = ${lists});`);
      } else if (dropOthers) {
        await task.query(`DROP INDEX ${CONCURRENTLY} IF EXISTS content_inner_idx;`);
      }

    });
  }

  async addVectors(
    vectors: number[][],
    documents: Document<Record<string, any>>[],
    _options?: { [x: string]: any } | undefined,
  ): Promise<void | string[]> {
    const texts = documents.map(v => v.pageContent);
    const metadatas = documents.map(v => v.metadata);
    const ids = texts.map(() => randomUUID());
    const sourceLocations = metadatas.map((v) => v[this.embeddingsColumns.source_location] || this.defaultSourceLocation);

    // delete existing vectors for source_location to prevent duplicates
    const sourceLocationsSet = new Set(sourceLocations);
    // do not delete the default source location
    sourceLocationsSet.delete(this.defaultSourceLocation);
    if (sourceLocationsSet.size) {
      const sourceLocationValues = Array.from(sourceLocationsSet).map(v => `'${v}'`).join(', ');
      await this.db.query(`DELETE FROM ${this.tableName} WHERE ${this.embeddingsColumns.source_location} IN (${sourceLocationValues})`);
    }

    // list of values - (...), (...), (...)
    const values: string = texts.reduce((accum, text, i): string => {
      const cmetadata = metadatas[i];
      const id = ids[i];
      const source_location = sourceLocations[i];
      const embeddings = vectors[i];

      if (i>0) accum += ', ';
      accum += '\n(' + pg.as.csv({
        id,
        source_location,
        document: text,
        cmetadata,
        embeddings,
      }) + ')';
      return accum;
    }, '');

    // Batch insert
    let query = `INSERT INTO ${this.tableName} (${this.embeddingsColumns.id}, ${this.embeddingsColumns.source_location}, ${this.embeddingsColumns.document}, ${this.embeddingsColumns.cmetadata}, ${this.embeddingsColumns.embeddings}) VALUES ${values};`;

    await this.db.query(query);
  }
  async addDocuments(
    documents: Document<Record<string, any>>[],
    options?: { [x: string]: any } | undefined,
  ): Promise<void | string[]> {
    const texts = documents.map(v => v.pageContent);
    const vectors = await this.embeddings.embedDocuments(texts);

    return this.addVectors(vectors, documents, options);
  }

  async similaritySearchVectorWithScore(
    query: number[],
    k: number,
    filter?: this['FilterType'] | undefined,
  ): Promise<[Document<Record<string, any>>, number][]> {
    const where =
      filter && Object.keys(filter).length
        ? 'WHERE ' +
          Object.entries(filter)
            .map(([key, value]) => `cmetadata ->> '${key}' = '${value}'`)
            .join(' AND ')
        : '';

    const embeddingColumn = this._embeddingColumn;
    const columns = Array.from(this._columns.values()).join(', ');
    const table = this.tableName;

    const values = {
      embeddings: JSON.stringify(query),
      limit: k,
    };

    try {
      let queryPromise: Promise<
      Record<keyof IEmbeddingColumns | 'distance', any>[]
      >;
      // https://github.com/pgvector/pgvector#distances
      switch (this.distanceStrategy) {
        case DistanceStrategy.COSINE: {
          queryPromise = this.db.any(
            `SELECT ${columns}, 1 - ${embeddingColumn} <=> $(embeddings) AS distance FROM ${table} ${where} ORDER BY distance LIMIT $(limit)`,
            values,
          );
          break;
        }
        case DistanceStrategy.MAX_INNER_PRODUCT: {
          queryPromise = this.db.any(
            `SELECT ${columns}, (${embeddingColumn} <-> $(embeddings)) * -1 AS distance FROM ${table} ${where} ORDER BY distance LIMIT $(limit)`,
            values,
          );
          break;
        }
        default: {
          queryPromise = this.db.any(
            `SELECT ${columns}, ${embeddingColumn} <-> $(embeddings) AS distance FROM ${table} ${where} ORDER BY distance LIMIT $(limit)`,
            values,
          );
          break;
        }
      }
      const results = await queryPromise;

      logger.debug({ message: 'Received similarity search results', results });

      return results.map((row): [Document<Record<string, any>>, number] => {
        return [
          new Document<Record<string, any>>({
            pageContent: row.document,
            metadata: row.cmetadata,
          }),
          Number(row.distance),
        ];
      });
    } catch (error) {
      logger.error('Failed to perform similarity search', error as Error);
      if (this._catchSearchErrors) {
        return [];
      }
      throw error;
    }
  }
}

function truncate(value: string, max: number = 2000): string {
  if (typeof value !== 'string') return String(value);

  if (value.length <= max) {
    return value;
  }
  return value.slice(0, max - 3) + `... (${max} of ${value.length})`;
}
