/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  comparison as comparisonHelpers,
  string as stringHelpers,
  math as mathHelpers,
} from 'handlebars-helpers-lite';
import '../langchain/patch.js';
import { PromptTemplate, PromptTemplateInput } from 'langchain/prompts';
import { InputValues, PartialValues } from 'langchain/schema';
import { merge } from 'lodash';
import { Handlebars } from 'safe-handlebars/dist/handlebars.js';
import { allowUnsafeEval } from 'safe-handlebars/dist/utils.js';


// Extract the keys of required properties
type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

// Extract the keys of optional properties
type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

type Inverse<T> = Partial<Pick<T, RequiredKeys<T>>> & Required<Pick<T, OptionalKeys<T>>>

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
  PartialVariables extends object = Inverse<InputVariables>
> extends Partial<Omit<
  HandlebarsPromptTemplateInput<TemplatePartials, InputVariables>,
  'inputVariables' | 'templatePartials' | 'partialVariables'
  >> {
  readonly templatePartials?: Partial<TemplatePartials>;
  readonly partialVariables?: Partial<PartialVariables>;
}

export type HandlebarsPromptTemplateRuntime<T extends { [K: string]: any }> = Partial<Pick<T, 'template' | 'templatePartials' | 'partialVariables'>>

export class HandlebarsPromptTemplate<
  TemplatePartials extends HandlebarsTemplatePartials,
  InputVariables extends InputValues,
  PartialVariables extends object = Inverse<InputVariables>,
  TInput extends HandlebarsPromptTemplateInput<TemplatePartials, InputVariables, PartialVariables>
  = HandlebarsPromptTemplateInput<TemplatePartials, InputVariables, PartialVariables>,
  TSerialized extends TInput & { _type: string } = TInput & { _type: string },
> extends PromptTemplate<InputVariables, any>
  implements HandlebarsPromptTemplateInput<TemplatePartials, InputVariables, PartialVariables> {

  static async deserialize(data: any) {
    if (!data.template) {
      throw new Error('Prompt template must have a template');
    }
    return new HandlebarsPromptTemplate(data);
  }

  readonly handlebars: typeof Handlebars;
  readonly compileOptions?: CompileOptions;
  readonly runtimeOptions: RuntimeOptions;
  readonly templatePartials?: TemplatePartials;

  readonly partialVariables: any;

  constructor(input: TInput) {
    super({
      ...input,
      // disable validation
      validateTemplate: false,
      // @ts-ignore - invalid value but is on purpose to prevent default handling
      templateFormat: 'handlebars',
    });

    this.templatePartials = input.templatePartials;
    this.handlebars = input.handlebars || createHandlebarsRuntime(input.templatePartials || {});
    this.compileOptions = input.compileOptions;
    this.runtimeOptions = {
      ...input.runtimeOptions,
      allowedProtoProperties: {
        // Necessary for BaseMessage.prototype.type getter patch
        type: true,
        ...input.runtimeOptions?.allowedProtoProperties,
      },
    };
  }

  async partial<NewPartialVariableName extends string>(
    _values: PartialValues<NewPartialVariableName>,
  ): Promise<PromptTemplate> {
    throw new Error('Handlebars template does not support partial yet');
  }

  /**
   * Formats the prompt template with the provided values.
   * @param values The values to be used to format the prompt template.
   * @returns A promise that resolves to a string which is the formatted prompt.
   */
  async format(values: InputValues, options?: RuntimeOptions): Promise<string> {
    const allValues = await this.mergePartialAndUserVariables(values);
    const render = this.handlebars.compile(this.template, this.compileOptions);
    return render(allValues, merge({}, this.runtimeOptions, options)).trim();
  }

  async mergePartialAndUserVariables(
    userVariables: InputValues,
  ): Promise<InputValues & PartialVariables> {
    const partialVariables: PartialVariables = this.partialVariables ?? {};

    // TODO: support partial callback

    return {
      ...partialVariables,
      ...userVariables,
    };
  }

  serialize(): any {
    if (this.outputParser !== undefined) {
      throw new Error('Cannot serialize a prompt template with an output parser');
    }
    return {
      _type: this._getPromptType(),
      template: this.template,
      inputVariables: this.inputVariables,
      templateFormat: this.templateFormat,
      templatePartials: this.templatePartials,
      compileOptions: this.compileOptions,
      partialVariables: this.partialVariables,
    } as TSerialized;
  }

  /**
   * Flatten all template partials to create standalone template with
   * input value args only.
   * @experimental - Naive approach with regex replace, nothing fancy and likely to break. Is used only
   * for the UX experience for now.
   */
  flatten(): string {
    if (this.templatePartials == null) {
      return this.template;
    }

    const partialPattern = /(?<hspace>\s*)?(?<block>{{(?<htrim>~)?> ?(?<partial>\w+) ?(?<ttrim>~)?}})(?<tspace>\s*)?/;
    let template = this.template.slice();
    let match: RegExpExecArray | null;
    while ((match = partialPattern.exec(template)) != null) {
      const { block, hspace, htrim, partial, ttrim, tspace } = match.groups! as unknown as FlattenRegexGroups;
      if (partial in this.templatePartials) {
        let searchValue = block;
        let replacement = String(this.templatePartials[partial]);
        if (htrim && hspace) {
          searchValue = hspace + block;
        }
        if (ttrim && tspace) {
          searchValue += tspace;
        }
        template = template.replace(searchValue, replacement);
      }
    }
    return template;
  }
}

interface FlattenRegexGroups {
  block: string;
  hspace?: string;
  htrim?: string;
  partial: string;
  ttrim?: string;
  tspace?: string;
}

let _allowUnsafeEval: boolean;

export function createHandlebarsRuntime(partials: object): typeof Handlebars {
  if (_allowUnsafeEval == null) {
    _allowUnsafeEval = allowUnsafeEval();
  }

  const hb = Handlebars.create();

  if (!_allowUnsafeEval) {
    // Use safe-handlebars compiler
    hb.compile = hb.compileAST as any;
  }

  hb.registerHelper({
    ...stringHelpers,
    ...comparisonHelpers,
    ...mathHelpers,
  });

  Object.entries(partials).forEach(([key, value]) => {
    hb.registerPartial(key, value);
  });

  return hb;
}
