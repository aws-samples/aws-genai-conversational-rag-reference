/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import type Handlebars from 'handlebars';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from 'langchain/schema';
import { HandlebarsTemplatePartials } from '../../handlebars.js';

export interface BaseChatTemplatePartials extends HandlebarsTemplatePartials {
  readonly Layout: Handlebars.Template<any>;
  readonly Delimiter: Handlebars.Template<any>;
  readonly Header: Handlebars.Template<any>;
  readonly Footer: Handlebars.Template<any>;
  readonly Body: Handlebars.Template<any>;

  readonly Context: Handlebars.Template<{ corpus?: any; chat_history?: BaseMessage[] }>;

  readonly MessageSeparator: Handlebars.Template<any>;
  readonly HumanMessage: Handlebars.Template<HumanMessage>;
  readonly AIMessage: Handlebars.Template<AIMessage>;
  readonly SystemMessage: Handlebars.Template<SystemMessage>;
  readonly BaseMessage: Handlebars.Template<BaseMessage>;

  readonly Messages: Handlebars.Template<{ messages: BaseMessage[] }>;
  readonly Dialog: Handlebars.Template<{ messages: BaseMessage[] }>;

  readonly Rules: Handlebars.Template<{ rules: string[] }>;

  readonly Corpus: Handlebars.Template<{ corpus: any }>;

  // TODO: Document chains (Stuff, Reduce, etc) convert documents to string, but later will
  // submit a PR to support passing unprocessed list of source documents to the prompt
  // readonly Documents: Handlebars.Template<{ documents: Document[] }>;
  // readonly Document: Handlebars.Template<Document>;
}

export const BASE_CHAT_PARTIALS: BaseChatTemplatePartials = {
  Delimiter: "'''",
  Layout: '{{>Header}}{{>Body}}{{>Footer}}',
  Header: '',
  Footer: '',
  Body: '{{>Instruction}}\n\n{{>Context}}\n\n{{>Cue}}',

  Rules: '{{#each rules}}{{add @index 1}}. {{.}}\n{{/each}}',

  MessageSeparator: '\n\n',
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
  Dialog: 'Dialog: {{>Delimiter}}\n{{>Messages}}\n{{>Delimiter}}',

  Corpus: 'Corpus: {{>Delimiter}}\n{{context}}\n{{>Delimiter}}',

  // determine "context" based on either corpus (qa) or dialog (condense)
  // This is a helper to support cross-prompt scaffolding with common body
  Context: `
{{~#if context}}{{>Corpus}}{{/if~}}
{{~#if chat_history}}{{>Dialog}}{{/if~}}
`,

} as const;

export interface ChatTemplatePartials extends BaseChatTemplatePartials {
  readonly Instruction: Handlebars.Template<any>;
  readonly Cue: Handlebars.Template<any>;
}
