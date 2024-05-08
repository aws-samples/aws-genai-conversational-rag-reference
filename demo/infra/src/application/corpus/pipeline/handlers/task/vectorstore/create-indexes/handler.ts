/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Logger } from '@aws-lambda-powertools/logger';
import { ENV } from 'corpus-logic/lib/env';
import { indexVectorStore } from 'corpus-logic/lib/vectorstore/management';
import { State } from '../../../../types';

const logger = new Logger();

async function main(event: State): Promise<void> {
  logger.info({ message: 'corpus-logic env', env: ENV });

  logger.info('Indexing vector store...');
  await indexVectorStore(event.Environment.EMBEDDING_TABLENAME, event.Environment.EMBEDDING_MODEL_VECTOR_SIZE);
  logger.info('Vector store successfully indexed');
}

(async () => {
  await main();
})().catch(console.error);
