/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { BASE_CHAT_PARTIALS } from './base.js';
import { PromptRuntime } from '../../types.js';

export const TEMPLATE = `Given the following chat history contained in ''' characters, and the "Followup Question" below, rephrase the "Followup Question" to be a concise standalone question in its original language.
Without answering the question, return only the standalone question.

Chat history: '''
{{>ChatHistory}}
'''

Followup Question: {{question}}
Standalone Question: `;

export const PROMPT_TEMPLATE: Required<PromptRuntime> = {
  root: true,
  template: TEMPLATE,
  inputVariables: ['chat_history', 'question'],
  templatePartials: {
    ...BASE_CHAT_PARTIALS,
  },
  partialVariables: {},
};

export default PROMPT_TEMPLATE;
