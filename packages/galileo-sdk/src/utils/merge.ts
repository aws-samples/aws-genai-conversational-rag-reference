/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { compact, findLastIndex, mergeWith } from 'lodash';

/**
 * Merges configures using deep merge, except for arrays which are replaced (legacy lodash merge style).
 * It will merge from the right most "root" config, similar to eslint style merging.
 * @param configs List of configs to merge
 * @returns Returns merged configs
 */
export function mergeConfig<T extends { root?: boolean }>(...configs: T[]): T {
  configs = compact(configs);
  if (configs.length <= 1) return configs[0];
  // only take right from right-most root
  const rootIndex = findLastIndex(configs, (config) => config.root === true);
  configs = configs.slice(rootIndex || 0);

  return mergeWith({}, ...configs, (_old: any, _src: any) => {
    if (_src && Array.isArray(_src)) return _src;
    return undefined;
  });
}
