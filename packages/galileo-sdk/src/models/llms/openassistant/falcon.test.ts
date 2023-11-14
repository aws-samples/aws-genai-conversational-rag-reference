/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
// @ts-ignore - .test files are ignored
import type {} from '@types/jest';
import { AIMessage, HumanMessage, SystemMessage } from 'langchain/schema';
import { FALCON_ADAPTER } from './falcon';
import { resolvePromptTemplateByChainType } from '../../../prompt/templates/store/resolver.js';
import { ChainType } from '../../../schema';
import { ModelAdapter } from '../../adapter';

describe('models/llms/openassistant/falcon', () => {
  describe('adapter', () => {
    const adapter = new ModelAdapter(FALCON_ADAPTER);

    test('should render qa prompt', async () => {
      const template = await resolvePromptTemplateByChainType(ChainType.QA, adapter.prompt?.chat?.QA);

      expect(
        await template.format({
          question: 'THE QUESTION',
          context: 'THE CORPUS',
        }),
      ).toMatchSnapshot();
    });

    test('should render condense prompt', async () => {
      const template = await resolvePromptTemplateByChainType(
        ChainType.CONDENSE_QUESTION,
        adapter.prompt?.chat?.CONDENSE_QUESTION,
      );

      expect(
        await template.format({
          question: 'THE QUESTION',
          chat_history: [new SystemMessage('A system message'), new HumanMessage('Hi'), new AIMessage('Hello!')],
        }),
      ).toMatchSnapshot();
    });
  });
});
