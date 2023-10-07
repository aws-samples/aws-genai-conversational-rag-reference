/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { BaseSageMakerContentHandler } from 'langchain/llms/sagemaker_endpoint';
import { set, get, isEmpty } from 'lodash';
import { getLogger } from '../common/index.js';
import { BaseChatTemplatePartials, ChatCondenseQuestionPromptRuntime, ChatQuestionAnswerPromptRuntime } from '../prompt/templates/chat/index.js';

const logger = getLogger('models/adapter');

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
export interface IChatPromptAdapter {
  readonly base?: Partial<BaseChatTemplatePartials>;
  readonly questionAnswer?: ChatQuestionAnswerPromptRuntime;
  readonly condenseQuestion?: ChatCondenseQuestionPromptRuntime;
}
/**
 * @struct
 */
export interface IPromptAdapter {
  readonly chat?: IChatPromptAdapter;
}

export class PromptAdapter implements IPromptAdapter {

  readonly chat?: IChatPromptAdapter;

  constructor(adapter?: IPromptAdapter) {
    this.chat = {
      base: adapter?.chat?.base,
      condenseQuestion: adapter?.chat?.base || adapter?.chat?.condenseQuestion ? {
        ...adapter.chat.condenseQuestion,
        templatePartials: {
          ...adapter.chat.base,
          ...adapter.chat.condenseQuestion?.templatePartials,
        },
      } : undefined,
      questionAnswer: adapter?.chat?.base || adapter?.chat?.questionAnswer ? {
        ...adapter.chat.questionAnswer,
        templatePartials: {
          ...adapter.chat.base,
          ...adapter.chat.questionAnswer?.templatePartials,
        },
      } : undefined,
    };
  }
}

/**
 * @struct
 */
export interface IModelAdapter {
  readonly prompt?: IPromptAdapter;
  readonly contentHandler?: IContentHandlerAdapter;
}

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
      throw new Error(`Only "application/json" is supported at this time: ${this.accepts} / ${this.contentType} not implemented`);
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

    logger.debug('AdaptedContentHandler#transformInput:', { prompt, modelKwargs, input });

    return Buffer.from(JSON.stringify(input), this.inputEncoding);
  }

  async transformOutput(output: Uint8Array): Promise<string> {
    const response = JSON.parse(Buffer.from(output).toString(this.outputEncoding));
    // extract the path from json
    const result = get(response, this.outputJsonpath);
    logger.debug('AdaptedContentHandler#transformOutput:', { response, result });
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
