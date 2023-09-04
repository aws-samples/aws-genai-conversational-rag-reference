/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
export function normalizePostgresTableName(tableName: string): string {
  tableName = tableName.split('/').slice(-1)[0];
  tableName = tableName.toLowerCase();
  return tableName.replace(/[^a-z0-9_]+/g, '_');
}
