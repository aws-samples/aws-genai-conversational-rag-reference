/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { listChatMessageSources } from "@aws-galileo/galileo-sdk/lib/chat/dynamodb/lib/sources";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { interceptors } from "api-typescript-interceptors";
import {
  ChatMessageSource,
  ListChatMessageSourcesResponseContent,
  listChatMessageSourcesHandler,
} from "api-typescript-runtime";

const dynamodb = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamodb);

export const handler = listChatMessageSourcesHandler(
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

    const messageId = input.requestParameters.messageId;
    const Items = await listChatMessageSources(
      documentClient,
      tableName,
      userId,
      messageId
    );

    const messages: ChatMessageSource[] = Items.map((record) => {
      return {
        chatId: record.chatId,
        messageId: record.messageId,
        createdAt: record.createdAt,
        sourceId: record.sourceId,
        pageContent: record.pageContent,
        metadata: record.metadata,
      };
    });

    const response: ListChatMessageSourcesResponseContent = {
      chatMessageSources: messages,
    };

    return {
      statusCode: 200,
      body: response,
    };
  }
);
