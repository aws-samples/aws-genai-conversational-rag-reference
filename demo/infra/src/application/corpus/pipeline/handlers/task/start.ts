/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { getPostgresTableName } from '@aws/galileo-sdk/lib/vectorstores/pgvector/utils';
import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { SFNClient, ListExecutionsCommand } from '@aws-sdk/client-sfn';
import middy from '@middy/core';
import errorLogger from '@middy/error-logger';
import inputOutputLogger from '@middy/input-output-logger';
import { findEmbeddingModelByRefKey } from 'corpus-logic/lib/embedding/util';

import { State } from '../../types';

const logger = new Logger();

const client = new SFNClient({});

async function lambdaHandler(state: State): Promise<State> {
  const stateMachineArn = state.StateMachine.Id;
  const executionArn = state.Execution.Id;

  const overrides: State = (state.Execution as any).Input || {};

  const environment = {
    ...state.Environment,
    ...overrides.Environment,
  };

  const modelRefKey = environment.EMBEDDING_MODEL_REF_KEY;
  const embeddingModel = findEmbeddingModelByRefKey(modelRefKey);

  // Add additional environment variables required by the following tasks
  environment.EMBEDDING_TABLENAME = getPostgresTableName(embeddingModel);
  environment.EMBEDDING_MODEL_ID = embeddingModel.modelId;
  environment.EMBEDDING_MODEL_VECTOR_SIZE = String(embeddingModel.dimensions);

  // Remove this environment variable as SageMaker processing job doesn't support the JSON string
  delete environment.EMBEDDINGS_SAGEMAKER_MODELS;

  const { executions } = await client.send(
    new ListExecutionsCommand({
      stateMachineArn,
      statusFilter: 'RUNNING',
    }),
  );

  const commonFields = {
    ...state,
    ...overrides,
    Environment: environment,
  };

  if (executions == null) {
    return {
      ...commonFields,
      ExecutionStatus: {
        IsRunning: false,
      },
    };
  }

  for (const execution of executions) {
    if (executionArn != execution.executionArn) {
      return {
        ...commonFields,
        ExecutionStatus: {
          IsRunning: true,
        },
      };
    }
  }

  return {
    ...commonFields,
    ExecutionStatus: {
      IsRunning: false,
    },
  };
}

export const handler = middy<State, State, Error, any>(lambdaHandler)
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(inputOutputLogger())
  .use(
    errorLogger({
      logger(error) {
        logger.error('Task failed with error:', error as Error);
      },
    }),
  );

export default handler;
