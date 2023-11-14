/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { BaseLanguageModel } from 'langchain/base_language';
import { PromptTemplate } from 'langchain/prompts';
import { difference } from 'lodash';
import { TKwags } from '../../common/types.js';
import { IModelInfo } from '../../models/types.js';
import { PromptRuntime } from '../../prompt/types.js';
import { ChainType } from '../../schema/index.js';
import { mergeConfig } from '../../utils/merge.js';
import { ChatEngineContext, ResolvedLLM } from '../context.js';
import { SearchRetrieverInput } from '../search.js';

export interface MemoryConfig {
  /**
   * Number of messages to fetch for contextual conversation history
   * - Set to 0 to disable conversation history (and condense question step), but still store messages
   */
  readonly limit?: number;
}

export interface LLMConfig {
  /**
   * LLM model, either predefined model uuid as string, or model info definition.
   */
  readonly model: string | IModelInfo | undefined;
  /** Additional model kwargs */
  readonly modelKwargs?: TKwags;
  /** Additional endpoint kwargs */
  readonly endpointKwargs?: TKwags;
}

export interface UnresolvedLLMChainConfig {
  readonly enabled?: boolean;
  readonly llm?: LLMConfig;
  readonly prompt?: string | PromptRuntime;
}

export interface LLMChainConfig {
  readonly enabled?: boolean;
  readonly llm: BaseLanguageModel;
  readonly prompt: PromptTemplate;
}

export interface UnresolvedChatEngineConfig {
  /** Indicates if config is the root, and should not be merged with ancestors */
  readonly root?: boolean;
  /** LLM to use for chains, unless overridden by the chain */
  readonly llm?: LLMConfig;
  /** Classify chain config, if undefined no classification will be performed */
  readonly classifyChain?: false | UnresolvedLLMChainConfig;
  /** Question/Answer chain config */
  readonly qaChain?: UnresolvedLLMChainConfig;
  /** Condense question chain (standalone question generator) */
  readonly condenseQuestionChain?: UnresolvedLLMChainConfig;

  readonly search: SearchRetrieverInput;
  readonly memory?: MemoryConfig;
}

export interface ChatEngineConfig {
  /** Indicates if config is the root, and should not be merged with ancestors */
  readonly root?: boolean;
  /** LLM to use for chains, unless overridden by the chain */
  readonly llm: BaseLanguageModel;
  /** Classify chain config, if undefined no classification will be performed */
  readonly classifyChain: false | LLMChainConfig;
  /** Question/Answer chain config */
  readonly qaChain: LLMChainConfig;
  /** Condense question chain (standalone question generator) */
  readonly condenseQuestionChain: LLMChainConfig;

  readonly search: SearchRetrieverInput;
  readonly memory?: MemoryConfig;
}

export function mergeUnresolvedChatEngineConfig(
  ...configs: Partial<UnresolvedChatEngineConfig>[]
): UnresolvedChatEngineConfig {
  return mergeConfig(...configs) as UnresolvedChatEngineConfig;
}

function extractPrivilegedKeys(obj: any, allowed: string[], prefix?: string): string[] {
  if (obj && typeof obj === 'object') {
    const privileged = difference(Object.keys(obj), allowed);
    if (privileged.length) {
      return prefix ? privileged.map((v) => `${prefix}.${v}`) : privileged;
    }
  }
  return [];
}

export const UNPRIVILEGED_KEYS = {
  MODEL: ['uuid'],
  SEARCH: ['filter', 'limit', 'scoreThreshold'],
};

export function extractPrivilegedChatEngineConfigKeys(config: Partial<UnresolvedChatEngineConfig>): string[] {
  const privileged: string[] = [];
  privileged.push(...extractPrivilegedKeys(config.llm?.model, UNPRIVILEGED_KEYS.MODEL, 'llm.model'));

  Object.values(ChainType).forEach((type) => {
    const key = getChainConfigKeyByType(type);
    const chainConfig = config[key] as UnresolvedLLMChainConfig | undefined;
    privileged.push(...extractPrivilegedKeys(chainConfig?.llm?.model, UNPRIVILEGED_KEYS.MODEL, `${key}.llm.model`));
  });

  privileged.push(...extractPrivilegedKeys(config.search, UNPRIVILEGED_KEYS.SEARCH, 'search'));

  return privileged;
}

export function assertNonPrivilegedChatEngineConfig(config: Partial<UnresolvedChatEngineConfig>): void {
  const privileged = extractPrivilegedChatEngineConfigKeys(config);

  if (privileged.length) {
    throw new Error(`ChatEngineConfig contains the following privileged properties: ${privileged.join(', ')}`);
  }
}

async function resolveLLM(
  llmConfig?: LLMConfig,
  defaultValues?: ResolvedLLM,
  options?: { verbose?: boolean },
): Promise<ResolvedLLM> {
  let modelInfo = defaultValues?.modelInfo;
  if (llmConfig?.model) {
    modelInfo = await ChatEngineContext.resolveModelInfo(llmConfig.model);
  }

  return ChatEngineContext.resolveLLM(modelInfo, { ...llmConfig, ...options });
}

export async function resolveChatEngineConfig(
  config: UnresolvedChatEngineConfig,
  options?: { verbose?: boolean },
): Promise<ChatEngineConfig> {
  const defaultLLM = await resolveLLM(config.llm, undefined, options);
  const qaLLM = await resolveLLM(config.qaChain?.llm, defaultLLM, options);
  const condensedLLM = await resolveLLM(config.condenseQuestionChain?.llm, defaultLLM, options);
  const classifyLLM =
    config.classifyChain && config.classifyChain.enabled === true
      ? await resolveLLM(
          {
            model: defaultLLM.modelInfo,
            modelKwargs: { temperature: 0 },
            ...config.classifyChain?.llm,
          },
          defaultLLM,
          options,
        )
      : false;
  const classify = classifyLLM && config.classifyChain;

  return {
    ...config,
    llm: defaultLLM.llm,
    qaChain: {
      // required
      enabled: true,
      llm: qaLLM.llm,
      prompt: await ChatEngineContext.resolvePromptTemplate(
        ChainType.QA,
        qaLLM.adapter.prompt?.chat?.QA,
        config.qaChain?.prompt,
      ),
    },
    condenseQuestionChain: {
      // enabled by default
      enabled: config.condenseQuestionChain?.enabled ?? true,
      llm: condensedLLM.llm,
      prompt: await ChatEngineContext.resolvePromptTemplate(
        ChainType.CONDENSE_QUESTION,
        condensedLLM.adapter.prompt?.chat?.CONDENSE_QUESTION,
        config.condenseQuestionChain?.prompt,
      ),
    },
    classifyChain: classify
      ? {
          // disabled by default
          enabled: config.classifyChain.enabled ?? false,
          llm: classifyLLM.llm,
          prompt: await ChatEngineContext.resolvePromptTemplate(
            ChainType.CLASSIFY,
            classifyLLM.adapter.prompt?.chat?.CLASSIFY,
            config.classifyChain?.prompt,
          ),
        }
      : false,
  };
}

export function getChainConfigKeyByType(type: ChainType) {
  switch (type) {
    case ChainType.QA:
      return 'qaChain';
    case ChainType.CONDENSE_QUESTION:
      return 'condenseQuestionChain';
    case ChainType.CLASSIFY:
      return 'classifyChain';
  }
}

export function getChainConfigByType<T extends UnresolvedChatEngineConfig | ChatEngineConfig>(
  type: ChainType,
  config?: T,
) {
  return config && config[getChainConfigKeyByType(type)];
}
