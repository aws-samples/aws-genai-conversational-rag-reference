/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import type Handlebars from 'handlebars';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from 'langchain/schema';
import { HandlebarsTemplatePartials } from '../../types.js';

export interface BaseChatTemplatePartials extends HandlebarsTemplatePartials {
  /**
   * Human message in chat history
   */
  readonly HumanMessage: Handlebars.Template<HumanMessage>;
  /**
   * AI message in chat history
   */
  readonly AIMessage: Handlebars.Template<AIMessage>;
  /**
   * System message in chat history
   */
  readonly SystemMessage: Handlebars.Template<SystemMessage>;
  /**
   * Default message in chat history
   */
  readonly BaseMessage: Handlebars.Template<BaseMessage>;
  /**
   * Renderer for chat history messages. Renders the specific message partials
   * based on the message type.
   */
  readonly ChatHistory: Handlebars.Template<{ messages: BaseMessage[] }>;

  // TODO: Document chains (Stuff, Reduce, etc) convert documents to string, but later will
  // submit a PR to support passing unprocessed list of source documents to the prompt
  // readonly Documents: Handlebars.Template<{ documents: Document[] }>;
  // readonly Document: Handlebars.Template<Document>;
}

export const BASE_CHAT_PARTIALS: BaseChatTemplatePartials = {
  HumanMessage: 'Human: {{content}}',
  AIMessage: 'Assistant: {{content}}',
  SystemMessage: 'System: {{content}}',
  BaseMessage: '{{#if type}}{{type}}: {{/if}}{{content}}',

  ChatHistory: `{{#each chat_history}}
{{#if (eq type "human")}}{{>HumanMessage}}
{{~else if (eq type "ai")}}{{>AIMessage}}
{{~else if (eq type "system")}}{{>SystemMessage}}
{{~else}}{{>BaseMessage}}{{/if}}
\n
{{/each}}`,
} as const;

export interface ChatTemplatePartials extends BaseChatTemplatePartials {}
