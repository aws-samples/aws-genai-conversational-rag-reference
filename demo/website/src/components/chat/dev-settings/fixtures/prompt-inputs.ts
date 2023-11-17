/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { Document } from 'langchain/document';
import { AIMessage, HumanMessage } from 'langchain/schema';
import '@aws/galileo-sdk/lib/langchain/patch';

export const CONTEXT_DOCUMENTS = [
  new Document({
    pageContent: 'Retrieved document #1',
    metadata: { id: 1, type: 'A' },
  }),
  new Document({
    pageContent: 'Retrieved document #2',
    metadata: { id: 2, type: 'B' },
  }),
  new Document({
    pageContent: 'Retrieved document #3',
    metadata: { id: 3, type: 'C' },
  }),
];

export const CHAT_HISTORY = [
  new HumanMessage({ content: 'What is prompt engineering?' }),
  new AIMessage({
    content: 'Prompt engineering fine-tunes language models for specific tasks using targeted questions.',
  }),
];

export const CLASSIFICATION_RESULT = {
  category: 'example',
  originalLanguage: 'english',
  language: 'english',
};

export const QA_PROMPT = {
  context: CONTEXT_DOCUMENTS.map((v) => v.pageContent).join('\n\n'),
  context_documents: CONTEXT_DOCUMENTS,
  question: 'Do you like prompt engineering?',
};

export const CONDENSE_QUESTION_PROMPT = {
  chat_history: CHAT_HISTORY,
  question: 'How is this different from other engineering?',
};

export const CLASSIFY_PROMPT = {
  question: 'Why are roses red and violets blue?',
};
