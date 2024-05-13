/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { UpdateStatusCallbackOptions } from '@aws/galileo-sdk/lib/chat/callback';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { CreateChatMessageResponseContent } from 'api-typescript-runtime';
import {
  sendChatMessageHandler,
  SendChatMessageChainedHandlerFunction,
  INTERCEPTORS,
  LoggingInterceptor,
} from 'ws-api-typescript-runtime';
import { createMessage } from '../shared/create-message';
import { isAdmin } from '../shared/types';

const WSCONNECTIONS_TABLENAME = process.env.WSCONNECTIONS_TABLENAME!;

const dynamodb = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamodb);

/**
 * Type-safe handler for the SendChatMessage operation
 */
export const sendChatMessage: SendChatMessageChainedHandlerFunction = async (request) => {
  const logger = LoggingInterceptor.getLogger(request);

  logger.info('Start SendChatMessage Operation');

  // `input` contains the request input
  // `connectionId` is the ID of the connection which sent this request to the server.
  // `sdk` is used to send messages to connected clients
  const { input, connectionId, sdk } = request;

  logger.info('input', { message: JSON.stringify(input) });

  logger.info('Retrieving connection information', { connectionId });
  const userInfoResp = await documentClient.send(
    new GetCommand({
      TableName: WSCONNECTIONS_TABLENAME,
      Key: {
        PK: connectionId,
      },
    }),
  );

  if (userInfoResp.Item == null) {
    throw new Error('Error while retrieving user information');
  }

  const { idToken, userId, groups } = userInfoResp.Item;
  const _isAdmin = isAdmin(groups);

  const { chatId, tmpMessageId } = input;

  await sdk.updateInferenceStatus(connectionId, {
    chatId,
    messageId: tmpMessageId,
    updatedAt: Date.now(),
    operation: 'HandleSendMessage',
    status: 'STARTING',
    payload: input.question,
  });

  const result = await createMessage({
    logger,

    userId,
    idToken,
    isAdmin: _isAdmin,
    chatId,
    question: input.question,
    userConfigParam: input.options,

    engineCallbacks: {
      streamChunks: async (chunks: string[]) => {
        await sdk.streamLLMResponse(connectionId, {
          chatId,
          messageId: tmpMessageId,
          chunks,
        });
      },
      updateStatus: async (options: UpdateStatusCallbackOptions) => {
        await sdk.updateInferenceStatus(connectionId, {
          chatId,
          messageId: tmpMessageId,
          updatedAt: Date.now(),
          operation: options.operation,
          status: options.status,
          payload: options.payload,
        });
      },
    },
    useStreaming: true,
  });

  await sdk.updateInferenceStatus(connectionId, {
    chatId,
    messageId: tmpMessageId,
    updatedAt: Date.now(),
    operation: 'HandleSendMessage',
    status: 'SUCCESS',
    payload: result as CreateChatMessageResponseContent,
  });
};

/**
 * Entry point for the AWS Lambda handler for the SendChatMessage operation.
 * The sendChatMessageHandler method wraps the type-safe handler and manages marshalling inputs
 */
export const handler = sendChatMessageHandler(...INTERCEPTORS, sendChatMessage);
