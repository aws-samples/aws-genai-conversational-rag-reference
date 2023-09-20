/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  SageMakerRuntimeClient,
  InvokeEndpointCommand,
  SageMakerRuntimeClientConfig,
} from '@aws-sdk/client-sagemaker-runtime';
import { Embeddings, EmbeddingsParams } from 'langchain/embeddings/base';
import { TKwags } from '../../common/types.js';

export abstract class BaseSageMakerEmbeddingContentHandler<InputType, OutputType> {
  /** The MIME type of the input data passed to endpoint */
  abstract contentType: string;
  /** The MIME type of the response data returned from endpoint */
  abstract accepts: string;
  /**
	 * Transforms the input to a format that model can accept as the request Body.
	 * Should return bytes or seekable file like object in the format specified in
	 * the contentType request header.
	 */
  abstract transformInput(prompt: InputType, modelKwargs: TKwags): Promise<Uint8Array>;
  /**
	 * Transforms the output from the model to string that the LLM class expects.
	 */
  abstract transformOutput(output: Uint8Array): Promise<OutputType>;
}

/** Content handler for Embedding class. */
export type SageMakerEmbeddingContentHandler = BaseSageMakerEmbeddingContentHandler<
string[],
number[][]
>;

export interface SageMakerEndpointEmbeddingsOptions extends EmbeddingsParams {
  /**
	 * The name of the endpoint from the deployed SageMaker model. Must be unique
	 * within an AWS Region.
	 */
  readonly endpointName: string;
  /**
	 * Options passed to the SageMaker client.
	 */
  readonly clientOptions: SageMakerRuntimeClientConfig;
  /**
	 * The content handler class that provides an input and output transform
	 * functions to handle formats between LLM and the endpoint.
	 */
  readonly contentHandler: SageMakerEmbeddingContentHandler;
  /**
	 * Key word arguments to pass to the model.
	 */
  readonly modelKwargs?: TKwags;
  /**
	 * Optional attributes passed to the InvokeEndpointCommand
	 */
  readonly endpointKwargs?: TKwags;
}

export class SageMakerEndpointEmbeddings extends Embeddings {

  readonly endpointName: string;
  readonly contentHandler: SageMakerEmbeddingContentHandler;
  readonly endpointKwargs?: TKwags;
  readonly modelKwargs?: TKwags;
  readonly client: SageMakerRuntimeClient;

  constructor(fields: SageMakerEndpointEmbeddingsOptions) {
    super(fields ?? {});

    const regionName = fields.clientOptions.region;
    if (!regionName) {
      throw new Error(
        'Please pass a "clientOptions" object with a "region" field to the constructor',
      );
    }

    const endpointName = fields?.endpointName;
    if (!endpointName) {
      throw new Error('Please pass an "endpointName" field to the constructor');
    }

    const contentHandler = fields?.contentHandler;
    if (!contentHandler) {
      throw new Error(
        'Please pass a "contentHandler" field to the constructor',
      );
    }

    this.endpointName = fields.endpointName;
    this.contentHandler = fields.contentHandler;
    this.endpointKwargs = fields.endpointKwargs;
    this.modelKwargs = fields.modelKwargs;
    this.client = new SageMakerRuntimeClient(fields.clientOptions);
  }

  async embedDocuments(texts: string[], chunkSize: number = 64): Promise<number[][]> {
    const results: number[][] = [];
    const _chunkSize = chunkSize > texts.length ? texts.length : chunkSize;

    for (let i = 0; i < texts.length; i += _chunkSize) {
      const response = await this._embedding_func(
        texts.slice(i, i + _chunkSize),
      );
      results.push(...response);
    }

    return results;
  }
  async embedQuery(text: string): Promise<number[]> {
    return (await this._embedding_func([text]))[0];
  }

  async _embedding_func(texts: string[], options?: any): Promise<number[][]> {
    texts = texts.map((text) => text.replace(/\n/g, ' '));

    const body = await this.contentHandler.transformInput(
      texts,
      this.modelKwargs ?? {},
    );
    const { contentType, accepts } = this.contentHandler;

    const response = await this.caller.call(() =>
      this.client.send(
        new InvokeEndpointCommand({
          EndpointName: this.endpointName,
          Body: body,
          ContentType: contentType,
          Accept: accepts,
          ...this.endpointKwargs,
        }),
        { abortSignal: options?.abortSignal || options?.signal },
      ),
    );

    if (response.Body === undefined) {
      throw new Error('Embedding result missing Body');
    }

    return this.contentHandler.transformOutput(response.Body);
  }
}
