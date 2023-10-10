/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  BatchWriteCommand,
  BatchWriteCommandOutput,
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandOutput,
  QueryCommand,
  QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { Document } from 'langchain/document';
import { v4 as uuidv4 } from 'uuid';
import { listChatMessageSources } from './sources.js';
import {
  getChatMessagesByTimeKey,
  DDBQueryOutput,
  DDBChatMessage,
  getChatMessageKey,
  Keys,
  DDBMessageSource,
  getMessageSourceKey,
  bulkDelete,
  AllKeys,
  getAllByPagination,
} from './util.js';
import { startPerfMetric } from '../../../common/metrics/index.js';

export interface CreateHumanChatMessageResponse {
  readonly response: PutCommandOutput;
  readonly chatMessage: DDBChatMessage;
}

export async function createHumanChatMessage(
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  userId: string,
  chatId: string,
  content: string,
): Promise<CreateHumanChatMessageResponse> {
  const newChatMessageId = uuidv4();

  const timestamp = Date.now();
  const keys = getChatMessageKey(userId, newChatMessageId);
  const gsiKeys = getChatMessagesByTimeKey(userId, chatId, `${timestamp}`);
  const chatMessage: DDBChatMessage = {
    chatId: chatId,
    messageId: newChatMessageId,
    createdAt: timestamp,
    userId: userId,
    type: 'human',
    data: {
      content,
    },
    ...keys,
    ...gsiKeys,
    entity: 'MESSAGE',
  };

  const command = new PutCommand({
    TableName: tableName,
    Item: chatMessage,
    ReturnValues: 'NONE',
  });

  const response = await documentClient.send(command);

  return {
    response,
    chatMessage,
  };
}

export interface CreateAIChatMessageResponse {
  readonly response: BatchWriteCommandOutput;
  readonly chatMessage: DDBChatMessage;
  readonly sources: DDBMessageSource[];
}

export async function createAIChatMessage(
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  userId: string,
  chatId: string,
  content: string,
  sources: Document[],
): Promise<CreateAIChatMessageResponse> {
  const newChatMessageId = uuidv4();

  const timestamp = Date.now();
  const keys = getChatMessageKey(userId, newChatMessageId);
  const gsiKeys = getChatMessagesByTimeKey(userId, chatId, `${timestamp}`);
  const chatMessage: DDBChatMessage = {
    chatId: chatId,
    messageId: newChatMessageId,
    createdAt: timestamp,
    userId: userId,
    type: 'ai',
    data: {
      content,
    },
    ...keys,
    ...gsiKeys,
    entity: 'MESSAGE',
  };

  const sourcePutRequests = sources.map((source, idx) => {
    const sourceId = idx + '';
    const sourceKeys = getMessageSourceKey(userId, newChatMessageId, sourceId);
    const ddbSource: DDBMessageSource = {
      ...sourceKeys,
      sourceId,
      userId,
      chatId,
      messageId: newChatMessageId,
      createdAt: timestamp,
      entity: 'SOURCE',
      pageContent: source.pageContent,
      metadata: source.metadata,
    };
    return {
      PutRequest: {
        Item: ddbSource,
      },
    };
  });

  const command = new BatchWriteCommand({
    RequestItems: {
      [tableName]: [
        {
          PutRequest: {
            Item: chatMessage,
          },
        },
        ...sourcePutRequests,
      ],
    },
  });

  const response = await documentClient.send(command);

  return {
    response,
    chatMessage,
    sources: sourcePutRequests.map(v => v.PutRequest.Item),
  };
}

export async function listChatMessagesByTime(
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  indexName: string,
  userId: string,
  chatId: string,
  asc = false,
  limit = 20,
  nextToken?: AllKeys,
) {
  const $$ = startPerfMetric('DDBChatMessages_listChatMessagesByTime');

  const keys = getChatMessagesByTimeKey(userId, chatId);

  const input: QueryCommandInput = {
    TableName: tableName,
    IndexName: indexName,
    KeyConditionExpression: 'GSI1PK = :PK',
    ExpressionAttributeValues: {
      ':PK': keys.GSI1PK,
    },
    Limit: limit,
    ScanIndexForward: asc,
    ExclusiveStartKey: nextToken,
  };
  const command = new QueryCommand(input);

  const response = (await documentClient.send(command)) as DDBQueryOutput<
  DDBChatMessage,
  AllKeys
  >;

  $$();
  return response;
}

export async function listAllMessagesByTime(
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  indexName: string,
  userId: string,
  chatId: string,
  asc = false,
  limit = 20,
): Promise<DDBChatMessage[]> {
  const $$ = startPerfMetric('DDBChatMessages_listAllMessagesByTime');

  const keys = getChatMessagesByTimeKey(userId, chatId);
  const commandInput: QueryCommandInput = {
    TableName: tableName,
    IndexName: indexName,
    KeyConditionExpression: 'GSI1PK = :PK',
    ExpressionAttributeValues: {
      ':PK': keys.GSI1PK,
    },
    Limit: limit,
    ScanIndexForward: asc,
  };

  const response = await getAllByPagination<DDBChatMessage>(documentClient, commandInput);

  $$();

  return response;
}

export async function getAllChatMessageIds(
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  indexName: string,
  userId: string,
  chatId: string,
) {
  type ChatMessageIds = (Keys & { messageId: string });
  const keys = getChatMessagesByTimeKey(userId, chatId);

  const commandInput: QueryCommandInput = {
    TableName: tableName,
    IndexName: indexName,
    KeyConditionExpression: 'GSI1PK = :GSI1PK',
    ProjectionExpression: 'PK, SK, messageId',
    ExpressionAttributeValues: {
      ':GSI1PK': keys.GSI1PK,
    },
  };

  return getAllByPagination<ChatMessageIds>(documentClient, commandInput);
}

export async function deleteChatMessage(
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  userId: string,
  messageId: string,
) {
  const keysToDelete: Keys[] = [];
  const keys = getChatMessageKey(userId, messageId);
  keysToDelete.push(keys);

  const messageSourcesResult = await listChatMessageSources(
    documentClient,
    tableName,
    userId,
    messageId,
  );

  for (const messageSource of messageSourcesResult) {
    keysToDelete.push({
      PK: messageSource.PK,
      SK: messageSource.SK,
    });
  }

  return bulkDelete(documentClient, tableName, keysToDelete);
}
