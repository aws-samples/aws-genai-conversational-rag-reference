/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { BaseMessage } from 'langchain/schema';
import { BASE_CHAT_PARTIALS, ChatTemplatePartials } from './base.js';
import {
  HandlebarsPromptTemplate,
  HandlebarsPromptTemplateRuntime,
  ScopedHandlebarsPromptTemplateInput,
} from '../../handlebars.js';

export const CHAT_CONDENSE_QUESTION_TEMPLATE = `Given the following chat history contained in ''' characters, and the "Followup Question" below, rephrase the "Followup Question" to be a concise standalone question in its original language.
Without answering the question, return only the standalone question.

Chat history: '''
{{>ChatHistory}}
'''

Followup Question: {{question}}
Standalone Question: `;

export interface ChatCondenseQuestionPromptTemplateInputValues {
  readonly chat_history: BaseMessage[];
  readonly question: string;
}

export type ChatCondenseQuestionPromptTemplateInput = ScopedHandlebarsPromptTemplateInput<
  ChatTemplatePartials,
  ChatCondenseQuestionPromptTemplateInputValues
>;
export type ChatCondenseQuestionPromptRuntime =
  HandlebarsPromptTemplateRuntime<ChatCondenseQuestionPromptTemplateInput>;

export class ChatCondenseQuestionPromptTemplate extends HandlebarsPromptTemplate<
  ChatTemplatePartials,
  ChatCondenseQuestionPromptTemplateInputValues
> {
  static async deserialize(data: any) {
    return new ChatCondenseQuestionPromptTemplate(data);
  }

  constructor(input: ChatCondenseQuestionPromptTemplateInput) {
    super({
      template: CHAT_CONDENSE_QUESTION_TEMPLATE,
      inputVariables: ['chat_history', 'question'],
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
