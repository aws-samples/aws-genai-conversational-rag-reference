/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { interceptors, corsInterceptor, IInterceptorContext, ApiResponse } from 'api-typescript-interceptors';
import { CreateChatMessageResponseContent, createChatMessageHandler } from 'api-typescript-runtime';
import { createMessage } from '../shared/create-message';
import { isAdmin } from '../shared/types';

// Cors is handled by the Lambda Function URL, so need to remove to prevent duplicates
const INTERCEPTORS = interceptors.filter((v) => v != corsInterceptor) as unknown as typeof interceptors;

export const handler = createChatMessageHandler(...INTERCEPTORS, async ({ input, interceptorContext }) => {
  const { callingIdentity, logger } = interceptorContext as IInterceptorContext;
  logger.debug({ message: 'Calling identity', callingIdentity });
  const userId = callingIdentity.identityId;
  const idToken = callingIdentity.idToken;
  const _isAdmin = isAdmin(callingIdentity.groups);

  _isAdmin && logger.info(`Administrator user request: ${userId}; groups: ${callingIdentity.groups?.join(',')}`);

  const question = input.body.question;
  const chatId = input.requestParameters.chatId;
  const userConfigParam = input.body.options;

  const result = await createMessage({
    logger,

    userId,
    idToken,
    isAdmin: _isAdmin,
    chatId,
    question,
    userConfigParam,

    useStreaming: false,
  });

  if (result.errorMessage) {
    return ApiResponse.temporaryFailure(result);
  }

  return ApiResponse.success(result as CreateChatMessageResponseContent);
});
