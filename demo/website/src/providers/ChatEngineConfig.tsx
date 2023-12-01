/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { ModelAdapter } from '@aws/galileo-sdk/lib/models/adapter';
import { resolveModelAdapter } from '@aws/galileo-sdk/lib/models/llms/utils';
import { IModelInfo } from '@aws/galileo-sdk/lib/models/types';
import { ChainType } from '@aws/galileo-sdk/lib/schema';
import { ChatEngineChainConfig, ChatEngineConfig } from 'api-typescript-react-query-hooks';
import { produce } from 'immer';
import { isEmpty, merge } from 'lodash';
import React, { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useImmer, Updater } from 'use-immer';
import { useDebounce, useFetch } from 'usehooks-ts';
import { useFoundationModelInventory } from '../hooks/llm-inventory';

export type { ChatEngineConfig };

export function getChainConfigKeyByType(type: ChainType) {
  switch (type) {
    case ChainType.QA:
      return 'qaChain';
    case ChainType.CONDENSE_QUESTION:
      return 'condenseQuestionChain';
    case ChainType.CLASSIFY:
      return 'classifyChain';
  }
}

export function getChainConfigByType(type: ChainType, config?: ChatEngineConfig) {
  const key = getChainConfigKeyByType(type);
  return config && config[key];
}

export interface ChatEngineConfigActions {
  readonly reset: () => void;
  readonly copy: () => Promise<void>;
  readonly paste: () => Promise<void>;
}

export type ChatEngineConfigContext = [
  config: ChatEngineConfig,
  updater: Updater<ChatEngineConfig>,
  actions: ChatEngineConfigActions | undefined,
];

const DEFAULT_CONTEXT: ChatEngineConfigContext = [{}, () => {}, undefined];

/**
 * Context for storing the ChatEngineConfig.
 */
export const ChatEngineConfigContext = createContext<ChatEngineConfigContext>(DEFAULT_CONTEXT);

export const useChatEngineConfig = (): ChatEngineConfigContext => {
  return useContext(ChatEngineConfigContext);
};

export const useChatEngineConfigState = <P extends keyof ChatEngineConfig>(
  prop: P,
): [state: ChatEngineConfig[P], updater: Updater<ChatEngineConfig[P]>] => {
  const [config, updateConfig] = useChatEngineConfig();
  const setter: Updater<ChatEngineConfig[P]> = useCallback(
    (value) => {
      updateConfig((draft) => {
        let _value = typeof value === 'function' ? produce(draft[prop], value) : value;
        if (_value == null || isEmpty(_value)) {
          delete draft[prop];
        } else {
          draft[prop] = _value;
        }
      });
    },
    [updateConfig],
  );

  const value = config[prop];

  return useMemo(() => [value, setter], [value, setter]);
};

// TODO: support customizing llm for each chain - now is just default single llm for all, but backend supports specific for each
export const useChatEngineConfigModelInfo = (noDefault: boolean = false): Partial<IModelInfo> | undefined => {
  const [config] = useChatEngineConfig();
  const llmModel = config.llm?.model;
  const inventory = useFoundationModelInventory();

  return useMemo(() => {
    if (inventory) {
      const uuid = llmModel?.uuid || (noDefault ? undefined : inventory.defaultModelId);
      const inventoryInfo = uuid ? inventory.models[uuid] : {};
      return merge({}, inventoryInfo, llmModel || {});
    }
    return undefined;
  }, [inventory, llmModel?.uuid, noDefault]);
};

// TODO: support customizing llm for each chain - now is just default single llm for all, but backend supports specific for each
export const useChatEngineConfigModelAdapter = (noDefault: boolean = false): ModelAdapter | undefined => {
  const modelInfo = useChatEngineConfigModelInfo(noDefault);

  return useMemo(() => {
    const adapter = modelInfo ? resolveModelAdapter(modelInfo as any) : new ModelAdapter();
    return adapter;
  }, [modelInfo]);
};

export const useChatEngineConfigChain = <T extends ChainType>(type: T) => {
  const [config, updateConfig] = useChatEngineConfig();
  const value = getChainConfigByType(type, config);
  const configKey = getChainConfigKeyByType(type);

  const updater = useCallback<Updater<typeof value>>(
    (draft) => {
      updateConfig((_draft) => {
        const _value = typeof draft === 'function' ? produce(_draft[configKey], draft) : draft;
        _draft[configKey] = _value;
      });
    },
    [type, configKey, updateConfig],
  );

  return useMemo(() => [value, updater], [value, updater]) as [typeof value, typeof updater];
};

