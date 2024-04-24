/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { IEmbeddingModelInfo } from '../../models/types.js';

export function getPostgresTableName(model: IEmbeddingModelInfo): string {
  let tableName = `${model.uuid}_${model.dimensions}`;
  tableName = tableName.split('/').slice(-1)[0];
  tableName = tableName.toLowerCase();
  return tableName.replace(/[^a-z0-9_]+/g, '_');
}
