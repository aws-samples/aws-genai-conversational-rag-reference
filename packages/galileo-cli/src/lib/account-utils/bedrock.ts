/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import execa from 'execa';
import { CredentialsParams } from '../types';

export enum BedrockModality {
  TEXT = 'TEXT',
  EMBEDDING = 'EMBEDDING',
  IMAGE = 'IMAGE',
}

export enum BedrockCustomizationSupport {
  FINE_TUNING = 'FINE_TUNING',
}

export enum BedrockInferenceTypesSupported {
  ON_DEMAND = 'ON_DEMAND',
}

export interface BedrockModelSummary {
  /* The ARN of the foundation model. */
  readonly modelArn: string;

  /** The model Id of the foundation model. */
  readonly modelId: string;

  /** The name of the model. */
  readonly modelName: string;

  /** The model's provider name. */
  readonly providerName: string;

  /** The input modalities that the model supports. */
  readonly inputModalities: BedrockModality[];

  /** The output modalities that the model supports. */
  readonly outputModalities: BedrockModality[];

  /** Indicates whether the model supports streaming. */
  readonly responseStreamingSupported: boolean;

  /** Whether the model supports fine - tuning or continual pre - training. */
  readonly customizationsSupported: string[];

  /** The inference types that the model supports. */
  readonly inferenceTypesSupported: string[];
}

export async function listBedrockModels({
  profile,
  region,
}: Required<CredentialsParams>): Promise<BedrockModelSummary[]> {
  const response = JSON.parse(
    (await execa.command(`aws --region ${region} --profile ${profile} --output json bedrock list-foundation-models`))
      .stdout,
  );
  return response.modelSummaries as BedrockModelSummary[];
}

export async function listBedrockTextModels(options: Required<CredentialsParams>): Promise<BedrockModelSummary[]> {
  const models = await listBedrockModels(options);
  return models.filter((v) => {
    const modalities = new Set<string>([...v.inputModalities, ...v.outputModalities]);
    return modalities.size === 1 && modalities.has(BedrockModality.TEXT);
  });
}
