/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { ApplicationContext } from '@aws/galileo-cdk/lib/core/app';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface NetworkingLayerProps {}

export class NetworkingLayer extends Construct {
  readonly vpc: ec2.Vpc;

  readonly vpcName: string;

  constructor(scope: Construct, id: string, _props?: NetworkingLayerProps) {
    super(scope, id);

    this.vpcName = ApplicationContext.safeResourceName(this, 'Vpc');

    this.vpc = new ec2.Vpc(this, 'VPC', {
      vpcName: this.vpcName,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          mapPublicIpOnLaunch: false,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });
  }
}
