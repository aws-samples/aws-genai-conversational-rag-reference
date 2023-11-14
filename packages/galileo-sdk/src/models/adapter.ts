/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { BaseSageMakerContentHandler } from 'langchain/llms/sagemaker_endpoint';
import { set, get, isEmpty } from 'lodash';
import { BaseChatTemplatePartials } from '../prompt/templates/chat/base.js';
import { ChatTemplateTypedRuntimeRecord, PromptTemplateStore } from '../prompt/templates/store/registry.js';
import { ChainType } from '../schema/index.js';

/**
 * @struct
 */
export interface IContentHandlerAdapterInput {
  /**
   * Path in input object to define the prompt value.
   * @see https://lodash.com/docs/#set
   * @default "text_inputs"
   */
  readonly promptKey?: string;
  /**
   * Path in the input object to define the model kwargs.
   * @see https://lodash.com/docs/#set
   * @default undefined - Kwargs will be spread on root
   */
  readonly modelKwargsKey?: string;
  // readonly prepend?: string;
  // readonly append?: string;
  /**
   * @default "utf-8"
   */
  readonly encoding?: BufferEncoding;
}
/**
 * @struct
 */
export interface IContentHandlerAdapterOutput {
  /**
   * Path of response object to extract as output.
   * @see https://lodash.com/docs/#get
   * @default `[0].generated_text`
   */
  readonly jsonpath?: string;
  /**
   * @default "utf-8"
   */
  readonly encoding?: BufferEncoding;
}
/**
 * @struct
 */
export interface IContentHandlerAdapter {
  readonly contentType?: string;
  readonly accepts?: string;
  readonly input?: IContentHandlerAdapterInput;
  readonly output?: IContentHandlerAdapterOutput;
}

/**
 * @struct
 */
export type IChatPromptAdapter = {
  readonly base?: Partial<BaseChatTemplatePartials>;
} & Partial<ChatTemplateTypedRuntimeRecord>;
/**
 * @struct
 */
export interface IPromptAdapter {
  readonly chat?: IChatPromptAdapter;
}

export class PromptAdapter implements IPromptAdapter {
  private static resolveRuntime(
    type: ChainType,
    base?: Partial<BaseChatTemplatePartials>,
    runtime?: string | any,
  ): any | undefined {
    if (runtime == null) {
      if (base == null) return undefined;
      return {
        templatePartials: {
          ...base,
        },
      };
    }

    if (typeof runtime === 'string') {
      // TODO: support non-system templates once we implement store
      // this will throw error if invalid template scope/type/substype
      const parsedId = PromptTemplateStore.parseId(runtime, {
        scope: PromptTemplateStore.SYSTEM_SCOPE,
        type: PromptTemplateStore.CHAT_TYPE,
        subtype: type,
      });
      runtime = PromptTemplateStore.getSystemChatTemplateRuntime(type, parsedId.name);
    }

    return {
      ...runtime,
      templatePartials: {
        ...base,
        ...runtime.templatePartials,
      },
    };
  }

  readonly chat?: IChatPromptAdapter;

  constructor(adapter?: IPromptAdapter) {
    const { base, ...typed } = adapter?.chat || {};

    this.chat = {
      base,
      ...Object.fromEntries(
        Object.values(ChainType).map((type) => {
          if (type in typed) {
            return [type, PromptAdapter.resolveRuntime(type, base, typed[type])];
          } else if (!isEmpty(base)) {
            return [type, PromptAdapter.resolveRuntime(type, base)];
          } else {
            return [type, undefined];
          }
        }),
      ),
    };
  }
}

/**
 * @struct
 */
export interface IBaseModelAdapter {
  readonly contentHandler?: IContentHandlerAdapter;
}

/**
 * Model adapter definition for inference
 * @struct
 */
export interface IModelAdapter extends IBaseModelAdapter {
  readonly prompt?: IPromptAdapter;
}

/**
 * Model adapter for embedding
 * @struct
 */
export interface IEmbeddingModelAdapter extends IBaseModelAdapter {}

export const DEFAULT_OUTPUT_JSONPATH = '[0].generated_text';

export class AdaptedContentHandler extends BaseSageMakerContentHandler<string, string> {
  readonly contentType: string;
  readonly accepts: string;

  protected readonly promptKey: string;
  protected readonly modelKwargsKey?: string;
  protected readonly inputEncoding: BufferEncoding;

  protected readonly outputJsonpath: string;
  protected readonly outputEncoding: BufferEncoding;

  constructor(adapter?: IContentHandlerAdapter) {
    super();

    this.accepts = adapter?.accepts ?? 'application/json';
    this.contentType = adapter?.contentType ?? 'application/json';

    this.promptKey = adapter?.input?.promptKey ?? 'text_inputs';
    this.modelKwargsKey = adapter?.input?.modelKwargsKey;
    this.inputEncoding = adapter?.input?.encoding ?? 'utf-8';

    this.outputJsonpath = adapter?.output?.jsonpath ?? DEFAULT_OUTPUT_JSONPATH;
    this.outputEncoding = adapter?.output?.encoding ?? 'utf-8';

    if (this.accepts !== 'application/json' || this.contentType != 'application/json') {
      throw new Error(
        `Only "application/json" is supported at this time: ${this.accepts} / ${this.contentType} not implemented`,
      );
    }
  }

  async transformInput(prompt: string, modelKwargs: Record<string, unknown>): Promise<Uint8Array> {
    const input = {};

    set(input, this.promptKey, prompt);

    if (this.modelKwargsKey) {
      set(input, this.modelKwargsKey, modelKwargs);
    } else {
      // spread kwargs if not key
      Object.assign(input, modelKwargs);
    }

    console.debug('AdaptedContentHandler#transformInput:', { prompt, modelKwargs, input });

    return Buffer.from(JSON.stringify(input), this.inputEncoding);
  }

  async transformOutput(output: Uint8Array): Promise<string> {
    const response = JSON.parse(Buffer.from(output).toString(this.outputEncoding));
    // extract the path from json
    const result = get(response, this.outputJsonpath);
    console.debug('AdaptedContentHandler#transformOutput:', { response, result });
    return result;
  }
}

export class ModelAdapter {
  readonly prompt?: IPromptAdapter;

  readonly contentHandler: AdaptedContentHandler;

  readonly isDefault: boolean;

  constructor(config?: IModelAdapter) {
    this.isDefault = config == null || isEmpty(config);

    this.prompt = new PromptAdapter(config?.prompt);

    this.contentHandler = new AdaptedContentHandler(config?.contentHandler);
  }
}
