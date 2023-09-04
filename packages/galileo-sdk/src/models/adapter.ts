/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { BaseSageMakerContentHandler } from 'langchain/llms/sagemaker_endpoint';
import { set, get } from 'lodash';
import { getLogger } from '../common';

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
export interface IPromptAdapterTag {
  readonly open?: string;
  readonly close?: string;
}
/**
 * @struct
 */
export interface IPromptAdapter {
  readonly sequence?: IPromptAdapterTag;
  readonly instruction?: IPromptAdapterTag;
  readonly context?: IPromptAdapterTag;
  readonly delimiter?: IPromptAdapterTag;
  readonly system?: IPromptAdapterTag;
  readonly human?: IPromptAdapterTag;
  readonly ai?: IPromptAdapterTag;
}
/**
 * @struct
 */
export interface IModelAdapter {
  readonly prompt?: IPromptAdapter;
  readonly contentHandler?: IContentHandlerAdapter;
}

// TODO: Consider adopting [prompt-engine](https://github.com/microsoft/prompt-engine) for managing
// prompt formatting cross-model as adapter system.

export class PromptAdapter {
  static trim(prompt: string): string {
    return prompt
      .trim()
      .replace(/ {2,}/g, ' ')
      .replace(/\n{2,}/g, '\n');
  }

  /** @internal */
  protected _adapter: Required<IPromptAdapter>;

  constructor(adapter?: IPromptAdapter) {
    this._adapter = {
      sequence: {
        open: adapter?.sequence?.open ?? '',
        close: adapter?.sequence?.close ?? '',
      },
      instruction: {
        open: adapter?.instruction?.open ?? '',
        close: adapter?.instruction?.close ?? '',
      },
      context: {
        open: adapter?.context?.open ?? '',
        close: adapter?.context?.close ?? '',
      },
      delimiter: {
        open: adapter?.delimiter?.open ?? "'''",
        close: adapter?.delimiter?.close ?? "'''",
      },
      system: {
        open: adapter?.system?.open ?? '',
        close: adapter?.system?.close ?? '',
      },
      human: {
        open: adapter?.human?.open ?? 'Human: ',
        close: adapter?.human?.close ?? '',
      },
      ai: {
        open: adapter?.ai?.open ?? 'Assistant: ',
        close: adapter?.ai?.close ?? '',
      },
    };
  }

  transform(template: string): string {
    let transformed = template.slice(); // copy
    // replace all open/close tags
    for (const [key, tag] of Object.entries(this._adapter)) {
      transformed = transformed.replace(new RegExp(`<${key}>`, 'igm'), tag.open ?? '');
      transformed = transformed.replace(new RegExp(`</${key}>`, 'igm'), tag.close ?? '');
    }

    transformed = PromptAdapter.trim(transformed);

    logger.debug('PromptAdapter#transform:transformed', { template, transformed });
    return transformed;
  }

  private _formatMessage(message: string, tag?: IPromptAdapterTag): string {
    const open = tag?.open ?? '';
    const close = tag?.close ?? '';
    return `${open}${message}${close}`;
  }

  formatHumanMessage(message: string): string {
    return this._formatMessage(message, this._adapter.human);
  }

  formatAiMessage(message: string): string {
    return this._formatMessage(message, this._adapter.ai);
  }

  formatSystemMessage(message: string): string {
    return this._formatMessage(message, this._adapter.system);
  }
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
  readonly promptAdapter: PromptAdapter;

  readonly contentHandler: AdaptedContentHandler;

  constructor(config?: IModelAdapter) {
    this.promptAdapter = new PromptAdapter(config?.prompt);

    this.contentHandler = new AdaptedContentHandler(config?.contentHandler);
  }
}
