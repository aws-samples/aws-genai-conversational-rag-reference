/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { getLogger } from '@aws-galileo/galileo-sdk/lib/common';
import { MetricUnits } from '@aws-lambda-powertools/metrics';
import { IndexEntity, IndexingCache } from './datastore';
import { globDir, shardArray } from './utils';
import { resolveVectorStore } from './vectorstore';
import { WorkerReporter, indexEntities } from './worker';
import { ENV } from '../env';
import { metrics, measure, measurer } from '../metrics';

metrics.addDimension('component', 'CorpusIndexing');

const logger = getLogger('indexing');

const cache = new IndexingCache({
  tableName: ENV.INDEXING_CACHE_TABLE,
  bucketName: ENV.INDEXING_BUCKET,
  model: ENV.EMBEDDING_TABLENAME,
  baseLocalPath: ENV.PROCESSING_INPUT_LOCAL_PATH,
});

export const getInputsToIndex = measure('getInputsToIndex')(async (): Promise<IndexEntity[]> => {
  const inputPaths = await globDir(ENV.PROCESSING_INPUT_LOCAL_PATH, ENV.INDEXING_GLOB);
  const skipDeltaCheck = ENV.INDEXING_SKIP_DELTA_CHECK;
  return cache.resolveEntitiesToIndex(inputPaths, skipDeltaCheck === true);
});

async function beforeAll(): Promise<void> {
  logger.debug('Before all called');
  await resolveVectorStore();
}

async function afterAll(): Promise<void> {
  logger.debug('After all called');
  // NB: vector store indexing moved to statemachine task to prevent race conditions and competing parallel tasks
  // const vectorStore = await resolveVectorStore();

  // if (vectorStore instanceof PGVectorStore) {
  //   await vectorStore.createIndexIfNotExisting(ENV.VECTOR_INDEX_LISTS);
  // }
}

const formatNumber = new Intl.NumberFormat().format;

export const processDocumentsInParallel = async (entitiesToIndex: IndexEntity[]): Promise<void> => {
  // Since most of work is I/O related and Node v8 already optimizes I/O, we should not use actual workers/threads
  // const numWorkers = Math.ceil(os.cpus().length / 2);
  const numWorkers = ENV.INDEXING_WORKER_COUNT || 2;
  const batches = shardArray(entitiesToIndex, numWorkers);
  logger.info({
    message: `Starting parallel document processing: ${entitiesToIndex.length} total documents across ${numWorkers} workers`,
    totalDocuments: entitiesToIndex.length,
    workers: numWorkers,
  });

  metrics.addMetric('NumWorkers', MetricUnits.Count, numWorkers);

  const total = entitiesToIndex.length;
  let completed = 0;
  const reporter: WorkerReporter = {
    onEntitiesIndexed(count) {
      completed += count;
      const percentComplete = Math.round(completed / total * 100);
      logger.info(`[Progress] ${percentComplete}% (${formatNumber(completed)} / ${formatNumber(total)}`);
    },
  };

  // Create worker for each batch
  const workers = batches.map((batch) => {
    return indexEntities(batch, cache, reporter);
  });

  // Wait for all workers to finish processing
  try {
    await Promise.all(workers);

    logger.info(`Finished processing documents: ${formatNumber(total)}`);
  } catch (error) {
    console.error(error);
    logger.error('Error occurred during process', error as Error);
    throw error;
  }
};

export const main = async (): Promise<number> => {
  try {
    const stopMeasure = measurer('MainThread');
    logger.info('Main thread starting to process documents');
    const inputsToIndex = await getInputsToIndex();
    if (inputsToIndex.length === 0) {
      logger.info('Nothing to index - exiting');
      return 0;
    }

    logger.info('Running beforeAll');
    await beforeAll();

    logger.info({ message: 'Staring processing of all input documents', count: inputsToIndex.length });
    metrics.addMetric('InputDocumentCount', MetricUnits.Count, inputsToIndex.length);
    await processDocumentsInParallel(inputsToIndex);
    logger.info('Main thread successfully processed all documents');

    logger.info('Marking model in cache as indexed');
    await cache.updateModelLastExecuted();

    logger.info('Performing afterAll');
    await afterAll();

    logger.info('Successfully completed indexing');
    stopMeasure();

    return inputsToIndex.length;
  } finally {
    if (process.env.NODE_ENV !== 'test') {
      metrics.publishStoredMetrics();
    }
  }
};

if (require.main === module) {
  main()
    .then(() => {
      logger.info('Main succeeded');
    })
    .catch((error) => {
      logger.error('Main failed', error as Error);
      throw error;
    });
}
