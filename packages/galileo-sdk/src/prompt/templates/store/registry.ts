/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import assert from 'assert';
import { ChainType } from '../../../schema/index.js';
import { PromptRuntime } from '../../types.js';

export type PromptTemplateRegistry = Map<string, PromptRuntime>;

export type ChatTemplateTypedRuntimeRecord = { base?: Record<string, string> } & {
  [P in ChainType]: PromptRuntime;
};

export interface PromptTemplateId {
  readonly scope: string;
  readonly type: string;
  readonly subtype: string;
  readonly name: string;
}

export class PromptTemplateStore {
  static readonly DEFAULT = 'DEFAULT';
  // TODO: get these from enum after store is implemented
  static readonly SYSTEM_SCOPE = 'SYSTEM';
  static readonly CHAT_TYPE = 'CHAT';

  static get registry(): PromptTemplateRegistry {
    return this.__REGISTRY__;
  }

  static formatId(scope: string, type: string, subtype: string, name: string): string {
    return `${scope}#${type}#${subtype}#${name}`;
  }

  static parseId(value: string, validate?: Partial<PromptTemplateId>): PromptTemplateId {
    const [scope, type, subtype, name] = value.split('#');
    const parsedId = { scope, type, subtype, name };
    if (validate) {
      this.assetValidId(parsedId, validate);
    }
    return parsedId;
  }

  static assetValidId(actual: PromptTemplateId, expected: Partial<PromptTemplateId>) {
    if (expected.scope) {
      assert.equal(
        actual.scope,
        expected.scope,
        `Expected template id scope to be ${expected.scope}, found ${actual.scope}`,
      );
    }
    if (expected.type) {
      assert.equal(
        actual.type,
        expected.type,
        `Expected template id type to be ${expected.type}, found ${actual.type}`,
      );
    }
    if (expected.subtype) {
      assert.equal(
        actual.subtype,
        expected.subtype,
        `Expected template id subtype to be ${expected.subtype}, found ${actual.subtype}`,
      );
    }
    if (expected.name) {
      assert.equal(
        actual.name,
        expected.name,
        `Expected template id name to be ${expected.name}, found ${actual.name}`,
      );
    }
  }

  static getSystemChatId(type: ChainType, name: string): string {
    return this.formatId(this.SYSTEM_SCOPE, this.CHAT_TYPE, type, name);
  }

  static getSystemChatDefaultId(type: ChainType): string {
    return this.getSystemChatId(type, this.DEFAULT);
  }

  static getSystemChatTemplateRuntime(type: ChainType, name: string): PromptRuntime {
    const id = this.formatId(this.SYSTEM_SCOPE, this.CHAT_TYPE, type, name);
    const template = this.__REGISTRY__.get(id);
    if (template == null) {
      console.log('PromptTemplateStore:Registry: available ids', [...this.__REGISTRY__.keys()]);
      throw new Error(`System chat template does not exist: ${id}`);
    }
    return template;
  }

  /**
   * Registers a system chat template
   * @param type Chat template type
   * @param name identifier such as claude-v2
   * @param template Template definition
   * @returns Fully qualified uuid
   */
  static registerSystemChatTemplateRuntime(type: ChainType, name: string, template: PromptRuntime): string {
    const id = this.formatId(this.SYSTEM_SCOPE, this.CHAT_TYPE, type, name);
    this.__REGISTRY__.set(id, template);
    return id;
  }

  static registerSystemChatTemplateRuntimeMap(name: string, record: Partial<ChatTemplateTypedRuntimeRecord>) {
    if (record.base) {
      Object.values(ChainType).forEach((type) => {
        record[type] = {
          ...record[type],
          templatePartials: {
            ...record.base,
            ...record[type]?.templatePartials,
          },
        } as PromptRuntime;
      });
    }
    return Object.fromEntries(
      Object.entries(record)
        .filter(([key]) => Object.values(ChainType).includes(key as any))
        .map(([key, value]) => {
          return [key, this.registerSystemChatTemplateRuntime(key as ChainType, name, value as PromptRuntime)];
        }),
    );
  }

  private static readonly __REGISTRY__: PromptTemplateRegistry = new Map();
}
