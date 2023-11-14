/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { BaseLanguageModel } from 'langchain/base_language';
import { Bedrock } from 'langchain/llms/bedrock';
import { SageMakerEndpoint } from 'langchain/llms/sagemaker_endpoint';
import { PromptTemplate } from 'langchain/prompts';
import { merge } from 'lodash';
import { getLogger } from '../common/index.js';
import { ModelAdapter } from '../models/adapter.js';
import { DEFAULT_MAX_NEW_TOKENS } from '../models/constants.js';
import { resolveFoundationModelCredentials } from '../models/cross-account.js';
import { FoundationModelInventory } from '../models/index.js';
import { resolveModelAdapter } from '../models/llms/utils.js';
import { IModelInfo, Kwargs, isBedrockFramework, isSageMakerEndpointFramework } from '../models/types.js';
import { resolvePromptTemplateByChainType } from '../prompt/templates/store/resolver.js';
import { PromptRuntime } from '../prompt/types.js';
import { ChainType } from '../schema/index.js';
import { omitManagedBedrockKwargs } from '../utils/bedrock.js';

const logger = getLogger('chat/adapter');

export interface ResolvedLLM {
  llm: BaseLanguageModel;
  modelInfo: IModelInfo;
  adapter: ModelAdapter;
}

export type ResolvableModelInfo = string | IModelInfo | Partial<IModelInfo>;

export class ChatEngineContext {
  static async resolveModelInfo(modelInfo: ResolvableModelInfo | undefined): Promise<IModelInfo> {
    logger.info('Resolve model info', { modelInfo: modelInfo ?? 'DEFAULT' });

    if (typeof modelInfo === 'string' && modelInfo.startsWith('{')) {
      // Model info defines a custom model that is not deployed with the solution, or override for deployed model
      modelInfo = JSON.parse(modelInfo) as Partial<IModelInfo>;
      logger.info('Custom ModelInfo received', { modelInfo });
    }

    if (typeof modelInfo === 'object' && !modelInfo.uuid) {
      logger.info('No need to resolve model info as partial config received without uuid', { modelInfo });
      // uuid is missing, but that is ok as is only needed for resolve from inventory
      return modelInfo as IModelInfo;
    }

    const uuid = modelInfo == null ? undefined : typeof modelInfo === 'string' ? modelInfo : modelInfo.uuid;
    const resolved = await FoundationModelInventory.getModelOrDefault(uuid);

    modelInfo = typeof modelInfo === 'object' ? (merge({}, resolved, modelInfo) as IModelInfo) : resolved;
    logger.info('Resolving model info from inventory', { uuid, modelInfo, resolved });
    return modelInfo as IModelInfo;
  }

  static async resolveLLM(
    modelInfo?: IModelInfo,
    options?: { verbose?: boolean; modelKwargs?: Kwargs; endpointKwargs?: Kwargs },
  ): Promise<ResolvedLLM> {
    modelInfo ??= await ChatEngineContext.resolveModelInfo(modelInfo);
    let adapter = resolveModelAdapter(modelInfo);

    let llm: BaseLanguageModel;
    if (isSageMakerEndpointFramework(modelInfo.framework)) {
      const { endpointName, endpointRegion, role } = modelInfo.framework;

      const endpointKwargs = {
        ...modelInfo.framework.endpointKwargs,
        ...options?.endpointKwargs,
      };
      const modelKwargs = {
        ...modelInfo.framework.modelKwargs,
        ...options?.modelKwargs,
      };
      logger.debug('Resolved sagemaker kwargs', { endpointKwargs, modelKwargs });

      llm = new SageMakerEndpoint({
        verbose: options?.verbose,
        // Support cross-account endpoint if enabled and provided in env
        // Otherwise default to execution role creds
        clientOptions: {
          region: endpointRegion,
          credentials: resolveFoundationModelCredentials(role),
        },
        endpointName: endpointName,
        contentHandler: adapter.contentHandler,
        endpointKwargs,
        modelKwargs,
      });
    } else if (isBedrockFramework(modelInfo.framework)) {
      const { modelId, region, role, endpointUrl } = modelInfo.framework;

      const modelKwargs = {
        maxTokens: DEFAULT_MAX_NEW_TOKENS,
        temperature: 0,
        ...modelInfo.framework.modelKwargs,
        ...options?.endpointKwargs,
        ...options?.modelKwargs,
      };
      logger.debug('Resolved bedrock kwargs', { modelKwargs });

      llm = new Bedrock({
        verbose: options?.verbose,
        // Support cross-account endpoint if enabled and provided in env
        // Otherwise default to execution role credentials
        credentials: resolveFoundationModelCredentials(role),
        model: modelId,
        region,
        endpointUrl,
        ...modelKwargs,
        modelKwargs: omitManagedBedrockKwargs(modelKwargs),
      });
    } else {
      // @ts-ignore
      throw new Error(`Model Framework "${modelInfo.framework.type}" is not supported/implemented`);
    }

    const resolved: ResolvedLLM = { llm, modelInfo, adapter };
    logger.debug('Resolved LLM:', { modelInfo, adapter, llm: llm.toJSON() });

    return resolved;
  }

  static async resolvePromptTemplate(
    type: ChainType,
    ...runtime: (string | PromptRuntime | undefined)[]
  ): Promise<PromptTemplate> {
    return resolvePromptTemplateByChainType(type, ...runtime);
  }
}
