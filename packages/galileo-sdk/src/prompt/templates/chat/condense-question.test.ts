/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { AIMessage, HumanMessage, SystemMessage } from 'langchain/schema';
import { ChatCondenseQuestionPromptTemplate } from './condense-question.js';

describe('prompt/templates/chat', () => {
  describe('condense-question', () => {
    test('default', async () => {
      const template = new ChatCondenseQuestionPromptTemplate({});

      expect(await template.format({
        question: 'THE QUESTION',
        chat_history: [
          new SystemMessage('A system message'),
          new HumanMessage('Hi'),
          new AIMessage('Hello!'),
        ],
      })).toMatchSnapshot();
    });

    test('messages', async () => {
      const template = new ChatCondenseQuestionPromptTemplate({
        template: `
{{#*inline "HumanMessage"}}<|prompter|>{{content}}<|endoftext|>{{/inline}}
{{#*inline "AIMessage"}}<|assistant|>{{content}}<|endoftext|>{{/inline}}
{{#*inline "SystemMessage"}}<|system|>{{content}}<|endoftext|>{{/inline}}

{{>Layout}}
        `,
      });

      expect(await template.format({
        question: 'THE QUESTION',
        chat_history: [
          new SystemMessage('A system message'),
          new HumanMessage('Hi'),
          new AIMessage('Hello!'),
        ],
      })).toMatchSnapshot();
    });

    test('wrappers', async () => {
      const template = new ChatCondenseQuestionPromptTemplate({
        template: `
{{#*inline "Header"}}<SEQUENCE>{{/inline}}
{{#*inline "Footer"}}</SEQUENCE>{{/inline}}
{{#*inline "DialogHeader"}}<DIALOG>{{/inline}}
{{#*inline "DialogFooter"}}</DIALOG>{{/inline}}

{{>Layout}}
        `,
      });

      expect(await template.format({
        question: 'THE QUESTION',
        chat_history: [
          new SystemMessage('A system message'),
          new HumanMessage('Hi'),
          new AIMessage('Hello!'),
        ],
      })).toMatchSnapshot();
    });

    test('should allow complete override of template', async () => {
      const template = new ChatCondenseQuestionPromptTemplate({
        template: 'CUSTOM',
      });

      expect(await template.format({
        question: 'THE QUESTION',
        chat_history: [
          new SystemMessage('A system message'),
          new HumanMessage('Hi'),
          new AIMessage('Hello!'),
        ],
      })).toBe('CUSTOM');
    });
  });
});
