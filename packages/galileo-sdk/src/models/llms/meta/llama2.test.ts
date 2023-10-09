/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
// @ts-ignore - .test files are ignored
import type {} from '@types/jest';
import { AIMessage, HumanMessage, SystemMessage } from 'langchain/schema';
import { LLAMA2_ADAPTER } from './llama2.js';
import { ChatCondenseQuestionPromptTemplate, ChatQuestionAnswerPromptTemplate } from '../../../prompt/templates/chat/index.js';
import { ModelAdapter } from '../../adapter.js';

describe('models/llms/meta/llama2', () => {
  describe('adapter', () => {
    const adapter = new ModelAdapter(LLAMA2_ADAPTER);

    test('should render qa prompt', async () => {
      const template = new ChatQuestionAnswerPromptTemplate({
        ...adapter.prompt?.chat?.questionAnswer,
      });
      expect(await template.format({
        question: 'THE QUESTION',
        domain: 'DOMAIN',
        context: 'THE CORPUS',
      })).toMatchSnapshot();
    });

    test('should render condense prompt', async () => {
      const template = new ChatCondenseQuestionPromptTemplate({
        ...adapter.prompt?.chat?.condenseQuestion,
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
  });
});
