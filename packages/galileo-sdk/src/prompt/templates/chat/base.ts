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

  /**
   * Renderer for context documents from retriever, which iterates of actual
   * Document objects to provide modifying how documents are rendered in the prompt.
   * By default langchain just joins the pageContent of each document with linebreak
   * separate, but you might want to augment this with prefix from metadata, or wrap
   * in different way.
   */
  readonly ContextDocuments: Handlebars.Template<{ context_documents: Document[] }>;
  /**
   * Renders a single Document object. By default just writes the `pageContent`
   * without modification. This will receive the full Document object, so you could
   * modify rendering based on metadata.
   */
  readonly Document: Handlebars.Template<Document>;
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

  ContextDocuments: `{{#each context_documents}}{{>Document}}\n\n{{/each}}`,
  Document: '{{pageContent}}',
} as const;

export interface ChatTemplatePartials extends BaseChatTemplatePartials {}
