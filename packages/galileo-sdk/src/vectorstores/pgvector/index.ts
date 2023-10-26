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

// PERF: Initial testing with 1.6M vectors with casefile use case resulting in l2 working best
// inner: 5s, l2: 0.3s, cosine: 5s
// only l2 is consistently using index, which is obviously why is faster - with same results
export const DEFAULT_DISTANCE_STRATEGY = DistanceStrategy.EUCLIDEAN;

export function distanceStrategyFromValue(value?: `${DistanceStrategy}`): DistanceStrategy {
  switch (value) {
    case 'cosine': return DistanceStrategy.COSINE;
    case 'inner': return DistanceStrategy.MAX_INNER_PRODUCT;
    case 'l2': return DistanceStrategy.EUCLIDEAN;
    default: return DEFAULT_DISTANCE_STRATEGY;
  }
}

export function indexNameFromStrategy(value: DistanceStrategy): string {
  switch (value) {
    case DistanceStrategy.EUCLIDEAN: return 'content_l2_idx';
    case DistanceStrategy.COSINE: return 'content_cosine_idx';
    case DistanceStrategy.MAX_INNER_PRODUCT: return 'content_inner_idx';
  }
}

export interface IEmbeddingColumns {
  readonly id: string;
  readonly source_location: string;
  readonly document: string;
  readonly cmetadata: string;
  readonly embeddings: string;
}

