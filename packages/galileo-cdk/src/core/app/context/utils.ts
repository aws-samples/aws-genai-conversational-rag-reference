/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { IEmbeddingModelInfo } from '@aws/galileo-sdk/lib/models';

export function resolveList(
  value?: string | string[],
  defaultValue: string[] | undefined = undefined,
): string[] | undefined {
  if (value === '') {
    return defaultValue;
  }
  if (value == null) {
    return defaultValue;
  }

  if (Array.isArray(value)) {
    return value;
  }

  return value.split(/[,;]/g).map((v) => v.trim());
}

const TRUE_REGEX = /^(1|y(es)|t(rue)$)/i;
const FALSE_REGEX = /^(0|n(o)|f(false)$)/i;

export function resolveBoolean(value?: string | boolean, defaultValue: boolean = false): boolean {
  if (value == null) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return TRUE_REGEX.test(value);
}

export function resolveBooleanOrString(
  value?: string | boolean,
  defaultValue?: string | boolean,
): boolean | string | undefined {
  if (value == null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (TRUE_REGEX.test(value)) return true;
  if (FALSE_REGEX.test(value)) return true;
  return value;
}

/**
 * Sorts list of embedding models to have the "default" first, and rest sorted by modelId, to create a deterministic
 * and consistent list where default can be pulled from the first entry.
 * @param embeddingModels
 * @returns
 */
export function sortRagEmbeddingModels(embeddingModels: IEmbeddingModelInfo[]): IEmbeddingModelInfo[] {
  // make the default the first model, if no default the first is considered default
  return embeddingModels.sort((a, b) => {
    if (a.default) return -1;
    if (b.default) return 1;
    if (a.modelId < b.modelId) return -1;
    return 1;
  });
}
