/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { randomUUID } from 'crypto';
import { customAlphabet } from 'nanoid';

/**
 * Generates a unique UUID for a resource prefixed by the given string
 */
export const generateUUID = (prefix?: string) => {
  const id = randomUUID();
  if (prefix) {
    return `${prefix}-${id}`;
  }
  return id;
};

/**
 * Generates a unique nanoid for a resource prefixed by the given string.
 * Only uses `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz` for alphabet.
 */
export const generateUniqueId = (prefix?: string, size: number = 10) => {
  const id = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', size)();
  if (prefix) {
    return `${prefix}-${id}`;
  }
  return id;
};