interface TableRow {
  readonly id: string;
  readonly source_location: string;
  readonly document: string;
  readonly cmetadata: Record<string, any>;
  readonly embeddings: number[];
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

// Persist vector extension oid between instances based on host
const VECTOR_OID_HOST_MAP = new Map<string, number>();

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
    this.distanceStrategy = distanceStrategy ?? DEFAULT_DISTANCE_STRATEGY;
    this.defaultSourceLocation = defaultSourceLocation ?? 'unknown';
  }

  get host(): string | undefined {
    return this.db.$pool.options.host;
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
      if (this.host && VECTOR_OID_HOST_MAP.has(this.host)) {
        this._vectorTypeOid = VECTOR_OID_HOST_MAP.get(this.host);
        this._vectorTypeOid;
      }

      const result = await (task || this.db).oneOrNone<{ oid: number }>(
        'SELECT typname, oid, typarray FROM pg_type WHERE typname = $1',
        ['vector'],
      );
      if (result?.oid == null) {
        throw new Error('Vector extension not available');
      }

      this._vectorTypeOid = result.oid;
      this.host && VECTOR_OID_HOST_MAP.set(this.host, result.oid);

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

  async tableExists(task?: pg.ITask<any>): Promise<boolean> {
    const query = "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = $1)";
    const result = await (task || this.db).one<{ exists: boolean }>(query, [this.tableName]);
    return result.exists;
  }

  async indexExists(distanceStrategy: DistanceStrategy = this.distanceStrategy, task?: pg.ITask<any>): Promise<boolean> {
    const query = "SELECT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1)";
    const result = await (task || this.db).one<{ exists: boolean }>(query, indexNameFromStrategy(distanceStrategy));
    return result.exists;
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
        await task.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS ${indexNameFromStrategy(DistanceStrategy.COSINE)} ON ${this.tableName} USING ivfflat (${this._embeddingColumn} vector_cosine_ops) WITH (lists = ${lists});`);
      } else if (dropOthers) {
        await task.query(`DROP INDEX ${CONCURRENTLY} IF EXISTS ${indexNameFromStrategy(DistanceStrategy.COSINE)};`);
      }

      if (indexes.includes(DistanceStrategy.EUCLIDEAN)) {
        await task.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS ${indexNameFromStrategy(DistanceStrategy.EUCLIDEAN)} ON ${this.tableName} USING ivfflat (${this._embeddingColumn} vector_l2_ops) WITH (lists = ${lists});`);
      } else if (dropOthers) {
        await task.query(`DROP INDEX ${CONCURRENTLY} IF EXISTS ${indexNameFromStrategy(DistanceStrategy.EUCLIDEAN)};`);
      }

      if (indexes.includes(DistanceStrategy.MAX_INNER_PRODUCT)) {
        await task.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS ${indexNameFromStrategy(DistanceStrategy.MAX_INNER_PRODUCT)} ON ${this.tableName} USING ivfflat (${this._embeddingColumn} vector_ip_ops) WITH (lists = ${lists});`);
      } else if (dropOthers) {
        await task.query(`DROP INDEX ${CONCURRENTLY} IF EXISTS ${indexNameFromStrategy(DistanceStrategy.MAX_INNER_PRODUCT)};`);
      }

    });
  }

  /**
   * Efficiently remove all rows from the table and index
   * @param task
   */
  async truncate(task?: pg.ITask<any>): Promise<void> {
    if (await this.tableExists(task)) {
      await (task || this.db).query('TRUNCATE $1', [this.tableName]);
    }
  }

  /**
   * Delete all documents based on source location(s). Should be called prior updating a document
   * in the store to ensure all previous chunks have been removed.
   * @param sourceLocations List of source locations to remove associated rows for.
   */
  async deleteBySourceLocation(...sourceLocations: string[]): Promise<void> {
    const sourceLocationsSet = new Set<string>(sourceLocations);

    if (sourceLocationsSet.size) {
      const sourceLocationValues = Array.from(sourceLocationsSet).map(v => `'${v}'`).join(', ');
      await this.db.query(`DELETE FROM ${this.tableName} WHERE ${this.embeddingsColumns.source_location} IN (${sourceLocationValues})`);
    }
  }

  async addVectors(
    vectors: number[][],
    documents: Document<Record<string, any>>[],
    _options?: { [x: string]: any } | undefined,
  ): Promise<void | string[]> {
    const rows: TableRow[] = documents.reduce((_entries, doc, i): TableRow[] => {
      const cmetadata = doc.metadata;
      const id = randomUUID();
      const source_location = cmetadata[this.embeddingsColumns.source_location] || this.defaultSourceLocation;
      const embeddings = vectors[i];
      _entries.push({
        id,
        source_location,
        document: doc.pageContent,
        cmetadata,
        embeddings,
      });
      return _entries;
    }, [] as TableRow[]);

    // list of values - (...), (...), (...)
    const values: string = rows.reduce((accum, row, i): string => {
      if (i > 0) accum += ', ';
      accum += '\n(' + pg.as.csv(row) + ')';
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
    distanceStrategy?: DistanceStrategy,
  ): Promise<[Document<Record<string, any>>, number][]> {
    distanceStrategy = this.distanceStrategy ?? DEFAULT_DISTANCE_STRATEGY;
    logger.debug({ message: 'similaritySearchVectorWithScore()', query, k, filter, distanceStrategy });

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
      Record<keyof IEmbeddingColumns | 'score', any>[]
      >;
      // https://github.com/pgvector/pgvector#distances
      switch (distanceStrategy) {
        case DistanceStrategy.COSINE: {
          queryPromise = this.db.any(
            `SELECT ${columns}, 1 - (${embeddingColumn} <=> $(embeddings)) AS score FROM ${table} ${where} ORDER BY score DESC LIMIT $(limit)`,
            values,
          );
          break;
        }
        case DistanceStrategy.MAX_INNER_PRODUCT: {
          // TODO: consider using https://github.com/pgvector/pgvector#exact-search since we enforce same vector
          queryPromise = this.db.any(
            `SELECT ${columns}, (${embeddingColumn} <#> $(embeddings)) * -1 AS score FROM ${table} ${where} ORDER BY score DESC LIMIT $(limit)`,
            values,
          );
          break;
        }
        case DistanceStrategy.EUCLIDEAN: {
          queryPromise = this.db.any(
            `SELECT ${columns}, ${embeddingColumn} <-> $(embeddings) AS score FROM ${table} ${where} ORDER BY score ASC LIMIT $(limit)`,
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
          Number(row.score),
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
