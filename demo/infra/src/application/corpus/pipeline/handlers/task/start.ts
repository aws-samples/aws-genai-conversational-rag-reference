/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { SFNClient, ListExecutionsCommand } from '@aws-sdk/client-sfn';
import middy from '@middy/core';
import errorLogger from '@middy/error-logger';
import inputOutputLogger from '@middy/input-output-logger';
import { State } from '../../types';

const logger = new Logger();

const client = new SFNClient({});

async function lambdaHandler(state: State): Promise<State> {
  const stateMachineArn = state.StateMachine.Id;
  const executionArn = state.Execution.Id;

  const overrides: State = (state.Execution as any).Input || {};

  const { executions } = await client.send(
    new ListExecutionsCommand({
      stateMachineArn,
      statusFilter: 'RUNNING',
    }),
  );

  if (executions == null) {
    return {
      ...state,
      ...overrides,
      ExecutionStatus: {
        IsRunning: false,
      },
    };
  }

  for (const execution of executions) {
    if (executionArn != execution.executionArn) {
      return {
        ...state,
        ...overrides,
        ExecutionStatus: {
          IsRunning: true,
        },
      };
    }
  }

  return {
    ...state,
    ...overrides,
    Environment: {
      ...state.Environment,
      ...overrides.Environment,
    },
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
