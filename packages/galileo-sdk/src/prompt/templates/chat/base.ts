/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import type Handlebars from 'handlebars';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from 'langchain/schema';
import { HandlebarsTemplatePartials } from '../../handlebars.js';

export interface BaseChatTemplatePartials extends HandlebarsTemplatePartials {
  /**
   * Marker for denoting a set of content, such as chat history and corpus context.
   * @default '''
   */
  readonly Delimiter: Handlebars.Template<any>;
  /**
   * Text for declaring the delimiter denotation. Such as, "the context denoted by '''"
   * @default "denoted by '''" - With ''' equal to Delimiter partial value
   */
  readonly DelimitedBy: Handlebars.Template<any>;
  /**
   * Newline (soft break)
   * @default \n
   */
  readonly LF: Handlebars.Template<any>;
  /**
   * Carriage return (hard break)
   * @default \n\n
   */
  readonly CR: Handlebars.Template<any>;

  /**
   * Root layout of the template which composes the header, body, and footer partials.
   */
  readonly Layout: Handlebars.Template<any>;
  /**
   * Header is the beginning of the prompt and can be used to enforce specific markup
   * before the main prompt as required by  LLM.
   * @default empty
   */
  readonly Header: Handlebars.Template<any>;
  /**
   * Footer is the ending of the prompt and can be used to enforce specific markup at
   * the end of every prompt as required by LLM.
   * @default empty
   */
  readonly Footer: Handlebars.Template<any>;
  /**
   * Body is used for content layout of the instruction, context, and cue partials, and is
   * placed between the header and footer.
   */
  readonly Body: Handlebars.Template<any>;
  /**
   * Context is the renderer for the chat history or corpus, which is the context of
   * information used to direct the LLM.
   */
  readonly Context: Handlebars.Template<{ corpus?: any; chat_history?: BaseMessage[] }>;

  /**
   * Separator between messages.
   */
  readonly MessageSeparator: Handlebars.Template<any>;
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
  readonly Messages: Handlebars.Template<{ messages: BaseMessage[] }>;
  /**
   * Layout and wrapper for chat history message dialog.
   */
  readonly Dialog: Handlebars.Template<{ messages: BaseMessage[] }>;

  /**
   * Renders the list of rules to instruct the LLM.
   */
  readonly Rules: Handlebars.Template<{ rules: string[] }>;

  /**
   * Renders the provided RAG search results used as knowledge for the LLM.
   */
  readonly Corpus: Handlebars.Template<{ corpus: any }>;
  // TODO: Document chains (Stuff, Reduce, etc) convert documents to string, but later will
  // submit a PR to support passing unprocessed list of source documents to the prompt
  // readonly Documents: Handlebars.Template<{ documents: Document[] }>;
  // readonly Document: Handlebars.Template<Document>;
}

export const BASE_CHAT_PARTIALS: BaseChatTemplatePartials = {
  LF: '\n',
  CR: '\n\n',
  Delimiter: "'''",
  DelimitedBy: ' delimited by {{>Delimiter}}',

  Layout: '{{>Header}}{{>Body}}{{>Footer}}',
  Header: '',
  Footer: '',
  Body: '{{>Instruction}}{{>CR}}{{>Context}}{{>CR}}{{>Cue}}',

  Rules: '{{#each rules}}{{add @index 1}}. {{.}}{{#isnt @last true}}{{>LF}}{{/isnt}}{{/each}}',

  MessageSeparator: '{{>LF}}',
  HumanMessage: 'Human: {{content}}',
  AIMessage: 'Assistant: {{content}}',
  SystemMessage: 'System: {{content}}',
  BaseMessage: '{{#if type}}{{type}}: {{/if}}{{content}}',

  Messages: `{{#each chat_history}}
{{#if (eq type "human")}}{{>HumanMessage}}
{{~else if (eq type "ai")}}{{>AIMessage}}
{{~else if (eq type "system")}}{{>SystemMessage}}
{{~else}}{{>BaseMessage}}
{{/if}}{{#isnt @last true}}{{>MessageSeparator}}{{/isnt}}{{/each}}`,
  Dialog: 'Dialog: {{>Delimiter}}{{>LF}}{{>Messages}}{{>LF}}{{>Delimiter}}',

  Corpus: 'Corpus: {{>Delimiter}}{{>LF}}{{context}}{{>LF}}{{>Delimiter}}',

  // determine "context" based on either corpus (qa) or dialog (condense)
  // This is a helper to support cross-prompt scaffolding with common body
  Context: '{{#if context}}{{>Corpus}}{{/if}}{{#if chat_history}}{{>Dialog}}{{/if}}',
} as const;

export interface ChatTemplatePartials extends BaseChatTemplatePartials {
  readonly Instruction: Handlebars.Template<any>;
  readonly Cue: Handlebars.Template<any>;
}
