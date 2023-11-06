/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import middy from '@middy/core';
import errorLogger from '@middy/error-logger';
import inputOutputLogger from '@middy/input-output-logger';
import { ENV } from 'corpus-logic/lib/env';
import { IndexingCache } from 'corpus-logic/lib/indexing/datastore';
import { ClusterConfig, IndexingStrategy, ProcessingJobConfig, S3Input, State } from '../../types';
import { getBucketInventory, saveBucketInventoryManifest } from '../inventory';

const VOLUME_SIZE_RATIO = 1.5; // extra space for processing

const logger = new Logger();

function bytesToMB(bytes: number): number {
  if (bytes === 0) return 0;
  return bytes / 1024 / 1024;
}

function bytesToGB(bytes: number): number {
  if (bytes === 0) return 0;
  return bytes / 1024 / 1024 / 1024;
}

async function lambdaHandler(state: State): Promise<Partial<ProcessingJobConfig>> {
  logger.info('State:', { state });

  logger.info({ message: 'corpus-logic env', env: ENV });

  const cache = new IndexingCache({
    tableName: ENV.INDEXING_CACHE_TABLE,
    model: ENV.EMBEDDING_TABLENAME,
    bucketName: state.InputBucket.Bucket,
    baseLocalPath: state.LocalPath,
  });

  let strategy = state.IndexingStrategy;

  if (state.VectorStoreManagement?.PurgeData) {
    if (strategy === IndexingStrategy.MODIFIED) {
      throw new Error('PurgeData is not allowed for MODIFIED strategy');
    }
    strategy = IndexingStrategy.BULK;
    await cache.resetCache();
  }

  const lastExecuted = await cache.getModelLastExecuted();

  // If never executed, force bulk
  if (lastExecuted == null) {
    strategy = IndexingStrategy.BULK;
  }
  // If auto, determine strategy based on execution has run before
  if (strategy === IndexingStrategy.AUTO) {
    strategy = lastExecuted ? IndexingStrategy.MODIFIED : IndexingStrategy.BULK;
  }

  const delay = state.SubsequentExecutionDelay ?? 30;

  if (delay <= 0) {
    logger.info('SubsequentExecutionDelay check is disabled (-1)');
  } else if (lastExecuted && lastExecuted.getTime() + delay * 60 * 1000 > Date.now()) {
    // Only allow running the execution every x minutes, otherwise cancel
    return {
      RunSagemakerJob: false,
      RunSagemakerJobReason: `Cancel running job since already run within ${delay} minutes: ${lastExecuted.toISOString()}`,
    };
  }

  // Set filter since for non-bulk strategy
  const since = state.ModifiedSince
    ? new Date(state.ModifiedSince)
    : strategy === IndexingStrategy.BULK
    ? undefined
    : lastExecuted;

  const inventory = await getBucketInventory(state.InputBucket.Bucket, state.InputBucket.Prefix, {
    since,
    maxFiles: state.MaxInputFilesToProcess,
  });

  logger.info(`Inventory: ${inventory.count} total files, ${inventory.size}, since ${since}`, {
    details: inventory.getDetails(),
  });

  if (inventory.count === 0) {
    return {
      RunSagemakerJob: false,
      RunSagemakerJobReason: 'No files to index, canceling processing job',
      InventoryDetails: inventory.getDetails(),
    };
  }

  // S3 input settings
  let s3Input: S3Input;
  if (strategy === IndexingStrategy.BULK) {
    // need to manage prefix for bulk if defined
    const prefix = (state.InputBucket.Prefix ?? '').replace(/^\\/, '');

    s3Input = {
      LocalPath: state.LocalPath + prefix,
      S3Uri: `s3://${state.InputBucket.Bucket}/${prefix}`,
      S3DataDistributionType: 'ShardedByS3Key',
      S3DataType: 'S3Prefix',
      S3InputMode: 'File',
    };
  } else {
    // Further filter inventory based on last indexed status for each object
    let includeSet: Set<string> | undefined = undefined;
    if (lastExecuted) {
      const lastIndexedFiltered = await cache.filterS3KeysByLastIndexedSince(
        inventory.contents.map((v) => v.Key),
        lastExecuted,
      );
      if (lastIndexedFiltered.length === 0) {
        return {
          RunSagemakerJob: false,
          RunSagemakerJobReason: 'No files to index after last indexed filter, canceling processing job',
          InventoryDetails: inventory.getDetails(),
        };
      }

      includeSet = new Set<string>(lastIndexedFiltered);
    }

    const manifestUri = await saveBucketInventoryManifest(
      inventory,
      state.StagingBucket.Bucket,
      `${state.StagingBucket.Prefix || ''}/${state.StateMachine.Name}/${state.Execution.Name}/manifest.json`,
      includeSet,
    );

    s3Input = {
      LocalPath: state.LocalPath,
      S3Uri: manifestUri,
      S3DataDistributionType: 'ShardedByS3Key',
      S3DataType: 'ManifestFile',
      S3InputMode: 'File',
    };
  }

  // Cluster config settings
  const instanceCount = Math.min(
    state.MaxContainerInstanceCount,
    Math.ceil(inventory.count / state.TargetContainerFilesCount),
  );
  const instanceContentGB = Math.min(1, bytesToGB(inventory.bytes / instanceCount));
  const clusterConfig: ClusterConfig = {
    InstanceCount: Math.max(1, instanceCount),
    InstanceType: state.InstanceType,
    // volume size needs to include the docker image + space for the sharded files for the container
    // Add extra space based on ratio to ensure enough space for processing
    VolumeSizeInGB: Math.ceil((state.DockerImageSizeInGB + instanceContentGB) * VOLUME_SIZE_RATIO),
  };

  return {
    RunSagemakerJob: true,
    ClusterConfig: clusterConfig,
    S3Input: s3Input,
    InventoryDetails: inventory.getDetails(),
  };
}

export const handler = middy<State, {}, Error, any>(lambdaHandler)
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(inputOutputLogger())
  .use(
    errorLogger({
      logger(error) {
        logger.error('Task failed with error:', error as Error);
      },
    }),
  );

export default handler;
