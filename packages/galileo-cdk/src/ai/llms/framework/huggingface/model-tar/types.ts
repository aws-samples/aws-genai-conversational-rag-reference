/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import type { EnvironmentVariable } from '@aws-sdk/client-codebuild';

export const MODEL_TAR_FILE = 'model.tar.gz';

export const ARTIFACT_NAME = 'model-data';

export interface S3Location {
  readonly bucketName: string;
  readonly objectKey: string;
  readonly objectVersion?: string;
}

export interface ResourceProperties {
  /**
   * S3 Location of the custom model code to override the snapshot download.
   */
  readonly CustomAsset?: S3Location;

  /**
   * HuggingFace RepoId
   */
  readonly HFRepoId: string;

  readonly EnvironmentVariables?: EnvironmentVariable[];
}

export interface Data {
  /**
   * Fully qualified build id (`<project>:<build_id>`)
   */
  readonly BuildId: string;
  /**
   * Build id the CodeBuild used for artifact naming, which does not include project prefix.
   */
  readonly ArtifactBuildId: string;
  /**
   * Fully qualified ARN of the build artifact.
   * @example `arn:aws:s3:::dev-galileofoundationmod-modeltarproviderartifact-xxx/<build_id>/<artifact_name>`
   */
  readonly BuildArtifactLocationArn: string;
  /**
   * S3 URL of the build artifact (`s3://<bucket>/<build_id>/<artifact_name>`).
   * - This is only the folder where artifacts are output to, not path of model.tar.gz
   * @example `s3://dev-galileofoundationmod-modeltarproviderartifact-xxx/<build_id>/<artifact_name>`
   */
  readonly BuildArtifactLocation: string;
  /**
   * Model data url used for SageMaker model. This is the full S3 url of the model.tar.gz
   * file that can be passed directly to SageMaker CfnModel construct.
   * @example `s3://dev-galileofoundationmod-modeltarproviderartifact-xxx/<build_id>/<artifact_name>/model.tar.gz`
   */
  readonly ModelDataUrl: string;
  /**
   * Link to build CloudWatch logs
   */
  readonly BuildLogLink?: string;
}
