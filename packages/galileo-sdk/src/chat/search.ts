/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { fetch } from 'cross-fetch';
import { Document } from 'langchain/document';
import {
  RemoteLangChainRetrieverParams,
  RemoteLangChainRetriever,
  RemoteRetrieverValues,
} from 'langchain/retrievers/remote';
import { getLogger } from '../common/index.js';

const logger = getLogger('chat/search');

export interface SearchRetrieverInput extends Omit<RemoteLangChainRetrieverParams, 'auth'> {
  readonly limit?: number;
  readonly filter?: Record<string, unknown>;
  readonly fetch?: typeof fetch;
  // TODO: implement score threshold
  readonly scoreThreshold?: number;
}

export class SearchRetriever extends RemoteLangChainRetriever {
  readonly k: number;
  readonly filter?: Record<string, unknown>;
  readonly fetch: typeof fetch;
  readonly scoreThreshold?: number;

  constructor(input: SearchRetrieverInput) {
    super({
      inputKey: 'query',
      responseKey: 'documents',
      pageContentKey: 'pageContent',
      auth: false,
      ...input,
    });

    this.k = input.limit ?? 5;
    this.filter = input.filter;
    this.fetch = input.fetch ?? fetch;
    this.scoreThreshold = input.scoreThreshold;
  }

  createJsonBody(query: string): RemoteRetrieverValues {
    const values = super.createJsonBody(query);

    values.k = this.k;

    if (this.filter) {
      values.filter = this.filter;
    }
    return values;
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    const body = this.createJsonBody(query);
    const init: RequestInit = {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    };
    logger.debug('getRelevantDocuments', { query, url: this.url, init });
    const response = await this.asyncCaller.call(() => this.fetch(this.url, init));
    if (!response.ok) {
      const error = await responseError(response);
      logger.error('Failed to getRelevantDocuments', { query, url: this.url, init, ...error });
      throw new Error(`Failed to retrieve documents from ${this.url}: ${response.status} ${response.statusText}`);
    }
    const json = await response.json();
    logger.debug('Successfully retrieved relevant documents', { query, response: json });
    return this.processJsonResponse(json);
  }
}

async function responseError(
  response: Response,
): Promise<{ status: number; statusText: string; errorMessage: string }> {
  const { status, statusText } = response;
  try {
    return {
      status,
      statusText,
      errorMessage: await response.text(),
    };
  } catch (error) {
    return {
      status,
      statusText,
      errorMessage: String(error),
    };
  }
}
