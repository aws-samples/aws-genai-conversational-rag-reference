/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { BASE_CHAT_PARTIALS } from './base.js';
import { PromptRuntime } from '../../types.js';

const TEMPLATE = `You are a research assistant. Based on the following rules and provided corpus contained in ''' characters, answer the question.
Rules:
- only use knowledge from the provided corpus to answer the question
- always be truthful, honest, unbiased, and unharmful
- be concise, do not repeat the question or yourself in the answer

Context: '''
{{context}}
'''

Question: {{question}}
Answer: `;

export const PROMPT_TEMPLATE: Required<PromptRuntime> = {
  root: true,
  template: TEMPLATE,
  inputVariables: ['context', 'question'],
  templatePartials: {
    ...BASE_CHAT_PARTIALS,
  },
  partialVariables: {},
};

export default PROMPT_TEMPLATE;
