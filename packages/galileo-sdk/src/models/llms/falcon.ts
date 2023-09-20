/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { IModelAdapter } from '../adapter.js';
import { Kwargs } from '../types.js';

export const FALCON_ADAPTER: IModelAdapter = {
  // https://huggingface.co/blog/llama2#how-to-prompt-llama-2
  prompt: {
    ai: { open: '<|assistant|>', close: '<|endoftext|>' },
    human: { open: '<|prompter|>', close: '<|endoftext|>' },
    system: { open: '<|system|>', close: '<|endoftext|>' },
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
  max_new_tokens: 2048,
  repetition_penalty: 1.03,
  stop: ['<|endoftext|>'],
  return_full_text: false,
  typical_p: 0.2,
};
