/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { IAspect, Stack } from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { IConstruct } from 'constructs';

export class GalileoNagSupression implements IAspect {
  visit(node: IConstruct): void {
    if (Stack.isStack(node)) {
      NagSuppressions.addStackSuppressions(
        node,
        [
          {
            id: 'AwsPrototyping-IAMNoWildcardPermissions',
            reason:
              'Service specific action wildcard appendix matches allow list (example `s3:GetObject*`)',
            appliesTo: [{ regex: '/^Action::[^*]+:[^*]{3,}\\*$/g' }],
          },
          {
            id: 'AwsPrototyping-IAMNoWildcardPermissions',
            reason:
              'Dynamic Arn resource with wildcard resource name (example `<Resource.Arn>/*`)',
            appliesTo: [{ regex: '/^Resource::<.*\\.Arn>[:/].*\\*/g' }],
          },
          {
            id: 'AwsPrototyping-IAMNoWildcardPermissions',
            reason:
              'Arn resource with at least 4 non-wildcard segments before wildcard',
            appliesTo: [{ regex: '/^Resource::arn:([^*]+[:/]){4,}.*$/gu' }],
          },
          {
            id: 'AwsPrototyping-IAMNoWildcardPermissions',
            reason:
              'Intrinsic function used for resource (example `arn:{"Fn::Select...`)',
            appliesTo: [{ regex: "/^Resource::arn:{(\"|')Fn::.*$/g" }],
          },
        ],
        true,
      );
    }

    if (node.node.id.startsWith('Custom::CDKBucketDeployment')) {
      NagSuppressions.addResourceSuppressions(
        node,
        [
          {
            id: 'AwsPrototyping-IAMNoManagedPolicies',
            reason:
              'Bucket deployment lambda uses basic execution policy for writing to cloudwatch logs',
          },
          {
            id: 'AwsPrototyping-IAMNoWildcardPermissions',
            reason:
              'Bucket deployment writes arbitrary data to S3 (ie key not known until deploy time)',
          },
          {
            id: 'AwsPrototyping-LambdaLatestVersion',
            reason:
              'Bucket deployment uses older lambda runtime outside of our control',
          },
        ],
        true,
      );
      return;
    }

    if (node instanceof cr.Provider) {
      [
        node.onEventHandler.role,
        node.isCompleteHandler?.role,
        node.node.tryFindChild('framework-onEvent'),
        node.node.tryFindChild('framework-isComplete'),
        node.node.tryFindChild('framework-onTimeout'),
        node.node.tryFindChild('waiter-state-machine'),
      ].forEach((resource?: any) => {
        resource &&
          NagSuppressions.addResourceSuppressions(
            resource,
            [
              {
                id: 'AwsPrototyping-IAMNoManagedPolicies',
                reason:
                  'CDK CustomResource Provider resource used for deployment purposes',
              },
              {
                id: 'AwsPrototyping-IAMNoWildcardPermissions',
                reason:
                  'CDK CustomResource Provider resource used for deployment purposes',
              },
            ],
            true,
          );
      });
    }
  }
}
