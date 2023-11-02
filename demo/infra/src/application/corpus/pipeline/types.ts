/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { DistanceStrategy } from '@aws/galileo-sdk/lib/vectorstores';
import { BucketInventoryDetails } from './handlers/inventory';

export interface S3Location {
  readonly Bucket: string;
  readonly Prefix?: string;
}

export enum IndexingStrategy {
  /**
   * Automatic will determine the strategy based on model specs and input file status (last updated vs last indexed)
   * - If model has never been indexed, it will use BULK
   * - If model has been indexed, it will use MODIFIED
   * @recommended
   * @default
   */
  AUTO = 'AUTO',
  /**
   * Index all files regardless of file and indexing status. Useful to force re-indexing all files
   * when something changes in the underlying processing job that requires updating all files.
   */
  BULK = 'BULK',
  /**
   * Introspect s3 files last modified against the last indexing time, and generate a manifest file
   * based on only the files that have not been indexed.
   * - If model has never been indexed, it will fallback to BULK
   */
  MODIFIED = 'MODIFIED',
}

export interface ClusterConfig {
  /** Indicates the number of instances for processing job */
  readonly InstanceCount: number;
  /** Indicates volume size of instance storage */
  readonly VolumeSizeInGB: number;
  /** Container instance type */
  readonly InstanceType: string;
}

export interface S3Input {
  readonly S3Uri: string;
  readonly LocalPath: string;
  readonly S3DataType: 'ManifestFile' | 'S3Prefix'; // We do not support AugmentedManifestFile
  readonly S3DataDistributionType: 'ShardedByS3Key'; // We do not support FullyReplicated as that defeats the purpose
  readonly S3InputMode: 'Pipe' | 'File';
}

export interface ExecutionStatus {
  readonly IsRunning: boolean;
}

export interface ProcessingJobConfig {
  readonly RunSagemakerJob: boolean;
  readonly RunSagemakerJobReason?: string;
  readonly ClusterConfig: ClusterConfig;
  readonly S3Input: S3Input;
  readonly InventoryDetails?: BucketInventoryDetails;
}

export interface VectorStoreManagement {
  /**
   * Will delete all entries in vector store (and cache table) for the model before indexing.
   * - Only available for AUTO and BULK strategy, and will force BULK if auto.
   * - Will fail for MODIFIED strategy
   */
  readonly PurgeData?: boolean;
  readonly IndexesToCreate?: `${DistanceStrategy}` | `${DistanceStrategy}`[];
  readonly DropOtherIndexes?: boolean;
}

export interface StateMachineIdentifier {
  readonly Id: string;
  readonly Name: string;
}

export interface State {
  /** StateMachine context value */
  readonly StateMachine: StateMachineIdentifier;
  /** Execution context value */
  readonly Execution: StateMachineIdentifier;
  /** Bucket location for files to index by the processing job */
  readonly InputBucket: S3Location;
  /** Bucket location for processing job staging, such as storing manifest files, etc. */
  readonly StagingBucket: S3Location;
  /** Base local path where sagemaker stores files in containers */
  readonly LocalPath: string;
  /** Size of the container docker image */
  readonly DockerImageSizeInGB: number;
  /** Container instance type */
  readonly InstanceType: string;
  /** Max number of containers to use for processing job */
  readonly MaxContainerInstanceCount: number;
  /** Target number of files per container */
  readonly TargetContainerFilesCount: number;
  /**
   * Max files to index in total for state machine execution. Useful for capping
   * number of files for debugging and testing purposes.
   * @development
   * @default undefined - No max
   */
  readonly MaxInputFilesToProcess?: number;
  /** Environment variables (for ) */
  readonly Environment: Record<string, string>;
  /** Indexing strategy */
  readonly IndexingStrategy?: IndexingStrategy;
  readonly VectorStoreManagement?: VectorStoreManagement;
  /**
   * Date string to perform modified since filtering. Use for for testing / override of the default
   * model execution status details.
   * @default undefined - Derived from the last execution time of the model
   */
  readonly ModifiedSince?: string;
  /**
   * Number of minutes required between subsequent executions.
   * - If previous execution was completed less than the delay, the state machine will cancel.
   * - If `-1`, the delay check will be disabled and let any delay window execute
   * @default 30 - Thirty minutes
   */
  readonly SubsequentExecutionDelay?: number;

  /**
   * Status regarding state machine execution
   * @task IsRunning
   */
  readonly ExecutionStatus?: ExecutionStatus;

  /**
   * Configuration for the sage maker processing job task
   * @task ProcessingJobConfig
   */
  readonly ProcessingJobConfig?: ProcessingJobConfig;
}

export const StatePaths = {
  ExecutionStatus: '$.ExecutionStatus',
  IsRunning: '$.ExecutionStatus.IsRunning',
  ProcessingJobConfig: '$.ProcessingJobConfig',
  ClusterConfig: '$.ProcessingJobConfig.ClusterConfig',
  Environment: '$.Environment',
  DoRunProcessingJob: '$.ProcessingJobConfig.RunSagemakerJob',
  S3Input: '$.ProcessingJobConfig.S3Input',
} as const;
