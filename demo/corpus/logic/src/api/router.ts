/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { logMetrics } from '@aws-lambda-powertools/metrics';
import middy from '@middy/core';
import errorLogger from '@middy/error-logger';
import httpRouterHandler from '@middy/http-router';
import inputOutputLogger from '@middy/input-output-logger';
import { OperationLookup } from 'api-typescript-runtime';
import * as handlers from './handlers';
import { metrics } from '../metrics';

metrics.addDimension('component', 'CorpusApi');

export const handler = middy()
  .use(inputOutputLogger())
  .use(errorLogger())
  .handler(
    httpRouterHandler([
      {
        method: OperationLookup.similaritySearch.method as any,
        path: OperationLookup.similaritySearch.path,
        handler: middy().handler(handlers.similaritySearch),
      },
      {
        method: OperationLookup.embedDocuments.method as any,
        path: OperationLookup.embedDocuments.path,
        handler: middy().handler(handlers.embedDocuments),
      },
      {
        method: OperationLookup.embedQuery.method as any,
        path: OperationLookup.embedQuery.path,
        handler: middy().handler(handlers.embedQuery),
      },
    ]),
  )
  .use(logMetrics(metrics));
