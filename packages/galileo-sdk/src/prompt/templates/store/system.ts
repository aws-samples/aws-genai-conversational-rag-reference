/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { PromptTemplateStore } from './registry.js';
import { CLAUDE_ADAPTER } from '../../../models/llms/anthropic/claude.js';
import { LLAMA2_ADAPTER } from '../../../models/llms/meta/llama2.js';
import { FALCON_ADAPTER } from '../../../models/llms/openassistant/falcon.js';
import { CHAT_PROMPT_TEMPLATES } from '../chat/index.js';

export enum PromptTemplateStoreSystemId {
  DEFAULT = 'DEFAULT',
  ANTHROPIC_CLAUDE_V2 = 'anthropic.claude-v2',
  ANTHROPIC_CLAUDE_V3_HAIKU = 'anthropic.claude-3-haiku-20240307-v1:0',
  ANTHROPIC_CLAUDE_V3_SONNET = 'anthropic.claude-3-sonnet-20240229-v1:0',
  OPENASSISTANT_FALCON = 'openassistant.falcon',
  META_LLAMA_2 = 'meta.llama2',
}

PromptTemplateStore.registerSystemChatTemplateRuntimeMap(PromptTemplateStoreSystemId.DEFAULT, CHAT_PROMPT_TEMPLATES);

PromptTemplateStore.registerSystemChatTemplateRuntimeMap(
  PromptTemplateStoreSystemId.ANTHROPIC_CLAUDE_V2,
  CLAUDE_ADAPTER.prompt?.chat || {},
);

PromptTemplateStore.registerSystemChatTemplateRuntimeMap(
  PromptTemplateStoreSystemId.ANTHROPIC_CLAUDE_V3_HAIKU,
  CLAUDE_ADAPTER.prompt?.chat || {},
);

PromptTemplateStore.registerSystemChatTemplateRuntimeMap(
  PromptTemplateStoreSystemId.ANTHROPIC_CLAUDE_V3_SONNET,
  CLAUDE_ADAPTER.prompt?.chat || {},
);

PromptTemplateStore.registerSystemChatTemplateRuntimeMap(
  PromptTemplateStoreSystemId.OPENASSISTANT_FALCON,
  FALCON_ADAPTER.prompt?.chat || {},
);

PromptTemplateStore.registerSystemChatTemplateRuntimeMap(
  PromptTemplateStoreSystemId.META_LLAMA_2,
  LLAMA2_ADAPTER.prompt?.chat || {},
);
