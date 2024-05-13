/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { createSignedFetcher } from '@aws/galileo-sdk/lib/auth/aws-sigv4';
import {
  ChatEngine,
  assertNonPrivilegedChatEngineConfig,
  mergeUnresolvedChatEngineConfig,
} from '@aws/galileo-sdk/lib/chat';
import { ChatEngineCallbacks } from '@aws/galileo-sdk/lib/chat/callback';
import { createMetrics, startPerfMetric } from '@aws/galileo-sdk/lib/common/metrics';
import { Logger } from '@aws-lambda-powertools/logger';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { cloneDeepWith, isUndefined, omitBy } from 'lodash';
import { ENV } from './env';
import { ChatEngineConfig } from './types';
import applicationChatEngineConfigJson from '../chat-engine-config.json'; // HACK: temporary way to support updating app level config at deploy time

interface CreateMessageParams {
  readonly logger: Logger;

  // calling identity related data
  readonly userId: string;
  readonly idToken?: string;
  readonly isAdmin: boolean;

  // chat data
  readonly chatId: string;
  readonly question: string;

  // chat config
  readonly userConfigParam?: ChatEngineConfig;

  readonly engineCallbacks?: ChatEngineCallbacks;
  readonly useStreaming: boolean;
}

export const createMessage = async (params: CreateMessageParams) => {
  const {
    logger,

    userId,
    idToken,
    isAdmin,

    chatId,
    question,
    userConfigParam,

    engineCallbacks,
    useStreaming,
  } = params;

  const [metrics, logMetrics] = createMetrics({
    serviceName: 'InferenceEngine',
  });
  metrics.addDimension('component', 'inferenceEngine');

  try {
    const $$PreQuery = startPerfMetric('PreQuery');
    metrics.addMetadata('chatId', chatId);

    const verbose = logger.getLevelName() === 'DEBUG';

    // User request time config
    // [WARNING] User ChatEngineConfig from TypeSafeAPI automatically adds "undefined" for all
    // optional keys that are missing, this breaks spread over defaults.
    const userConfig = compactClone(userConfigParam || {});
    // [SECURITY]: check for "privileged" options, and restrict to only admins (search url, custom models, etc.)
    // make sure config does not allow privileged properties to non-admins (such as custom models/roles)
    !isAdmin && assertNonPrivilegedChatEngineConfig(userConfig as any);

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
      idToken,
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
      returnTraceData: isAdmin,

      engineCallbacks,
      useStreaming,
    });
    $$PreQuery();

    try {
      const $$QueryExecutionTime = startPerfMetric('QueryExecutionTime');
      const result = await engine.query(question);
      $$QueryExecutionTime();

      logger.info('Chain successfully executed query');
      logger.debug({ message: 'ChatEngine query result', result });

      const traceData = isAdmin
        ? {
            ...result.traceData,
            config,
            configs,
          }
        : undefined;

      return {
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
      };
    } catch (error) {
      logger.error('Failed to execute query', error as Error);

      return {
        errorMessage: String(error),
      };
    }
  } finally {
    logMetrics();
  }
};

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
