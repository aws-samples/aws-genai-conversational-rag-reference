/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { LLAMA2_ADAPTER, LLAMA2_ENDPOINT_KWARGS, LLAMA2_KWARGS } from '@aws/galileo-sdk/lib/models/llms/meta';
import { CfnMapping, Stack } from 'aws-cdk-lib';
import { Construct, IConstruct } from 'constructs';
import { BaseLLMProps } from '../../framework';
import { SageMakerLLM } from '../../framework/sagemaker';

export const LLAMA2_13B_SAGEMAKER_PACKAGE_ARN = {
  'ap-southeast-1':
    'arn:aws:sagemaker:ap-southeast-1:192199979996:model-package/llama2-13b-v4-c4de6690de6132cb962827bec6ef6811',
  'ap-southeast-2':
    'arn:aws:sagemaker:ap-southeast-2:666831318237:model-package/llama2-13b-v4-c4de6690de6132cb962827bec6ef6811',
  'eu-west-1': 'arn:aws:sagemaker:eu-west-1:985815980388:model-package/llama2-13b-v4-c4de6690de6132cb962827bec6ef6811',
  'us-east-1': 'arn:aws:sagemaker:us-east-1:865070037744:model-package/llama2-13b-v4-c4de6690de6132cb962827bec6ef6811',
  'us-east-2': 'arn:aws:sagemaker:us-east-2:057799348421:model-package/llama2-13b-v4-c4de6690de6132cb962827bec6ef6811',
  'us-west-2': 'arn:aws:sagemaker:us-west-2:594846645681:model-package/llama2-13b-v4-c4de6690de6132cb962827bec6ef6811',
} as const;

export function resolveLlama2Base13BPackageArn(scope: IConstruct): string {
  return new CfnMapping(scope, 'Llama2Base13BPackageMapping', {
    lazy: true,
    mapping: Object.fromEntries(Object.entries(LLAMA2_13B_SAGEMAKER_PACKAGE_ARN).map(([key, arn]) => [key, { arn }])),
  }).findInMap(Stack.of(scope).region, 'arn');
}

export interface Llama2Base13BSageMakerProps extends BaseLLMProps {}

export class Llama2Base13BSageMaker extends SageMakerLLM {
  constructor(scope: Construct, id: string, props: Llama2Base13BSageMakerProps) {
    super(scope, id, {
      ...props,
      instanceType: props.instanceType ?? 'ml.g5.12xlarge',
      containerDefinition: {
        modelPackageName: resolveLlama2Base13BPackageArn(scope),
      },
      adapter: LLAMA2_ADAPTER,
      modelKwargs: LLAMA2_KWARGS,
      endpointKwargs: LLAMA2_ENDPOINT_KWARGS,
    });
  }
}
