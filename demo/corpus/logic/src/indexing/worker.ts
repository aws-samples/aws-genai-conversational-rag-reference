/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import fs from 'node:fs/promises';
import { getLogger } from '@aws/galileo-sdk/lib/common';
import { PGVectorStore } from '@aws/galileo-sdk/lib/vectorstores';
import { MetricUnits } from '@aws-lambda-powertools/metrics';
import { Document } from 'langchain/document';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { IndexEntity, IndexingCache } from './datastore';
import { chunkArray } from './utils';
import { resolveVectorStore } from './vectorstore';
import { ENV } from '../env';
import { measure, metrics } from '../metrics';

const logger = getLogger('indexing/worker');

const BATCH_SIZE = ENV.INDEXING_WORKER_BATCH_SIZE || 500;
const INSERT_MAX = ENV.INDEXING_VECTORSTOR_INSERT_MAX || 1000;

const CHUNK_SIZE = ENV.CHUNK_SIZE ?? 1000;
const CHUNK_OVERLAP = ENV.CHUNK_OVERLAP ?? 200;

logger.info('Configurations', { BATCH_SIZE, INSERT_MAX, CHUNK_SIZE, CHUNK_OVERLAP });

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

export interface WorkerReporter {
  onEntitiesIndexed(count: number): void;
}

export async function readFile(file: string): Promise<string> {
  return fs.readFile(file, { encoding: 'utf-8' });
}

export async function entityToDocuments(entity: IndexEntity): Promise<Document[]> {
  const text = await readFile(entity.localPath);
  const texts = await textSplitter.splitText(text);

  metrics.addMetric('DocumentChunkCount', MetricUnits.Count, texts.length);

  return texts.map((_text, _i) => {
    return new Document({
      pageContent: _text,
      metadata: {
        ...entity.metadata,
        source_location: entity.sourceLocation,
        section_index: _i,
      },
    });
  });
}

export async function indexEntities(entitiesToIndex: IndexEntity[], cache: IndexingCache, reporter: WorkerReporter) {
  logger.debug({ message: `Indexing ${entitiesToIndex.length} entities`, count: entitiesToIndex.length });
  const vectorStore = await resolveVectorStore();

  // delete all entities from store before indexing to perform document updates processing
  if (vectorStore instanceof PGVectorStore) {
    const sourceLocations = entitiesToIndex.map((v) => v.sourceLocation);
    await vectorStore.deleteBySourceLocation(...sourceLocations);
  }

  // process documents in batches
  const batches = chunkArray(entitiesToIndex, BATCH_SIZE);
  for (const batch of batches) {
    const allDocuments = (await Promise.all(batch.map(entityToDocuments))).flat();
    logger.info(`Derived ${allDocuments.length} documents from ${entitiesToIndex.length} files`);

    // Process document inserts in batches
    // a single "document" might be spread across multiple "insert batches"
    // so can not clean up a "document" in the vectorstore operation at this stage,
    // which is why we do it above before chunking
    const documentsChunk = chunkArray(allDocuments, INSERT_MAX);
    for (const documents of documentsChunk) {
      logger.info(`Inserting ${documents.length} documents into vector store`);
      await measure('VectorStore_addDocuments')(vectorStore.addDocuments(documents));
    }

    await measure('VectorStore_updateLastIndexed')(cache.updateLastIndexed(batch.map((v) => v.sourceLocation)));

    reporter.onEntitiesIndexed(batch.length);
  }
}
