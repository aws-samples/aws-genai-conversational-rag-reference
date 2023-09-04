/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { listChatMessagesByTime } from "@aws-galileo/galileo-sdk/lib/chat/dynamodb/lib/messages";
import {
  parseNextToken,
  generateNextToken,
} from "@aws-galileo/galileo-sdk/lib/chat/dynamodb/lib/util";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { interceptors } from "api-typescript-interceptors";
import {
  ChatMessage,
  ListChatMessagesResponseContent,
  listChatMessagesHandler,
} from "api-typescript-runtime";

const dynamodb = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamodb);

export const handler = listChatMessagesHandler(
  ...interceptors,
  async ({ input, interceptorContext }) => {
    const tableName = process.env.TABLE_NAME;
    if (!tableName)
      throw new Error(`expected env variable TABLE_NAME but none was found`);

    const indexName = process.env.GSI_INDEX_NAME;
    if (!indexName)
      throw new Error(
        `expected env variable GSI_INDEX_NAME but none was found`
      );

    const userId = interceptorContext.callingIdentity?.identityId;
    if (!userId) throw new Error(`no userId was found in context`);

    const chatId = input.requestParameters.chatId;

    let pageSize = 20;
    try {
      if (input.requestParameters?.pageSize) {
        pageSize = parseInt(input.requestParameters?.pageSize);
      }
    } catch {}

    const nextToken = input.requestParameters.nextToken
      ? parseNextToken(input.requestParameters.nextToken)
      : undefined;

    const queryResults = await listChatMessagesByTime(
      documentClient,
      tableName,
      indexName,
      userId,
      chatId,
      false,
      pageSize,
      nextToken
    );

    const messages: ChatMessage[] = (queryResults.Items ?? []).map((record) => {
      return {
        chatId: record.chatId,
        messageId: record.messageId,
        createdAt: record.createdAt,
        text: record.data.content,
        type: record.type,
      };
    });

    if (input.requestParameters.reverse) {
      messages.reverse();
    }

    const newNextToken = queryResults.LastEvaluatedKey
      ? generateNextToken(queryResults.LastEvaluatedKey)
      : undefined;

    const response: ListChatMessagesResponseContent = {
      chatMessages: messages,
      nextToken: newNextToken,
    };

    return {
      statusCode: 200,
      body: response,
    };
  }
);
