/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { BASE_CHAT_PARTIALS, ChatTemplatePartials } from './base.js';
import { HandlebarsPromptTemplate, HandlebarsPromptTemplateRuntime, ScopedHandlebarsPromptTemplateInput } from '../../handlebars.js';

export const CHAT_QUESTION_ANSWER_PARTIALS: ChatTemplatePartials = {
  ...BASE_CHAT_PARTIALS,
  Context: '{{>Corpus}}',
  Instruction: 'You are a research assistant in the "{{domain}}" domain. Based on the following rules and provided corpus denoted by {{>Delimiter}}, answer the question. \nRules:\n{{>Rules}}',
  Cue: 'Question: {{question}}\n\nAnswer: ',
} as const;


export interface ChatQuestionAnswerPromptTemplateInputValues {
  readonly domain: string;
  readonly context: string;
  readonly question: string;
  readonly rules?: string[];
}

export type ChatQuestionAnswerPromptTemplateInput =
  ScopedHandlebarsPromptTemplateInput<ChatTemplatePartials, ChatQuestionAnswerPromptTemplateInputValues>;
export type ChatQuestionAnswerPromptRuntime =
  HandlebarsPromptTemplateRuntime<ChatQuestionAnswerPromptTemplateInput>;

export class ChatQuestionAnswerPromptTemplate extends
  HandlebarsPromptTemplate<ChatTemplatePartials, ChatQuestionAnswerPromptTemplateInputValues> {

  static async deserialize(data: any) {
    return new ChatQuestionAnswerPromptTemplate(data);
  }

  constructor(input: ChatQuestionAnswerPromptTemplateInput) {
    super({
      template: '{{>Layout}}',
      inputVariables: ['context', 'domain', 'question'],
      ...input,
      partialVariables: {
        // LangChain partials only supports string or function return string... but actually can return anything
        rules: [
          'only use knowledge from the provided corpus to answer the question',
          'always be truthful, honest, unbiased, and unharmful',
          'be concise, do not repeat the question or yourself in the answer',
        ],
        ...input.partialVariables,
      },
      templatePartials: {
        ...CHAT_QUESTION_ANSWER_PARTIALS,
        ...input.templatePartials,
      },
    });
  }
}
