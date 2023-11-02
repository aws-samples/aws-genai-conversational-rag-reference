/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { deleteChatMessage } from '@aws/galileo-sdk/lib/chat/dynamodb/lib/messages';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { interceptors } from 'api-typescript-interceptors';
import { DeleteChatMessageResponseContent, deleteChatMessageHandler } from 'api-typescript-runtime';

const dynamodb = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamodb);

export const handler = deleteChatMessageHandler(...interceptors, async ({ input, interceptorContext }) => {
  const tableName = process.env.TABLE_NAME;
  if (!tableName) throw new Error(`expected env variable TABLE_NAME but none was found`);

  const userId = interceptorContext.callingIdentity?.identityId;
  if (!userId) throw new Error(`no userId was found in context`);

  const chatId = input.requestParameters.chatId;
  const messageId = input.requestParameters.messageId;

  await deleteChatMessage(documentClient, tableName, userId, messageId);

  const response: DeleteChatMessageResponseContent = {
    chatId,
    messageId,
  };

  return {
    statusCode: 200,
    body: response,
  };
});
