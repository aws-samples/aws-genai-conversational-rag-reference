/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { ApplicationConfig } from './types';
import { BEDROCK_REGION } from '../../../ai/llms/framework/bedrock/constants';
import { FoundationModelIds } from '../../../ai/predefined/ids';
// NB: Do not import unnecessary deps there as the cli current use this and
// just needs the ids - otherwise will break cli typecheck build

export const DEFAULT_APPLICATION_NAME = 'Galileo';

export const DEFAULT_APPLICATION_CONFIG: ApplicationConfig = {
  app: {
    name: DEFAULT_APPLICATION_NAME,
  },
  chat: {
    // TODO: we should default to none to be generic, and domain should probably be from the "workspace"
    domain: 'Legal',
  },
  identity: {},
  bedrock: {
    enabled: true,
    region: BEDROCK_REGION,
    models: [],
  },
  llms: {
    defaultModel: FoundationModelIds.FALCON_LITE,
    predefined: {
      sagemaker: [FoundationModelIds.FALCON_LITE],
    },
  },
  rag: {
    // TODO: placeholder for when we support multiple rag engines
    //   engines: {
    //     aurora: {
    //       enabled: true,
    //     },
    //   },
    // TODO: placeholder for followup PR to define embedding models in config
    //   embeddingsModels: [
    //     {
    //       provider: 'sagemaker',
    //       dimensions: 768,
    //       name: 'sentence-transformers/all-mpnet-base-v2',
    //       default: true,
    //     },
    //   ],
  },
};
