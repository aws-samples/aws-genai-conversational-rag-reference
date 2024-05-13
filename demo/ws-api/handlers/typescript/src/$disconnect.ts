/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  $disconnectHandler,
  $DisconnectChainedLambdaHandlerFunction,
  INTERCEPTORS,
  LoggingInterceptor,
} from 'ws-api-typescript-runtime';

const DDB_TABLENAME = process.env.DDB_TABLENAME!;

const dynamodb = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamodb);

/**
 * Type-safe handler for the $disconnect event, invoked when a client disconnects from the websocket
 */
export const $disconnect: $DisconnectChainedLambdaHandlerFunction = async (request) => {
  const logger = LoggingInterceptor.getLogger(request);
  logger.info('Start $disconnect');

  // `connectionId` is the ID of the connection which has ended
  // `sdk` is used to send messages to connected clients
  const { connectionId, sdk } = request;

  try {
    await documentClient.send(
      new DeleteCommand({
        TableName: DDB_TABLENAME,
        Key: {
          PK: connectionId,
        },
      }),
    );
    logger.debug('connectionId deleted from DDB', { connectionId });
  } catch (err) {
    logger.error('Error while deleting connectionId from DDB', { err });
  }
};

/**
 * Entry point for the AWS Lambda handler for the $disconnect event.
 * The $disconnectHandler method wraps the type-safe handler and manages marshalling inputs
 */
export const handler = $disconnectHandler(...INTERCEPTORS, $disconnect);
