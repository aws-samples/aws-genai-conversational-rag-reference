/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { BASE_CHAT_PARTIALS } from './base.js';
import { PromptRuntime } from '../../types.js';

export const TEMPLATE = `Classify the following question based on the fields of the provided JSON specification, and return corresponding JSON classification for the question.

Specification:
    ${JSON.stringify({
      originalLanguage: 'language of the original question',
      originalQuestion: 'original question unmodified and in original language',
      language: 'target language, use english if not specified',
      question: 'translated question into target language',
    })}

Example:
  Question: "Bonjour mon ami!"
  Classification: ${JSON.stringify({
    originalLanguage: 'french',
    originalQuestion: 'Bonjour mon ami!',
    language: 'english',
    question: 'Hello my friend!',
  })}

Question: {{question}}
Classification: `;

export const PROMPT_TEMPLATE: Required<PromptRuntime> = {
  root: true,
  template: TEMPLATE,
  inputVariables: ['question'],
  templatePartials: {
    ...BASE_CHAT_PARTIALS,
  },
  partialVariables: {},
};

export default PROMPT_TEMPLATE;
