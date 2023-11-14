/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Logger } from '@aws-lambda-powertools/logger';
import { ConstructorOptions } from '@aws-lambda-powertools/logger/lib/types';

export { Logger } from '@aws-lambda-powertools/logger';

export const logger = new Logger();

export function getLogger(scope: string, options?: ConstructorOptions): Logger;
export function getLogger(attributes: Record<string, any>, options?: ConstructorOptions): Logger;
export function getLogger(scopeOrAttributes: string | Record<string, any>, options?: ConstructorOptions): Logger {
  let attributes: Record<string, any>;
  if (typeof scopeOrAttributes === 'string') {
    attributes = {
      scope: scopeOrAttributes,
    };
  } else {
    attributes = scopeOrAttributes;
  }

  return logger.createChild({
    ...options,
    persistentLogAttributes: {
      ...options?.persistentLogAttributes,
      ...attributes,
    },
  });
}

export type getLogger = typeof getLogger;
