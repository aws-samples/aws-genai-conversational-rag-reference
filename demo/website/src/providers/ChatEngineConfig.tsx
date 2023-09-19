/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  ChatEngineConfig,
  ChatEngineConfigSearchType,
} from "api-typescript-react-query-hooks";
import { isEmpty } from "lodash";
import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useLocation } from "react-router-dom";
import { useImmer, Updater, DraftFunction } from "use-immer";
import { useIsAdmin } from "../Auth";

export type { ChatEngineConfig, ChatEngineConfigSearchType };

export interface ChatEngineConfigActions {
  readonly reset: (hard?: boolean) => void;
  readonly copy: () => Promise<void>;
  readonly paste: () => Promise<void>;
}

export type ChatEngineConfigContext = [
  config: ChatEngineConfig,
  updater: Updater<ChatEngineConfig>,
  actions: ChatEngineConfigActions | undefined
];

const DEFAULT_CONTEXT: ChatEngineConfigContext = [{}, () => {}, undefined];

/**
 * Context for storing the ChatEngineConfig.
 */
export const ChatEngineConfigContext =
  createContext<ChatEngineConfigContext>(DEFAULT_CONTEXT);

export const useChatEngineConfig = (): ChatEngineConfigContext => {
  return useContext(ChatEngineConfigContext);
};

export const useChatEngineConfigState = <P extends keyof ChatEngineConfig>(
  prop: P
): [state: ChatEngineConfig[P], updater: Updater<ChatEngineConfig[P]>] => {
  const [config, updateConfig] = useChatEngineConfig();
  const setter: Updater<ChatEngineConfig[P]> = useCallback(
    (value) => {
      updateConfig((draft) => {
        if (typeof value === "function") {
          draft[prop] = (value as DraftFunction<ChatEngineConfig[P]>)(
            draft[prop]
          );
        } else {
          draft[prop] = value;
        }
      });
    },
    [updateConfig]
  );

  return [config[prop], setter];
};

/**
 * Sets up the ChatEngineConfig context used to config chat engine config for admins.
 * This provider MUST wrap the <App /> which manages the splitpanel where dev settings are rendered.
 */
const ChatEngineConfigProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  // TODO: find better way to retrieve the route path - useParams is empty
  const chatId = useLocation()
    .pathname.match(/chat\/([^/]+)(\/.*)?$/)
    ?.at(1);
  const isAdmin = useIsAdmin();
  const [config, updateConfig] = useImmer<ChatEngineConfig>({});
  const configRef = useRef<ChatEngineConfig>();
  configRef.current = config;

  // Persist anytime chat id is modified, or on unmount
  useEffect(() => {
    if (chatId) {
      // reset the config to persisted value for chat
      updateConfig(retrieveConfig(chatId));

      return () => {
        if (configRef.current != null && !isEmpty(configRef.current)) {
          storeConfig(chatId, configRef.current);
        }
      };
    }
    return;
  }, [chatId]);

  const reset = useCallback(
    (hard?: boolean) => {
      if (hard) {
        updateConfig({});
        chatId && storeConfig(chatId, undefined);
      } else {
        const _config = chatId && retrieveConfig(chatId);
        updateConfig(_config || {});
      }
    },
    [chatId, updateConfig]
  );

  const copy = useCallback(async () => {
    return navigator.clipboard.writeText(
      JSON.stringify(configRef.current, null, 2)
    );
  }, [configRef]);

  const paste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      console.info("Pasting config from clipboard", text);
      const _clipboardConfig = JSON.parse(text);
      console.info(_clipboardConfig);
      updateConfig(_clipboardConfig);
    } catch (error) {
      console.error("Failed to paste config", error);
    }
  }, [updateConfig]);

  const context: ChatEngineConfigContext = [
    config,
    updateConfig,
    {
      reset,
      copy,
      paste,
    },
  ];

  return (
    <ChatEngineConfigContext.Provider
      value={isAdmin ? context : DEFAULT_CONTEXT}
    >
      {children}
    </ChatEngineConfigContext.Provider>
  );
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

function retrieveConfig(chatId: string): ChatEngineConfig {
  return JSON.parse(localStorage.getItem(persistentKey(chatId)) || "{}");
}
