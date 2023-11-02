/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
export const NODE_ENV = process.env.NODE_ENV || 'production';
export const __TEST__ = NODE_ENV === 'test';
export const __DEV__ = NODE_ENV === 'development';

if (__TEST__) {
  process.env.AWS_DEFAULT_REGION ?? 'us-east-1';
}

export function env(key: keyof NodeJS.ProcessEnv, _default?: string, test_default?: any): string | undefined {
  if (__TEST__ && _default == null) {
    _default = JSON.stringify(test_default);
  }

  return process.env[key] || _default;
}

export function envBool(
  key: keyof NodeJS.ProcessEnv,
  _default: boolean = false,
  test_default: boolean = false,
): boolean {
  const value = String(env(key, _default ? '1' : '0', test_default ? '1' : '0'));
  return ['yes', 'y', 'true', '1'].includes(value.toLowerCase());
}
