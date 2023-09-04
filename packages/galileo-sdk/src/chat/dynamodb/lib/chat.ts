/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommandInput,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { getAllChatMessageIds } from './messages';
import { listChatMessageSources } from './sources';
import {
  getChatKey,
  getChatsByTimeKey,
  DDBChat,
  bulkDelete,
  Keys,
  DDBUpdateOutput,
  getAllByPagination,
} from './util';

export async function createChat(
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  userId: string,
  title: string,
) {
  const newChatSessionId = uuidv4();

  const timestamp = Date.now();
  const keys = getChatKey(userId, newChatSessionId);
  const gsiKeys = getChatsByTimeKey(userId, `${timestamp}`);
  const chat: DDBChat = {
    chatId: newChatSessionId,
    title: title,
    createdAt: timestamp,
    userId: userId,
    ...keys,
    ...gsiKeys,
    entity: 'CHAT',
  };

  const command = new PutCommand({
    TableName: tableName,
    Item: chat,
    ReturnValues: 'NONE',
  });

  const response = await documentClient.send(command);

  return {
    response,
    chat,
  };
}

export async function listAllChatsByTime(
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  indexName: string,
  userId: string,
  asc = false,
) {
  const keys = getChatsByTimeKey(userId);

  const commandInput: QueryCommandInput = {
    TableName: tableName,
    IndexName: indexName,
    KeyConditionExpression: 'GSI1PK = :PK',
    ExpressionAttributeValues: {
      ':PK': keys.GSI1PK,
    },
    ScanIndexForward: asc,
  };

  // We've decided to return all chats for a user and then filter and paginate client side
  return getAllByPagination<DDBChat>(documentClient, commandInput);
}

export async function updateChat(
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  userId: string,
  chatId: string,
  title: string,
) {
  const keys = getChatKey(userId, chatId);

  const command = new UpdateCommand({
    TableName: tableName,
    Key: keys,
    ConditionExpression: 'attribute_exists(PK) and attribute_exists(SK)',
    UpdateExpression: 'set title = :title',
    ExpressionAttributeValues: {
      ':title': title,
    },
    ReturnValues: 'ALL_NEW',
  });

  const result = (await documentClient.send(
    command,
  )) as DDBUpdateOutput<DDBChat>;
  return result.Attributes;
}

async function deleteChat(
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  userId: string,
  chatId: string,
) {
  const keys = getChatKey(userId, chatId);

  const command = new DeleteCommand({
    TableName: tableName,
    Key: keys,
    ReturnValues: 'ALL_OLD',
  });

  return documentClient.send(command);
}

export async function deleteChatAndMessages(
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  indexName: string,
  userId: string,
  chatId: string,
) {
  // For now we'll perform all the delete actions in a single lambda
  // We might want to consider creating a job queue for deleting the chatMessages async
  const chatMessageKeys = await getAllChatMessageIds(
    documentClient,
    tableName,
    indexName,
    userId,
    chatId,
  );

  let chatMessageSourceKeys: Keys[] = [];
  for (const messageKeys of chatMessageKeys) {
    const response = await listChatMessageSources(
      documentClient,
      tableName,
      userId,
      messageKeys.messageId,
    );
    if (response) {
      chatMessageSourceKeys = [
        ...chatMessageSourceKeys,
        ...response,
      ];
    }
  }

  const deleteKeys = [...chatMessageKeys, ...chatMessageSourceKeys].map(k => ({ PK: k.PK, SK: k.SK }));

  console.log(`found ${chatMessageKeys.length} messages`);
  console.log(`total records to delete: ${deleteKeys.length}`);

  if (chatMessageKeys.length > 0) {
    await bulkDelete(documentClient, tableName, deleteKeys);
  }
  await deleteChat(documentClient, tableName, userId, chatId);
}
