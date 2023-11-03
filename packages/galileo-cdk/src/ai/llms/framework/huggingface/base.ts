/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Stack } from 'aws-cdk-lib';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import { Construct } from 'constructs';
import { BaseLLM, BaseLLMProps } from '../base';
import { getImageUriRepository } from '../utils';

export interface HuggingFaceModelId {
  readonly repoId: string;
  readonly tag: string;
}

export interface HuggingFaceModelProps extends BaseLLMProps {
  readonly image: HuggingFaceModelId | string;
  readonly modelDataUrl?: string;
  readonly environment?: Record<string, string>;
}

export class HuggingFaceModel extends BaseLLM {
  readonly model: sagemaker.CfnModel;

  constructor(scope: Construct, id: string, props: HuggingFaceModelProps) {
    super(scope, id, props);

    let image: string;
    if (typeof props.image === 'string') {
      image = props.image;
    } else {
      const repository = getImageUriRepository(this.region, props.image.repoId);
      image = `${repository}:${props.image.tag}`;
    }

    this.model = new sagemaker.CfnModel(this, 'Model', {
      executionRoleArn: this.role.roleArn,
      primaryContainer: {
        image,
        modelDataUrl: props.modelDataUrl,
        mode: 'SingleModel',
        environment: {
          SAGEMAKER_CONTAINER_LOG_LEVEL: '20',
          SAGEMAKER_REGION: Stack.of(scope).region,
          ...props.environment,
        },
      },
    });
  }
}
