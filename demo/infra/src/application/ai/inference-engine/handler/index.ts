/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { createSignedFetcher } from "@aws-galileo/galileo-sdk/lib/auth/aws-sigv4";
import * as Chat from "@aws-galileo/galileo-sdk/lib/chat";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import {
  interceptors,
  corsInterceptor,
  IInterceptorContext,
  CallingIdentity,
  ApiResponse,
} from "api-typescript-interceptors";
import {
  CreateChatMessageResponseContent,
  createChatMessageHandler,
} from "api-typescript-runtime";
import { ENV } from "./env";

const ADMIN_GROUPS: string[] = JSON.parse(ENV.ADMIN_GROUPS);

// Cors is handled by the Lambda Function URL, so need to remove to prevent duplicates
const INTERCEPTORS = interceptors.filter(
  (v) => v != corsInterceptor
) as unknown as typeof interceptors;

export const handler = createChatMessageHandler(
  ...INTERCEPTORS,
  async ({ input, interceptorContext }) => {
    const { callingIdentity, logger } =
      interceptorContext as IInterceptorContext;
    logger.debug({ message: "Calling identity", callingIdentity });
    const userId = callingIdentity.identityId;

    const question = input.body.question;
    const chatId = input.requestParameters.chatId;
    const chatOptions = input.body.options;

    let config: Chat.ChatEngineConfig = {};
    if (isAdmin(callingIdentity) && input.body.config) {
      config = {
        ...config,
        ...input.body.config,
      };
      logger.warn({
        message: "Overriding default config for admin user",
        callingIdentity,
        config,
      });
    }

    let searchUrlService = "execute-api";
    if (ENV.SEARCH_URL.includes("lambda-url")) {
      searchUrlService = "lambda";
    }

    const engine = await Chat.ChatEngine.from({
      userId,
      chatId,
      config,
      chatHistoryTable: ENV.CHAT_MESSAGE_TABLE_NAME,
      chatHistoryTableIndexName: ENV.CHAT_MESSAGE_TABLE_GSI_INDEX_NAME,
      domain: chatOptions?.domain ?? ENV.DOMAIN,
      search: {
        url: ENV.SEARCH_URL,
        fetch: createSignedFetcher({
          service: searchUrlService,
          credentials: fromNodeProviderChain(),
          region: process.env.AWS_REGION! || process.env.AWS_DEFAULT_REGION!,
          idToken: callingIdentity.idToken,
        }),
        k: chatOptions?.search?.limit,
        filter: {
          ...chatOptions?.search?.filters,
        },
      },
      verbose: true,
    });

    try {
      const result = await engine.query(question);

      logger.info("Chain successfully executed query");
      logger.debug({ message: "ChatEngine query result", result });

      return ApiResponse.success({
        question: {
          ...result.turn.human,
          text: result.question,
        },
        answer: {
          ...result.turn.ai,
          text: result.answer,
        },
        sources: result.turn.sources,
        // TODO: add admin data
      } as CreateChatMessageResponseContent);
    } catch (error) {
      logger.error("Failed to execute query", error as Error);

      return ApiResponse.temporaryFailure({
        errorMessage: String(error),
      });
    }
  }
);

export function isAdmin(callingIdentity: CallingIdentity): boolean {
  return (
    callingIdentity.groups != null &&
    callingIdentity.groups.filter((v) => ADMIN_GROUPS.includes(v)).length > 0
  );
}
