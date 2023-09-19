/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { LLM } from 'langchain/llms/base';
import { Bedrock } from 'langchain/llms/bedrock';
import { SageMakerEndpoint } from 'langchain/llms/sagemaker_endpoint';
import { PromptTemplate } from 'langchain/prompts';
import { merge } from 'lodash';
import { getLogger } from '../common/index.js';
import { ModelAdapter } from '../models/adapter.js';
import { resolveFoundationModelCredentials } from '../models/cross-account.js';
import { FoundationModelInventory } from '../models/index.js';
import { IModelInfo, Kwargs, isBedrockFramework, isSageMakerEndpointFramework } from '../models/types.js';
import { ChatCondenseQuestionPromptRuntime, ChatCondenseQuestionPromptTemplate, ChatQuestionAnswerPromptRuntime, ChatQuestionAnswerPromptTemplate } from '../prompt/templates/chat/index.js';

const logger = getLogger('chat/adapter');

export interface IChatEngineContextOptions {
  readonly domain: string;
  readonly maxNewTokens: number;
  readonly qaPrompt?: ChatQuestionAnswerPromptRuntime;
  readonly condenseQuestionPrompt?: ChatCondenseQuestionPromptRuntime;
  readonly modelKwargs?: Kwargs;
  readonly endpointKwargs?: Kwargs;
  readonly verbose?: boolean;
}

export class ChatEngineContext {
  static async resolveModelInfo(modelInfo: string | IModelInfo | Partial<IModelInfo> | undefined): Promise<IModelInfo> {
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

    modelInfo = typeof modelInfo === 'object' ? merge({}, resolved, modelInfo) as IModelInfo : resolved;
    logger.info('Resolving model info from inventory', { uuid, modelInfo, resolved });
    return modelInfo as IModelInfo;
  }

  readonly llm: LLM;
  readonly qaPrompt: PromptTemplate;
  readonly condenseQuestionPrompt: PromptTemplate;

  readonly modelInfo: IModelInfo;
  readonly maxNewTokens: number;
  readonly domain: string;

  readonly adapter: ModelAdapter;

  constructor(modelInfo: IModelInfo, options: IChatEngineContextOptions) {
    this.modelInfo = modelInfo;
    this.maxNewTokens = options.maxNewTokens;
    this.domain = options.domain;

    logger.debug('LLM configuration', { modelInfo, options });

    this.adapter = new ModelAdapter(modelInfo.adapter);

    this.qaPrompt = new ChatQuestionAnswerPromptTemplate(merge(
      // defaults
      {
        domain: options.domain,
      },
      // model specific config
      this.adapter.prompt?.chat?.questionAnswer,
      // runtime specific
      options.qaPrompt,
    ));

    this.condenseQuestionPrompt = new ChatCondenseQuestionPromptTemplate(merge(
      // defaults
      {
        domain: options.domain,
      },
      // model specific config
      this.adapter.prompt?.chat?.condenseQuestion,
      // runtime specific
      options.condenseQuestionPrompt,
    ));

    logger.debug('Prompts', {
      qaPrompt: this.qaPrompt.serialize(),
      condenseQuestionPrompt: this.condenseQuestionPrompt.serialize(),
    });

    if (isSageMakerEndpointFramework(modelInfo.framework)) {
      const { endpointName, endpointRegion, role } = modelInfo.framework;

      const endpointKwargs = {
        ...modelInfo.framework.endpointKwargs,
        ...options.endpointKwargs,
      };
      const modelKwargs = {
        ...modelInfo.framework.modelKwargs,
        ...options.modelKwargs,
      };
      logger.debug('Resolved sagemaker kwargs', { endpointKwargs, modelKwargs });

      this.llm = new SageMakerEndpoint({
        verbose: options.verbose,
        // Support cross-account endpoint if enabled and provided in env
        // Otherwise default to execution role creds
        clientOptions: {
          region: endpointRegion,
          credentials: resolveFoundationModelCredentials(role),
        },
        endpointName: endpointName,
        contentHandler: this.adapter.contentHandler,
        endpointKwargs,
        modelKwargs,
      });
    } else if (isBedrockFramework(modelInfo.framework)) {
      const { modelId, region, role, endpointUrl } = modelInfo.framework;

      const kwargs = {
        ...modelInfo.framework.modelKwargs,
        ...options.endpointKwargs,
        ...options.modelKwargs,
      };
      logger.debug('Resolved bedrock kwargs', { kwargs });

      this.llm = new Bedrock({
        verbose: options.verbose,
        // Support cross-account endpoint if enabled and provided in env
        // Otherwise default to execution role credentials
        credentials: resolveFoundationModelCredentials(role),
        model: modelId,
        region,
        endpointUrl,
        ...kwargs,
      });
    } else {
      // @ts-ignore
      throw new Error(`Model Framework "${modelInfo.framework.type}" is not supported/implemented`);
    }
  }

  getNumTokens(text: string): number {
    // https://github.com/hwchase17/langchainjs/blob/b1869537e78a128df1616a8aef64ab38e19490f9/langchain/src/base_language/index.ts#L154
    // TODO: implemented Tiktoken to get exact values
    return Math.ceil(text.length / 4);
  }

  get maxInputLength(): number {
    return this.modelInfo.constraints?.maxInputLength || 2048;
  }

  get qaPromptLength(): number {
    return this.getNumTokens(this.qaPrompt.template);
  }

  get condenseQuestionPromptLength(): number {
    return this.getNumTokens(this.condenseQuestionPrompt.template);
  }

  truncateInputText(text: string): string {
    const tokens = this.getNumTokens(text);
    if (tokens <= this.maxInputLength) {
      return text;
    }
    const textLength = text.length;
    const targetLength = textLength * (this.maxInputLength / tokens);
    const reduceBy = (textLength - targetLength) + 3; // ... is 3 chars
    const midPoint = Math.round(textLength / 2);
    return text.slice(0, Math.floor(midPoint - (reduceBy / 2))) + '...' + text.slice(Math.ceil(midPoint + (reduceBy / 2)));
  }
}
