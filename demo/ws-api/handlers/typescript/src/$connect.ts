/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import {
  $connectHandler,
  $ConnectChainedLambdaHandlerFunction,
  INTERCEPTORS,
  LoggingInterceptor,
  $PendingConnection,
} from 'ws-api-typescript-runtime';

const userPoolId = process.env.USER_POOL_ID!;
const clientId = process.env.CLIENT_ID!;
const DDB_TABLENAME = process.env.DDB_TABLENAME!;

const dynamodb = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamodb);

/**
 * Type-safe handler for the $connect event, invoked when a new client connects to the websocket
 */
export const $connect: $ConnectChainedLambdaHandlerFunction = async (request) => {
  const logger = LoggingInterceptor.getLogger(request);

  logger.info('Start $connect', { request });

  // `connectionId` is the ID of the new connection
  // `sdk` is used to send messages to connected clients
  // Note that you cannot send messages to the new connection until after this function returns
  const { connectionId, sdk } = request;

  const eventObjRaw = request.event as any;
  const encodedToken = eventObjRaw.queryStringParameters?.authToken;

  if (!encodedToken) {
    throw new Error('authToken not found in query string');
  }

  const verifier = CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: 'id',
    clientId,
  });
  const payload = await verifier.verify(encodedToken);
  logger.info('Token is valid', { payload });

  try {
    await documentClient.send(
      new PutCommand({
        TableName: DDB_TABLENAME,
        Item: {
          PK: connectionId,
          userId: payload.sub,
          groups: payload['cognito:groups'],
          idToken: encodedToken,
          createdAt: Date.now(),
        },
      }),
    );
    logger.debug('connectionId saved to DDB', { connectionId, payload });
  } catch (err) {
    logger.error('Error while saving connectionId into DDB', { err });

    $PendingConnection.of(request).deny();
  }

  // Use the below to allow or deny the incoming connection (when the lambda returns).
  // The connection is allowed by default.
  $PendingConnection.of(request).allow();
};

/**
 * Entry point for the AWS Lambda handler for the $connect event.
 * The $connectHandler method wraps the type-safe handler and manages marshalling inputs
 */
export const handler = $connectHandler(...INTERCEPTORS, $connect);
