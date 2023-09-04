/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  DynamoDBDocumentClient,
  QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { getMessageSourceKey, DDBMessageSource, getAllByPagination } from './util';

export async function listChatMessageSources(
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  userId: string,
  messageId: string,
  asc = true,
) {
  const keys = getMessageSourceKey(userId, messageId);
  const input: QueryCommandInput = {
    TableName: tableName,
    KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
    ExpressionAttributeValues: {
      ':PK': keys.PK,
      ':SK': keys.SK,
    },
    ScanIndexForward: asc,
  };

  // We've decided to return all chats for a user and then filter and paginate client side
  return getAllByPagination<DDBMessageSource>(documentClient, input);
}
