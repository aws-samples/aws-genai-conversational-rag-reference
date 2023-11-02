/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { listAllChatsByTime } from '@aws/galileo-sdk/lib/chat/dynamodb/lib/chat';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { interceptors } from 'api-typescript-interceptors';
import { Chat, ListChatsResponseContent, listChatsHandler } from 'api-typescript-runtime';

const dynamodb = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamodb);

export const handler = listChatsHandler(...interceptors, async ({ interceptorContext }) => {
  const tableName = process.env.TABLE_NAME;
  if (!tableName) throw new Error(`expected env variable TABLE_NAME but none was found`);

  const indexName = process.env.GSI_INDEX_NAME;
  if (!indexName) throw new Error(`expected env variable GSI_INDEX_NAME but none was found`);

  const userId = interceptorContext.callingIdentity?.identityId;
  if (!userId) throw new Error(`no userId was found in context`);

  const items = await listAllChatsByTime(documentClient, tableName, indexName, userId);

  // Map from database item type to application type
  const chats: Chat[] = items.map((record) => {
    return {
      chatId: record.chatId,
      title: record.title,
      userId: record.userId,
      createdAt: record.createdAt,
    };
  });

  const response: ListChatsResponseContent = {
    chats,
  };

  return {
    statusCode: 200,
    body: response,
  };
});
