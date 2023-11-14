/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { isEmpty } from 'lodash';
import { PromptTemplateStore } from './registry.js';
import { getLogger } from '../../../common/index.js';
import { ChainType } from '../../../schema/index.js';
import { mergeConfig } from '../../../utils/merge.js';
import { HandlebarsPromptTemplate } from '../../handlebars.js';
import { PromptRuntime } from '../../types.js';
import './system.js'; // loads all system prompts into the store

const logger = getLogger('prompt/templates/store/resolver');

export async function resolvePromptTemplateByChainType(
  type: ChainType,
  ...runtime: (string | Partial<PromptRuntime> | undefined)[]
): Promise<HandlebarsPromptTemplate<any, any>> {
  runtime = [PromptTemplateStore.getSystemChatDefaultId(type), ...runtime];
  // resolve runtime template from id if a string
  // TODO: optimize this to only fetch from right-most root
  const resolvedRuntimes: PromptRuntime[] = runtime
    .filter((v) => v != null)
    .map((_runtime) => {
      if (typeof _runtime === 'string') {
        // TODO: support non-system string templates
        const parsedId = PromptTemplateStore.parseId(_runtime, {
          scope: PromptTemplateStore.SYSTEM_SCOPE,
          type: PromptTemplateStore.CHAT_TYPE,
          subtype: type,
        });
        return PromptTemplateStore.getSystemChatTemplateRuntime(type, parsedId.name);
      }
      return _runtime;
    })
    .map((_runtime: any) => {
      if (_runtime.template && isEmpty(_runtime.template)) {
        return {
          ..._runtime,
          template: undefined,
        };
      }
      return _runtime;
    }) as PromptRuntime[];

  const mergedRuntime = mergeConfig<PromptRuntime>(
    // TODO: fetch application default from config store once implemented
    ...(resolvedRuntimes as any),
  );

  logger.debug(`resolvePromptTemplateByChainType(${type})`, {
    final: mergedRuntime,
    unresolved: runtime,
    resolved: resolvedRuntimes,
  });

  return new HandlebarsPromptTemplate({
    inputVariables: [],
    ...mergedRuntime,
  });
}
