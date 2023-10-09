/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import { Construct } from 'constructs';
import { BaseLLM, BaseLLMProps } from '../base';

export interface SageMakerLLMProps extends BaseLLMProps {
  readonly containerDefinition: sagemaker.CfnModel.ContainerDefinitionProperty;
}

export class SageMakerLLM extends BaseLLM {
  public readonly model: sagemaker.CfnModel;

  constructor(scope: Construct, id: string, props: SageMakerLLMProps) {
    super(scope, id, props);

    this.model = new sagemaker.CfnModel(this, 'Model', {
      executionRoleArn: this.role.roleArn,
      enableNetworkIsolation: true,
      primaryContainer: props.containerDefinition,
    });
  }
}
