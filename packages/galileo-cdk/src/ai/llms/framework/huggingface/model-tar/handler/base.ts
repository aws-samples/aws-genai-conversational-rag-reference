/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Logger } from '@aws-lambda-powertools/logger';
import {
  BatchGetBuildsCommand,
  CodeBuildClient,
  ProjectSource,
  StartBuildCommand,
  StartBuildCommandInput,
} from '@aws-sdk/client-codebuild';
import type {
  CdkCustomResourceEvent,
  CdkCustomResourceIsCompleteEvent,
  CdkCustomResourceIsCompleteResponse,
  CdkCustomResourceResponse,
  Context,
} from 'aws-lambda';
import { Data, ResourceProperties, MODEL_TAR_FILE } from '../types';

const logger = new Logger({ logLevel: 'DEBUG' });

const client = new CodeBuildClient();

const BUILD_PROJECT = process.env.BUILD_PROJECT;

function getArtifactBuildId(buildId: string): string {
  return buildId.split(':')[1];
}

function getArtifactBuildLocation(arn: string): string {
  // arn:aws:s3:::dev-galileofoundationmod-modeltarproviderartifact-xxx/<build_id>/<artifact_name>
  return arn.replace('arn:aws:s3:::', 's3://');
}

function getModelDataUrl(artifactLocation: string): string {
  return `${artifactLocation}/${MODEL_TAR_FILE}`;
}

export async function onEvent(
  event: CdkCustomResourceEvent,
  _context: Context,
): Promise<CdkCustomResourceResponse> {
  logger.debug({ message: 'Event:', event });

  switch (event.RequestType) {
    case 'Update':
    case 'Create': {
      const props: ResourceProperties = event.ResourceProperties as any;

      let secondarySourcesOverride: ProjectSource[] | undefined = undefined;
      if (props.CustomAsset) {
        secondarySourcesOverride = [
          {
            type: 'S3',
            sourceIdentifier: 'CustomAsset',
            location: `${props.CustomAsset.bucketName}/${props.CustomAsset.objectKey}`,
          },
        ];
      }

      const buildCommandInput: StartBuildCommandInput = {
        secondarySourcesOverride,
        projectName: BUILD_PROJECT,
        environmentVariablesOverride: [
          ...(props.EnvironmentVariables || []),
          { name: 'HF_REPO_ID', value: props.HFRepoId },
        ],
      };
      logger.debug('StartBuildCommand:Input:', { input: buildCommandInput });
      const response = await client.send(
        new StartBuildCommand(buildCommandInput),
      );

      logger.debug({ message: 'StartBuildCommand:response', response });

      const buildId = response?.build?.id;

      if (buildId == null) {
        throw new Error('Build was not successfully returned in response');
      }

      return {
        PhysicalResourceId: buildId,
        Data: {
          BuildId: buildId,
        } as Data,
      };
    }
    case 'Delete': {
      return {
        PhysicalResourceId: event.PhysicalResourceId,
        IsComplete: true,
      };
    }
  }
}

export async function isComplete(
  event: CdkCustomResourceIsCompleteEvent,
  _context: Context,
): Promise<CdkCustomResourceIsCompleteResponse> {
  logger.debug({ message: 'Event:', event });

  if (event.ResourceType === 'Delete') {
    return {
      IsComplete: true,
    };
  }

  const buildId = event.Data?.BuildId || event.PhysicalResourceId;
  logger.info(`Checking is complete status of build ${buildId}`);

  const response = await client.send(
    new BatchGetBuildsCommand({
      ids: [buildId],
    }),
  );

  logger.debug('Response', { response });

  const build = response.builds && response.builds[0];
  const buildStatus = build?.buildStatus;
  const logLink = build?.logs?.deepLink;
  logger.info(`Build Status: ${buildStatus}`);
  logger.info(`Build Log: ${logLink}`);

  switch (buildStatus) {
    case 'SUCCEEDED': {
      const artifactLocationArn = build?.artifacts?.location;

      if (artifactLocationArn == null) {
        throw new Error('Failed to resolve build artifact location');
      }

      const artifactLocation = getArtifactBuildLocation(artifactLocationArn);

      const data: Data = {
        BuildId: buildId,
        ArtifactBuildId: getArtifactBuildId(buildId),
        BuildArtifactLocationArn: artifactLocationArn,
        BuildArtifactLocation: artifactLocation,
        ModelDataUrl: getModelDataUrl(artifactLocation),
        BuildLogLink: logLink,
      };

      logger.info('Successfully built model tar', { data });

      return {
        IsComplete: true,
        Data: data,
      };
    }
    case 'FAILED':
    case 'FAULT':
    case 'STOPPED':
    case 'TIMED_OUT': {
      console.error(response);
      throw new Error(`Failed to build model tar (${buildStatus}); ${logLink}`);
    }
    default: {
      return {
        IsComplete: false,
      };
    }
  }
}