export const useChatEngineConfigChainProp = <T extends ChainType, P extends keyof ChatEngineChainConfig>(
  type: T,
  prop: P,
) => {
  const [chain, updateChain] = useChatEngineConfigChain(type);

  const updater = useCallback<Updater<ChatEngineChainConfig[P]>>(
    (draft) => {
      updateChain((_draft) => {
        const _value = typeof draft === 'function' ? produce(_draft && _draft[prop], draft) : draft;
        return {
          ..._draft,
          [prop]: _value,
        };
      });
    },
    [type, prop, updateChain],
  );

  const value = chain && chain[prop];

  return useMemo(() => [value, updater], [value, updater]) as [ChatEngineChainConfig[P], typeof updater];
};

export const useChatEngineConfigChainPrompt = <T extends ChainType>(type: T) => {
  return useChatEngineConfigChainProp(type, 'prompt');
};

const useOverrideChatEngineConfigJson = (): ChatEngineConfig | undefined => {
  const configJson = useFetch<string>('/chat-engine-config.json');
  if (configJson.error == null && configJson.data) {
    if (isEmpty(configJson.data)) return;
    return configJson.data as ChatEngineConfig;
  }
  return;
};

/**
 * Sets up the ChatEngineConfig context used to config chat engine config for admins.
 * This provider MUST wrap the <App /> which manages the splitpanel where dev settings are rendered.
 */
const ChatEngineConfigProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // TODO: find better way to retrieve the route path - useParams is empty
  const chatId = useLocation()
    .pathname.match(/chat\/([^/]+)(\/.*)?$/)
    ?.at(1);
  const override = useOverrideChatEngineConfigJson();
  const defaultConfig = useMemo(() => override || {}, [override]);
  const [config, updateConfig] = useImmer<ChatEngineConfig>(defaultConfig);
  const configRef = useRef<ChatEngineConfig>();
  configRef.current = config;

  // persist config for chat use debounce
  const configTupleToPersist = useDebounce([chatId, config], 250) as [string, ChatEngineConfig];
  useEffect(() => {
    const [_chatId, _config] = configTupleToPersist;
    if (_chatId && !isEmpty(_config)) {
      storeConfig(_chatId, _config);
    }
  }, configTupleToPersist);

  // Persist anytime chat id is modified, or on unmount
  useEffect(() => {
    if (chatId) {
      // reset the config to persisted value for chat
      updateConfig(retrieveConfig(chatId, defaultConfig));

      return () => {
        if (configRef.current != null && !isEmpty(configRef.current)) {
          storeConfig(chatId, configRef.current);
        }
      };
    }
    return;
  }, [chatId, defaultConfig]);

  const reset = useCallback(() => {
    updateConfig({});
    chatId && storeConfig(chatId, undefined);
  }, [chatId, updateConfig]);

  const copy = useCallback(async () => {
    return navigator.clipboard.writeText(JSON.stringify(configRef.current, null, 2));
  }, [configRef]);

  const paste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      console.info('Pasting config from clipboard', text);
      const _clipboardConfig = JSON.parse(text);
      console.info(_clipboardConfig);
      updateConfig(_clipboardConfig);
    } catch (error) {
      console.error('Failed to paste config', error);
    }
  }, [updateConfig]);

  const context: ChatEngineConfigContext = useMemo(
    () => [
      config,
      updateConfig,
      {
        reset,
        copy,
        paste,
      },
    ],
    [config, updateConfig, reset, copy, paste],
  );

  return <ChatEngineConfigContext.Provider value={context}>{children}</ChatEngineConfigContext.Provider>;
};

export default ChatEngineConfigProvider;

function persistentKey(chatId: string): string {
  return `@galileo/chat-engine-config/${chatId}`;
}

function storeConfig(chatId: string, config?: ChatEngineConfig) {
  if (isEmpty(config)) {
    localStorage.removeItem(persistentKey(chatId));
  } else {
    localStorage.setItem(persistentKey(chatId), JSON.stringify(config));
  }
}

function retrieveConfig(chatId: string, defaultValue: ChatEngineConfig = {}): ChatEngineConfig {
  const persisted = localStorage.getItem(persistentKey(chatId));
  if (persisted) {
    return JSON.parse(persisted);
  }
  return defaultValue;
}
