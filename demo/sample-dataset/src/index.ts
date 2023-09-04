/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  Stack,
  StackProps,
  Size,
  Tags,
  CfnOutput,
} from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cr from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';

enum MetadataKeys {
  AssetKeyPrefix = 'AssetKeyPrefix',
}

export interface SampleDatasetStackProps extends StackProps {
  /** Bucket where sample dataset is uploaded */
  readonly destinationBucketArn: string;
  /** Object prefix in the destination bucket where dataset is uploaded */
  readonly destinationKeyPrefix?: string;
  /**
   * Arn of the StateMachine to run ETL on corpus data which will split, embeddings, and insert vectors
   * into the vector store for all files stored in the destination bucket.
   * - If defined, the trigger will be run automatically with deployment.
   */
  readonly corpusEtlStateMachineArn?: string;
}

export class SampleDatasetStack extends Stack {
  constructor(scope: Construct, id: string, props: SampleDatasetStackProps) {
    super(scope, id);

    const destinationBucket = Bucket.fromBucketArn(this, 'DestinationBucket', props.destinationBucketArn);

    const size = Size.gibibytes(1);

    const assetsDir = path.join(__dirname, '..', 'generated', 'assets');
    let role: iam.Role | undefined;
    const deployments: s3deploy.BucketDeployment[] = [];

    // HACK: prevent BucketDeployment from adding tags to destinationBucket
    const _tagsOf = Tags.of;
    Tags.of = (_scope: IConstruct): Tags => {
      if (_scope === destinationBucket) {
        return {
          add: () => {},
        } as any;
      }
      return _tagsOf(_scope);
    };

    try {
      for (const entity of fs.readdirSync(assetsDir, { withFileTypes: true })) {
        if (entity.isFile() && path.extname(entity.name) === '.zip') {
          const assetZipPath = path.join(assetsDir, entity.name);
          const metadataFile = `${assetZipPath}.metadata`;
          const metadata: Record<string, string> = fs.existsSync(metadataFile)
            ? JSON.parse(fs.readFileSync(metadataFile, { encoding: 'utf-8' }))
            : {};

          if (metadata[MetadataKeys.AssetKeyPrefix] == null) {
            throw new Error(
              `Missing metadata file with required ${MetadataKeys.AssetKeyPrefix} property: ${metadataFile}`,
            );
          }

          const assetKeyPrefix: string = path.join(
            props.destinationKeyPrefix || '/',
            metadata[MetadataKeys.AssetKeyPrefix] || '',
          );
          metadata[MetadataKeys.AssetKeyPrefix] = assetKeyPrefix;

          const deployment = new s3deploy.BucketDeployment(
            this,
            `Dataset_${entity.name}`,
            {
              destinationBucket,
              destinationKeyPrefix: assetKeyPrefix.replace(/^\//, ''),
              sources: [s3deploy.Source.asset(assetZipPath)],
              metadata: normalizeMetadata(metadata),
              // remove root slash as it causes extra nested folder names "/"
              memoryLimit: size.toMebibytes(),
              ephemeralStorageSize: size,
              // Must be false because out zips (parallel deployments) share same dest, they will be fighting over the space otherwise
              prune: false,
              role,
            },
          );

          NagSuppressions.addResourceSuppressions(
            deployment,
            [
              {
                id: 'AwsPrototyping-LambdaLatestVersion',
                reason: 'Deployment resource lambeda version beyond our control',
              },
            ],
            true,
          );
          deployments.push(deployment);

          // @ts-ignore - private
          role = deployment.handlerRole;
        } else if (
          !entity.name.startsWith('.') &&
          !entity.name.endsWith('.metadata')
        ) {
          throw new Error(
            `Only zip file assets can be uploaded for dataset: found ${entity.name}`,
          );
        }
      }
    } catch (error) {
      console.error(
        `Failed to generate BucketDeployment for dataset assets: ${assetsDir}`,
        error,
      );
      console.warn(
        `[Tip] Try deleting the ${assetsDir} directory and rebuilding`,
      );
      throw error;
    }

    // HACK: reset Tags.of
    Tags.of = _tagsOf;

    // Slow down the process a bit to prevent rate limits
    addDependencies(deployments, 5);

    // By adding this "aws-cdk:cr-owned:*" formatted tag to destination bucket
    // we prevent BucketDeployment from pruning or deleting anything in the bucket
    Tags.of(destinationBucket).add('aws-cdk:cr-owned:galileo', 'true');

    if (props.corpusEtlStateMachineArn) {
      const trigger = new cr.AwsCustomResource(this, 'CorpusStateMachineExecution', {
        // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sfn/command/StartExecutionCommand/
        onUpdate: {
          service: 'StepFunctions',
          action: 'startExecution',
          parameters: {
            stateMachineArn: props.corpusEtlStateMachineArn,
          },
          physicalResourceId: cr.PhysicalResourceId.fromResponse('executionArn'),
        },
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
          resources: [props.corpusEtlStateMachineArn],
        }),
      });
      // make sure it is executed after all deployments have completed
      deployments.forEach((_deployment) => trigger.node.addDependency(_deployment));

      const executionArn = trigger.getResponseFieldReference('executionArn').toString();

      new CfnOutput(this, 'CorpusStateMachineExecutionArn', {
        value: executionArn,
      });

      new CfnOutput(this, 'CorpusStateMachineExecutionConsoleUrl', {
        value: `https://${this.region}.console.aws.amazon.com/states/home?region=${this.region}#/v2/executions/details/${executionArn}`,
      });
    }
  }
}

// Ensure that
function addDependencies(resources: Construct[], concurrency: number): void {
  const chunks: Construct[][] = [];

  // Split resources into chunks
  for (let i = 0; i < resources.length; i += concurrency) {
    chunks.push(resources.slice(i, i + concurrency));
  }

  // Iterate through each chunk
  for (let i = 1; i < chunks.length; i++) {
    const currentChunk = chunks[i];
    const previousChunk = chunks[i - 1];

    // Add dependency from resources in current chunk to resources in previous chunk
    for (let _i = 0; _i < currentChunk.length; _i++) {
      previousChunk[_i] &&
        currentChunk[_i].node.addDependency(previousChunk[_i]);
    }
  }
}

function normalizeMetadata(
  metadata: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => {
      const kebabKey = key
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^a-zA-Z0-0]+/g, '-');
      return [kebabKey, value];
    }),
  );
}
