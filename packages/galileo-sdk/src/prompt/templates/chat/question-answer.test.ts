/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { ChatQuestionAnswerPromptTemplate } from './question-answer.js';

describe('prompt/templates/chat', () => {
  describe('question-answer', () => {
    test('default', async () => {
      const template = new ChatQuestionAnswerPromptTemplate({});

      expect(
        await template.format({
          question: 'THE QUESTION',
          domain: 'DOMAIN',
          context: 'CORPUS',
        }),
      ).toMatchSnapshot();
    });

    test('messages', async () => {
      const template = new ChatQuestionAnswerPromptTemplate({
        template: `
{{#*inline "HumanMessage"}}<|prompter|>{{content}}<|endoftext|>{{/inline}}
{{#*inline "AIMessage"}}<|assistant|>{{content}}<|endoftext|>{{/inline}}
{{#*inline "SystemMessage"}}<|system|>{{content}}<|endoftext|>{{/inline}}

{{>Layout}}
        `,
      });

      expect(
        await template.format({
          question: 'THE QUESTION',
          domain: 'DOMAIN',
          context: 'CORPUS',
        }),
      ).toMatchSnapshot();
    });

    test('wrappers', async () => {
      const template = new ChatQuestionAnswerPromptTemplate({
        template: `
{{#*inline "Header"}}<SEQUENCE>{{/inline}}
{{#*inline "Footer"}}</SEQUENCE>{{/inline}}

{{>Layout}}
        `,
      });

      expect(
        await template.format({
          question: 'THE QUESTION',
          domain: 'DOMAIN',
          context: 'CORPUS',
        }),
      ).toMatchSnapshot();
    });

    test('should allow complete override of template', async () => {
      const template = new ChatQuestionAnswerPromptTemplate({
        template: 'CUSTOM: {{domain}} {{question}} {{context}}',
      });

      expect(
        await template.format({
          question: 'THE QUESTION',
          domain: 'DOMAIN',
          context: 'CORPUS',
        }),
      ).toBe('CUSTOM: DOMAIN THE QUESTION CORPUS');
    });

    test('custom rules', async () => {
      const template = new ChatQuestionAnswerPromptTemplate({});

      expect(
        await template.format({
          question: 'THE QUESTION',
          domain: 'DOMAIN',
          context: 'CORPUS',
          rules: ['rule 1', 'rule 2'],
        }),
      ).toMatchSnapshot();
    });

    test('partial template overrides', async () => {
      const template = new ChatQuestionAnswerPromptTemplate({
        templatePartials: {
          Header: '<WRAPPER>',
          Footer: '</WRAPPER>',
        },
      });

      expect(
        await template.format({
          question: 'THE QUESTION',
          domain: 'DOMAIN',
          context: 'CORPUS',
        }),
      ).toMatchSnapshot();
    });

    test('flatten', async () => {
      const template = new ChatQuestionAnswerPromptTemplate({});

      expect(template.flatten()).toMatchSnapshot();
    });
  });
});
