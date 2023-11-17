/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { createSignedFetcher } from '@aws/galileo-sdk/lib/auth/aws-sigv4';
import {
  ChatEngine,
  ChatEngineConfig,
  assertNonPrivilegedChatEngineConfig,
  mergeUnresolvedChatEngineConfig,
} from '@aws/galileo-sdk/lib/chat';
import { createMetrics, startPerfMetric } from '@aws/galileo-sdk/lib/common/metrics';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import {
  interceptors,
  corsInterceptor,
  IInterceptorContext,
  CallingIdentity,
  ApiResponse,
} from 'api-typescript-interceptors';
import { CreateChatMessageResponseContent, createChatMessageHandler } from 'api-typescript-runtime';
import { cloneDeepWith, isUndefined, omitBy } from 'lodash';
import applicationChatEngineConfigJson from './chat-engine-config.json'; // HACK: temporary way to support updating app level config at deploy time
import { ENV } from './env';

const ADMIN_GROUPS: string[] = JSON.parse(ENV.ADMIN_GROUPS);

// Cors is handled by the Lambda Function URL, so need to remove to prevent duplicates
const INTERCEPTORS = interceptors.filter((v) => v != corsInterceptor) as unknown as typeof interceptors;

export const handler = createChatMessageHandler(...INTERCEPTORS, async ({ input, interceptorContext }) => {
  const [metrics, logMetrics] = createMetrics({
    serviceName: 'InferenceEngine',
  });
  metrics.addDimension('component', 'inferenceEngine');

  try {
    const $$PreQuery = startPerfMetric('PreQuery');
    const { callingIdentity, logger } = interceptorContext as IInterceptorContext;
    logger.debug({ message: 'Calling identity', callingIdentity });
    const userId = callingIdentity.identityId;
    const _isAdmin = isAdmin(callingIdentity);

    _isAdmin && logger.info(`Administrator user request: ${userId}; groups: ${callingIdentity.groups?.join(',')}`);

    const question = input.body.question;
    const chatId = input.requestParameters.chatId;
    metrics.addMetadata('chatId', chatId);

    const verbose = logger.getLevelName() === 'DEBUG';

    // User request time config
    // [WARNING] User ChatEngineConfig from TypeSafeAPI automatically adds "undefined" for all
    // optional keys that are missing, this breaks spread over defaults.
    const userConfig = compactClone(input.body.options || {});
    // [SECURITY]: check for "privileged" options, and restrict to only admins (search url, custom models, etc.)
    // make sure config does not allow privileged properties to non-admins (such as custom models/roles)
    !_isAdmin && assertNonPrivilegedChatEngineConfig(userConfig as any);

    // TODO: fetch "application" config for chat once implemented
    const applicationConfig: Partial<ChatEngineConfig> = applicationChatEngineConfigJson;

    // Should we store this as "system" config once we implement config store?
    const systemConfig: ChatEngineConfig = {
      classifyChain: undefined,
      search: {
        url: ENV.SEARCH_URL,
      },
    };

    const configs: ChatEngineConfig[] = [systemConfig, applicationConfig, userConfig];

    const config = mergeUnresolvedChatEngineConfig(...configs);

    logger.debug({ message: 'Resolved ChatEngineConfig', config, configs });

    const searchUrl = config.search?.url || ENV.SEARCH_URL;
    const searchFetcher = createSignedFetcher({
      service: searchUrl.includes('lambda-url') ? 'lambda' : 'execute-api',
      credentials: fromNodeProviderChain(),
      region: process.env.AWS_REGION! || process.env.AWS_DEFAULT_REGION!,
      idToken: callingIdentity.idToken,
    });

    const engine = await ChatEngine.from({
      ...config,
      search: {
        ...config.search,
        url: searchUrl,
        fetch: searchFetcher,
      },
      userId,
      chatId,
      chatHistoryTable: ENV.CHAT_MESSAGE_TABLE_NAME,
      chatHistoryTableIndexName: ENV.CHAT_MESSAGE_TABLE_GSI_INDEX_NAME,
      verbose,
      returnTraceData: _isAdmin,
    });
    $$PreQuery();

    try {
      const $$QueryExecutionTime = startPerfMetric('QueryExecutionTime');
      const result = await engine.query(question);
      $$QueryExecutionTime();

      logger.info('Chain successfully executed query');
      logger.debug({ message: 'ChatEngine query result', result });

      const traceData = _isAdmin
        ? {
            ...result.traceData,
            config,
            configs,
          }
        : undefined;

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
        traceData,
      } as CreateChatMessageResponseContent);
    } catch (error) {
      logger.error('Failed to execute query', error as Error);

      return ApiResponse.temporaryFailure({
        errorMessage: String(error),
      });
    }
  } finally {
    logMetrics();
  }
});

export function isAdmin(callingIdentity: CallingIdentity): boolean {
  return callingIdentity.groups != null && callingIdentity.groups.filter((v) => ADMIN_GROUPS.includes(v)).length > 0;
}

/**
 * Deep clone that removes all undefined properties from objects.
 * @param value
 * @returns
 */
function compactClone<T extends object>(value: T): T {
  value = omitBy(value, isUndefined) as T;
  return cloneDeepWith(value, (_value) => {
    if (value === _value) return;
    if (typeof _value === 'object') {
      return compactClone(_value);
    }
  });
}
