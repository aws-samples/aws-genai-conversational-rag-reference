/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import glob from 'fast-glob';

/**
 * Break array into number of equal sized arrays, except last chunk might be less.
 */
export function chunkArray<T>(items: T[], count: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += count) {
    chunks.push(items.slice(i, i + count));
  }
  return chunks;
}

/**
 * Break array into multiple arrays each containing at most x items.
 */
export function shardArray<T>(items: T[], count: number): T[][] {
  if (items.length === 0) return [];
  return chunkArray(items, Math.ceil(items.length / count));
}

export async function globDir(dir: string, pattern: string): Promise<string[]> {
  const globPatterns = pattern.split(',');

  return glob(globPatterns, { cwd: dir });
}
