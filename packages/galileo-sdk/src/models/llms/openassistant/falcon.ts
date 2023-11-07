/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { CHAT_QUESTION_ANSWER_TEMPLATE } from '../../../prompt/index.js';
import type { IModelAdapter } from '../../adapter.js';
import { DEFAULT_MAX_NEW_TOKENS } from '../../constants.js';
import type { Kwargs } from '../../types.js';

export const FALCON_ADAPTER: IModelAdapter = {
  prompt: {
    chat: {
      base: {
        AIMessage: '<|assistant|>{{content}}<|endoftext|>',
        HumanMessage: '<|prompter|>{{content}}<|endoftext|>',
        SystemMessage: '<|system|>{{content}}<|endoftext|>',
      },
      questionAnswer: {
        template: CHAT_QUESTION_ANSWER_TEMPLATE.replace(
          /Question: {{question}}.*$/i,
          'Question: <|prompter|>{{question}}<|endoftext|>\n\nAnswer: <|assistant|>',
        ),
      },
    },
  },
  contentHandler: {
    input: {
      promptKey: 'inputs',
      modelKwargsKey: 'parameters',
    },
    output: {
      jsonpath: '[0].generated_text',
    },
  },
};

export const FALCON_MODEL_KWARGS: Kwargs = {
  do_sample: true,
  top_p: 0.6,
  temperature: 0.001,
  top_k: 30,
  max_new_tokens: DEFAULT_MAX_NEW_TOKENS,
  repetition_penalty: 1.03,
  stop: ['<|endoftext|>'],
  return_full_text: false,
  typical_p: 0.2,
};
