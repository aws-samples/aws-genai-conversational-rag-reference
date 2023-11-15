/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import type {
  ChatEngineConfig,
  ChatEngineChainConfig,
  ChatEngineLLMConfig,
  ChatEngineSearchConfig,
  ChatEngineMemoryConfig,
} from 'api-typescript-runtime';
import { BaseLanguageModel } from 'langchain/base_language';
import { PromptTemplate } from 'langchain/prompts';
import { difference } from 'lodash';
import { ChainType } from '../../schema/index.js';
import { mergeConfig } from '../../utils/merge.js';
import { ChatEngineContext, ResolvedLLM } from '../context.js';

export { ChatEngineConfig, ChatEngineChainConfig, ChatEngineLLMConfig, ChatEngineSearchConfig, ChatEngineMemoryConfig };

export interface ResolvedLLMChainConfig {
  readonly llm: BaseLanguageModel;
  readonly prompt: PromptTemplate;
}

export interface ResolvedChatEngineConfig {
  /** Indicates if config is the root, and should not be merged with ancestors */
  readonly root?: boolean;
  /** LLM to use for chains, unless overridden by the chain */
  readonly llm: BaseLanguageModel;
  /** Classify chain config, if undefined no classification will be performed */
  readonly classifyChain?: ResolvedLLMChainConfig;
  /** Question/Answer chain config */
  readonly qaChain: ResolvedLLMChainConfig;
  /** Condense question chain (standalone question generator) */
  readonly condenseQuestionChain: ResolvedLLMChainConfig;

  readonly search?: ChatEngineSearchConfig;

  readonly memory?: ChatEngineMemoryConfig;
}

export function mergeUnresolvedChatEngineConfig(...configs: Partial<ChatEngineConfig>[]): ChatEngineConfig {
  return mergeConfig(...(configs as any)) as ChatEngineConfig;
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

export function extractPrivilegedChatEngineConfigKeys(config: Partial<ChatEngineConfig>): string[] {
  const privileged: string[] = [];
  privileged.push(...extractPrivilegedKeys(config.llm?.model, UNPRIVILEGED_KEYS.MODEL, 'llm.model'));

  Object.values(ChainType).forEach((type) => {
    const key = getChainConfigKeyByType(type);
    const chainConfig = config[key] as ChatEngineChainConfig | undefined;
    privileged.push(...extractPrivilegedKeys(chainConfig?.llm?.model, UNPRIVILEGED_KEYS.MODEL, `${key}.llm.model`));
  });

  privileged.push(...extractPrivilegedKeys(config.search, UNPRIVILEGED_KEYS.SEARCH, 'search'));

  return privileged;
}

export function assertNonPrivilegedChatEngineConfig(config: Partial<ChatEngineChainConfig>): void {
  const privileged = extractPrivilegedChatEngineConfigKeys(config);

  if (privileged.length) {
    throw new Error(`ChatEngineConfig contains the following privileged properties: ${privileged.join(', ')}`);
  }
}

async function resolveLLM(
  llmConfig?: ChatEngineLLMConfig,
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
  config: ChatEngineConfig,
  options?: { verbose?: boolean },
): Promise<ResolvedChatEngineConfig> {
  const defaultLLM = await resolveLLM(config.llm, undefined, options);
  const qaLLM = await resolveLLM(config.qaChain?.llm, defaultLLM, options);
  const condensedLLM = await resolveLLM(config.condenseQuestionChain?.llm, defaultLLM, options);
  const classifyLLM = config.classifyChain?.enabled
    ? await resolveLLM(config.classifyChain?.llm, defaultLLM, options)
    : undefined;

  return {
    ...config,
    llm: defaultLLM.llm,
    qaChain: {
      llm: qaLLM.llm,
      prompt: await ChatEngineContext.resolvePromptTemplate(
        ChainType.QA,
        qaLLM.adapter.prompt?.chat?.QA,
        config.qaChain?.prompt,
      ),
    },
    condenseQuestionChain: {
      llm: condensedLLM.llm,
      prompt: await ChatEngineContext.resolvePromptTemplate(
        ChainType.CONDENSE_QUESTION,
        condensedLLM.adapter.prompt?.chat?.CONDENSE_QUESTION,
        config.condenseQuestionChain?.prompt,
      ),
    },
    classifyChain:
      config.classifyChain?.enabled && classifyLLM
        ? {
            llm: classifyLLM.llm,
            prompt: await ChatEngineContext.resolvePromptTemplate(
              ChainType.CLASSIFY,
              classifyLLM.adapter.prompt?.chat?.CLASSIFY,
              config.classifyChain?.prompt,
            ),
          }
        : undefined,
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

export function getChainConfigByType<T extends ChatEngineConfig | ResolvedChatEngineConfig>(
  type: ChainType,
  config?: T,
) {
  return config && config[getChainConfigKeyByType(type)];
}
