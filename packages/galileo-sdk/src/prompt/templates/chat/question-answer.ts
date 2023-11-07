/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { BASE_CHAT_PARTIALS, ChatTemplatePartials } from './base.js';
import {
  HandlebarsPromptTemplate,
  HandlebarsPromptTemplateRuntime,
  ScopedHandlebarsPromptTemplateInput,
} from '../../handlebars.js';

export const CHAT_QUESTION_ANSWER_TEMPLATE = `You are a research assistant in the "{{domain}}" domain.
Based on the following rules and provided corpus contained in ''' characters, answer the question.
Rules:
- only use knowledge from the provided corpus to answer the question
- always be truthful, honest, unbiased, and unharmful
- be concise, do not repeat the question or yourself in the answer

Context: '''
{{context}}
'''

Question: {{question}}
Answer: `;

export interface ChatQuestionAnswerPromptTemplateInputValues {
  readonly domain: string;
  readonly context: string;
  readonly question: string;
}

export type ChatQuestionAnswerPromptTemplateInput = ScopedHandlebarsPromptTemplateInput<
  ChatTemplatePartials,
  ChatQuestionAnswerPromptTemplateInputValues
>;
export type ChatQuestionAnswerPromptRuntime = HandlebarsPromptTemplateRuntime<ChatQuestionAnswerPromptTemplateInput>;

export class ChatQuestionAnswerPromptTemplate extends HandlebarsPromptTemplate<
  ChatTemplatePartials,
  ChatQuestionAnswerPromptTemplateInputValues
> {
  static async deserialize(data: any) {
    return new ChatQuestionAnswerPromptTemplate(data);
  }

  constructor(input: ChatQuestionAnswerPromptTemplateInput) {
    super({
      template: CHAT_QUESTION_ANSWER_TEMPLATE,
      inputVariables: ['context', 'domain', 'question'],
      ...input,
      partialVariables: {
        ...input.partialVariables,
      },
      templatePartials: {
        ...BASE_CHAT_PARTIALS,
        ...input.templatePartials,
      },
    });
  }
}
