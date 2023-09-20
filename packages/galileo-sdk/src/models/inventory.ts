/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { SecretsProvider } from '@aws-lambda-powertools/parameters/secrets';
import { resolveFoundationModelCredentials } from './cross-account.js';
import { FOUNDATION_MODEL_INVENTORY_SECRET } from './env.js';
import { IModelInfo } from './types.js';
import { env } from '../common/env.js';
import { getLogger } from '../common/logging/index.js';

const logger = getLogger(__filename);

export interface IModelInfoProvider {
  readonly modelInfo: IModelInfo;
}

export function isModelInfoProvider (value: any): value is IModelInfoProvider {
  return 'modelInfo' in value;
}

export type FoundationModelRecord = { [modelId: string]: IModelInfo };

export interface IFoundationModelInventory {
  readonly models: FoundationModelRecord;
  readonly defaultModelId: string;
}


export class FoundationModelInventory {
  static async inventory(): Promise<IFoundationModelInventory> {
    if (FoundationModelInventory.__INVENTORY__ == null) {
      let config = env(FOUNDATION_MODEL_INVENTORY_SECRET);
      if (config == null) {
        throw new Error(`Env ${FOUNDATION_MODEL_INVENTORY_SECRET} is undefined`);
      }
      logger.info({ message: 'Config value', value: config });

      if (config.startsWith('{')) {
        const parsed = JSON.parse(config);
        FoundationModelInventory.__INVENTORY__ = parsed.models || parsed;
      } else {
        const secretsProvider = new SecretsProvider({
          clientConfig: {
            region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
            credentials: resolveFoundationModelCredentials(),
          },
        });
        const value = await secretsProvider.get(config, {
          maxAge: 300,
          transform: 'json',
        });
        FoundationModelInventory.__INVENTORY__ = value as unknown as IFoundationModelInventory;
      }

      logger.info({ message: 'Resolved inventory', inventory: FoundationModelInventory.__INVENTORY__ });
    }

    return FoundationModelInventory.__INVENTORY__!;
  }

  static async modelIds(): Promise<string[]> {
    return Object.keys(await this.inventory());
  }

  static async getModel(modelId: string): Promise<IModelInfo> {
    const model = (await this.inventory()).models[modelId];
    if (model == null) {
      throw new Error(`Model ${modelId} not defined in the inventory`);
    }
    return model;
  }

  static async getModelOrDefault(modelId?: string): Promise<IModelInfo> {
    modelId ??= (await this.inventory()).defaultModelId;
    return this.getModel(modelId);
  }

  private static __INVENTORY__?: IFoundationModelInventory;

}
