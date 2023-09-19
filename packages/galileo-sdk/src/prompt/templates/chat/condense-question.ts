/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { BaseMessage } from 'langchain/schema';
import { BASE_CHAT_PARTIALS, ChatTemplatePartials } from './base.js';
import { HandlebarsPromptTemplate, HandlebarsPromptTemplateRuntime, ScopedHandlebarsPromptTemplateInput } from '../../handlebars.js';

export const CHAT_CONDENSE_QUESTION_PARTIALS: ChatTemplatePartials = {
  ...BASE_CHAT_PARTIALS,
  Body: '{{>Instruction}}\n\n{{>Dialog}}\n\n{{>Cue}}',
  Instruction: 'Given the following conversational dialog denoted by {{>Delimiter}}, and the "Followup Question" below, rephrase the "Followup Question" to be a concise standalone question in its original language. Without answering the question, return only the standalone question.',
  Cue: 'Followup Question: {{question}}\n\nStandalone Question: ',
} as const;

export interface ChatCondenseQuestionPromptTemplateInputValues {
  readonly chat_history: BaseMessage[];
  readonly question: string;
}

export type ChatCondenseQuestionPromptTemplateInput =
  ScopedHandlebarsPromptTemplateInput<ChatTemplatePartials, ChatCondenseQuestionPromptTemplateInputValues>;
export type ChatCondenseQuestionPromptRuntime =
  HandlebarsPromptTemplateRuntime<ChatCondenseQuestionPromptTemplateInput>;

export class ChatCondenseQuestionPromptTemplate extends
  HandlebarsPromptTemplate<ChatTemplatePartials, ChatCondenseQuestionPromptTemplateInputValues> {

  static async deserialize(data: any) {
    return new ChatCondenseQuestionPromptTemplate(data);
  }

  constructor(input: ChatCondenseQuestionPromptTemplateInput) {
    super({
      template: '{{>Layout}}',
      inputVariables: ['chat_history', 'question'],
      ...input,
      partialVariables: {
        ...input.partialVariables,
      },
      templatePartials: {
        ...CHAT_CONDENSE_QUESTION_PARTIALS,
        ...input.templatePartials,
      },
    });
  }
}
