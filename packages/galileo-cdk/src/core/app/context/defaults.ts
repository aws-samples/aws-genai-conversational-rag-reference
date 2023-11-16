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
    managedEmbeddings: {
      instanceType: 'ml.g4dn.xlarge',
      embeddingsModels: [
        {
          // matching the current name used in database for our default model to prevent breaking existing data.
          uuid: 'all-mpnet-base-v2',
          modelId: 'sentence-transformers/all-mpnet-base-v2',
          dimensions: 768,
          default: true,
        },
        // {
        //   uuid: 'intfloat/multilingual-e5-large',
        //   modelId: 'intfloat/multilingual-e5-large',
        //   dimensions: 1024,
        // },
        // {
        //   uuid: 'sentence-transformers/all-MiniLM-L6-v2',
        //   modelId: 'sentence-transformers/all-MiniLM-L6-v2',
        //   dimensions: 384,
        // },
      ],
    },
    indexing: {
      pipeline: {
        instanceType: 'ml.t3.large',
        maxInstanceCount: 5,
        createVectorStoreIndexes: false,
      },
    },
  },
};
