/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import type { IModelAdapter } from '../../adapter.js';
import { DEFAULT_MAX_NEW_TOKENS } from '../../constants.js';
import type { Kwargs } from '../../types.js';

export const CLAUDE_V2_ADAPTER: IModelAdapter = {
  prompt: {
    chat: {
      base: {
        // every claude prompt must start with `\n\nHuman: `
        Header: '\n\nHuman: ',
        // every claude prompt must end with `\n\nAssistant: `
        Footer: '\n\nAssistant: ',
        // claude likes tags
        Body: '<system>{{>Instruction}}\n\n{{>Context}}\n\n</system>\n\n{{>Cue}}',
      },
      questionAnswer: {
        templatePartials: {
          Cue: 'Question: {{question}}',
          Delimiter: '<corpus>',
          Corpus: '<corpus>\n{{context}}\n</corpus>',
        },
      },
      condenseQuestion: {
        templatePartials: {
          Cue: 'Followup Question: {{question}}',
          Delimiter: '<dialog>',
          Dialog: '<dialog>\n{{>Messages}}\n\n</dialog>',
        },
      },
    },
  },
  contentHandler: {
    input: {
      promptKey: 'prompt',
    },
    output: {
      jsonpath: 'completion',
    },
  },
};

export const CLAUDE_V2_KWARGS: Kwargs = {
  temperature: 0,
  max_tokens_to_sample: DEFAULT_MAX_NEW_TOKENS,
  stop_sequences: ['\n\nHuman:'],
};
