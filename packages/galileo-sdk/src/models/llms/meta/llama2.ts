/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import type { IModelAdapter } from '../../adapter.js';
import { DEFAULT_MAX_NEW_TOKENS } from '../../constants.js';
import type { Kwargs } from '../../types.js';

export const LLAMA2_ADAPTER: IModelAdapter = {
  prompt: {},
  contentHandler: {
    input: {
      promptKey: 'inputs',
      modelKwargsKey: 'parameters',
    },
    output: {
      jsonpath: '[0].generation',
    },
  },
};

export const LLAMA2_KWARGS: Kwargs = {
  temperature: 0.6,
  top_p: 0.9,
  repetition_penalty: 1.1,
  max_new_tokens: DEFAULT_MAX_NEW_TOKENS,
};

export const LLAMA2_ENDPOINT_KWARGS: Kwargs = {
  CustomAttributes: 'accept_eula=true',
};

/*
Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{{#each chat_history}}
{{#if (eq type "human")}}Human: {{content}}
{{~else if (eq type "ai")}}Assistant: {{content}}
{{~else if (eq type "system")}}System: {{content}}
{{~else}}{{#if type}}{{type}}: {{/if}}{{content}}
{{/if}}{{#isnt @last true}}
{{/isnt}}{{/each}}

Follow Up Input: {{question}}
Standalone question:
*/
