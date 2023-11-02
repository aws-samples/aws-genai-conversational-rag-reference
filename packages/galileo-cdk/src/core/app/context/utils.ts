/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

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
