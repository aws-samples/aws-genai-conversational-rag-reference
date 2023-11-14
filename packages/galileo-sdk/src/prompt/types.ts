/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { PromptTemplateInput } from 'langchain/prompts';
import { InputValues } from 'langchain/schema';
import type { Handlebars } from 'safe-handlebars/dist/handlebars.js';

// Extract the keys of required properties
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

// Extract the keys of optional properties
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

export type Inverse<T> = Partial<Pick<T, RequiredKeys<T>>> & Required<Pick<T, OptionalKeys<T>>>;

export type HandlebarsTemplatePartials = { [K: string]: Handlebars.Template<any> | undefined };

export interface HandlebarsPromptTemplateInput<
  TemplatePartials extends HandlebarsTemplatePartials,
  InputVariables extends InputValues,
  PartialVariables extends object = Inverse<InputVariables>,
> extends Omit<PromptTemplateInput<InputVariables, any>, 'partialVariables'> {
  readonly handlebars?: typeof Handlebars;
  readonly compileOptions?: CompileOptions;
  readonly runtimeOptions?: RuntimeOptions;
  readonly templatePartials?: TemplatePartials;
  readonly partialVariables?: PartialVariables;
}

export interface ScopedHandlebarsPromptTemplateInput<
  TemplatePartials extends HandlebarsTemplatePartials,
  InputVariables extends InputValues,
  PartialVariables extends object = Inverse<InputVariables>,
> extends Partial<
    Omit<
      HandlebarsPromptTemplateInput<TemplatePartials, InputVariables>,
      'inputVariables' | 'templatePartials' | 'partialVariables'
    >
  > {
  readonly templatePartials?: Partial<TemplatePartials>;
  readonly partialVariables?: Partial<PartialVariables>;
}

export interface HandlebarsPromptTemplateRuntime {
  /** Indicates if config is root and should not be merged on top of defaults */
  root?: boolean;
  /** The prompt template string in handlebars format */
  template: string;
  /** Mapping of handlebars partials to provide to the template */
  templatePartials?: HandlebarsTemplatePartials;
  /** Partial template data provided to template as default inputs */
  partialVariables?: { [key: string]: any };
  /** List of input variable names to template expects */
  inputVariables?: string[];
}

export type PromptRuntime = HandlebarsPromptTemplateRuntime;
