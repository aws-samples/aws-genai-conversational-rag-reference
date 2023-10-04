/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { updateChat } from "@aws/galileo-sdk/lib/chat/dynamodb/lib/chat";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { interceptors } from "api-typescript-interceptors";
import {
  UpdateChatResponseContent,
  updateChatHandler,
} from "api-typescript-runtime";

const dynamodb = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamodb);

export const handler = updateChatHandler(
  ...interceptors,
  async ({ input, interceptorContext }) => {
    const tableName = process.env.TABLE_NAME;
    if (!tableName)
      throw new Error(`expected env variable TABLE_NAME but none was found`);

    const userId = interceptorContext.callingIdentity?.identityId;
    if (!userId) throw new Error(`no userId was found in context`);

    const chatId = input.requestParameters.chatId;
    if (!chatId || chatId.length === 0) throw new Error(`chatId is invalid`);

    const title = input.body.title;
    if (!title || title.length === 0) throw new Error(`title is invalid`);

    const result = await updateChat(
      documentClient,
      tableName,
      userId,
      chatId,
      title
    );

    const response: UpdateChatResponseContent = {
      chatId: result?.chatId ?? "",
      title: result?.title ?? "",
      userId: result?.userId ?? "",
    };

    return {
      statusCode: 200,
      body: response,
    };
  }
);
