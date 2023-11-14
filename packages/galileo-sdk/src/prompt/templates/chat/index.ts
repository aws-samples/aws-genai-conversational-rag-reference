/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import CLASSIFY from './classify.js';
import CONDENSE_QUESTION from './condense-question.js';
import QA from './question-answer.js';
import { ChainType } from '../../../schema/index.js';
import { PromptRuntime } from '../../types.js';

export const CHAT_PROMPT_TEMPLATES: Record<ChainType, PromptRuntime> = {
  CLASSIFY,
  CONDENSE_QUESTION,
  QA,
};

export default CHAT_PROMPT_TEMPLATES;

export { QA, CLASSIFY, CONDENSE_QUESTION };
