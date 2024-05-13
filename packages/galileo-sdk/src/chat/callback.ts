/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

export interface UpdateStatusCallbackOptions {
  readonly operation: string;
  readonly status: string;
  readonly payload?: ChainOperationPayload;
}

export type StreamChunksCallback = (chunks: string[]) => void;
export type UpdateStatusCallback = (options: UpdateStatusCallbackOptions) => void;

export interface ChatEngineCallbacks {
  readonly streamChunks: StreamChunksCallback;
  readonly updateStatus: UpdateStatusCallback;
}

export enum ChainOperation {
  CLASSIFY = 'CLASSIFY',
  CONDENSE_QUESTION = 'CONDENSE_QUESTION',
  DOCUMENT_RETRIEVE = 'DOCUMENT_RETRIEVE',
  QA = 'QA',
}
export interface ChainOperationPayload {
  readonly message: string;
  readonly executionTime?: number;
}

export enum ChainLLMCallStatus {
  STARTING = 'STARTING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}
