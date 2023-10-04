/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  BucketProps,
} from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import { getRootStack, isDevStage, stageAwareRemovalPolicy } from '../../utils';

export interface SecureBucketProps extends BucketProps {
  /**
   * Disable automatically creating serer access logs.
   * - If explicit `serverAccessLogsBucket` and/or `serverAccessLogsPrefix` are defined, this is ignored
   * and will use the default behavior of Bucket regarding server access logs.
   * - If `true`, the `disableServerAccessLogsReason` property must be defined.
   * @default false
   */
  readonly disableServerAccessLogs?: boolean;
  /**
   * Reason why server access logs are disabled, which will result in NagSuppression being added.
   * - Required if `disableServerAccessLogs` is `true`
   */
  readonly disableServerAccessLogsReason?: string;
}

export class SecureBucket extends Bucket {
  static readonly SERVER_ACCESS_LOGS_BUCKET_UUID =
    'SecureBucket-ServerAccessLogs_TEBvxboJ5D';

  static serverAccessLogsOf(scope: IConstruct): SecureBucket {
    const rootStack = getRootStack(scope);
    const existing = rootStack.node.tryFindChild(
      SecureBucket.SERVER_ACCESS_LOGS_BUCKET_UUID,
    ) as SecureBucket | undefined;
    if (existing) {
      return existing;
    }

    return new SecureBucket(
      rootStack,
      SecureBucket.SERVER_ACCESS_LOGS_BUCKET_UUID,
      {
        disableServerAccessLogs: true,
        disableServerAccessLogsReason:
          'Access logging bucket does not require access logging',
      },
    );
  }

  constructor(scope: Construct, id: string, props?: SecureBucketProps) {
    const dev = isDevStage(scope);

    super(scope, id, {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      // auto delete bucket and objects for dev stage
      autoDeleteObjects: dev,
      removalPolicy: stageAwareRemovalPolicy(scope),
      ...props,
      serverAccessLogsBucket:
        props?.serverAccessLogsBucket ?? props?.disableServerAccessLogs
          ? undefined
          : SecureBucket.serverAccessLogsOf(scope),
      serverAccessLogsPrefix:
        props?.serverAccessLogsPrefix ?? props?.disableServerAccessLogs
          ? undefined
          : `${scope.node.path}/${id}/server-access-logs/`,
    });

    if (
      !props?.serverAccessLogsBucket &&
      !props?.serverAccessLogsPrefix &&
      props?.disableServerAccessLogs
    ) {
      const reason = props.disableServerAccessLogsReason;
      if (reason == null) {
        throw new Error(
          'SecureBucket requires a reason for disabling server access logs: `disableServerAccessLogsReason`',
        );
      }
      NagSuppressions.addResourceSuppressions(
        this,
        [
          {
            id: 'AwsPrototyping-S3BucketLoggingEnabled',
            reason,
          },
        ],
        true,
      );
    }
  }
}
