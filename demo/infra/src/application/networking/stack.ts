/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Stack, StackProps } from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { IConstruct } from 'constructs';
import { NetworkingLayer } from './layer';

export interface NetworkingStackProps extends StackProps {}

export class NetworkingStack extends Stack {
  readonly layer: NetworkingLayer;

  get vpc(): IVpc {
    return this.layer.vpc;
  }

  constructor(scope: IConstruct, id: string, props?: NetworkingStackProps) {
    super(scope, id, props);

    this.layer = new NetworkingLayer(this, 'Layer');
  }
}
