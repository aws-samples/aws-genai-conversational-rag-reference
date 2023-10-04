/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { getLogger } from '@aws/galileo-sdk/lib/common';
import { Embeddings } from 'langchain/embeddings/base';
import fetch from 'node-fetch';
import { ENV } from '../env';

const logger = getLogger(__dirname);

export type Vector = number[]

export const EMBEDDING_URL = `http://localhost:${ENV.EMBEDDING_PORT}/embed-documents`;

export interface EmbedDocumentsRequestContent {
  readonly texts: string[];
  readonly multiprocessing?: boolean;
}

export interface EmbedDocumentsResponseContent {
  readonly embeddings: Vector[];
  readonly model: string;
};

export interface EmbedQuearyResponseContent {
  readonly embedding: Vector;
  readonly model: string;
};

export async function embedDocuments(texts: string[]): Promise<EmbedDocumentsResponseContent> {
  const body: EmbedDocumentsRequestContent = {
    texts,
  };

  logger.debug({ message: `Sending request to embedding server: ${EMBEDDING_URL}`, texts: texts.length });

  const response = await fetch(EMBEDDING_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as EmbedDocumentsResponseContent;

  logger.debug({ message: `Response from embedding server: ${response.status}`, status: response.status, statusText: response.statusText, embeddingsCount: data.embeddings.length });

  return data;
}

export async function embedQuery(text: string): Promise<EmbedQuearyResponseContent> {
  const response = await embedDocuments([text]);

  return {
    embedding: response.embeddings[0],
    model: response.model,
  };
}

export class LocalEmbeddings extends Embeddings {
  async embedDocuments(documents: string[]): Promise<Vector[]> {
    const response = await this.caller.call(embedDocuments, documents);
    return response.embeddings;
  }

  async embedQuery(document: string): Promise<Vector> {
    const response = await this.caller.call(embedQuery, document);
    return response.embedding;
  }
}
