/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { IModelInfo } from "@aws-galileo/galileo-sdk/lib/models";
import {
  ChatEngineConfig,
  ChatEngineConfigSearchType,
} from "api-typescript-react-query-hooks";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useImmer, Updater } from "use-immer";
import { useLocalStorage, useDebounce } from "usehooks-ts";
import { useIsAdmin } from "../Auth";

export type { ChatEngineConfig, ChatEngineConfigSearchType };

export interface ChatEngineConfigActions {
  readonly reset: () => void;
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
) => {
  const [config, updateConfig] = useChatEngineConfig();
  const setter = useCallback(
    (value: ChatEngineConfig[P]) => {
      updateConfig((draft) => {
        draft[prop] = value;
      });
    },
    [updateConfig]
  );

  return [config[prop], setter] as const;
};

/**
 * Sets up the ChatEngineConfig context used to config chat engine config for admins.
 *
 * TODO: restrict this to only admins - not sure how to get this with CognitoAuth (should be in claims, but using Sigv4 so not sure)
 */
const ChatEngineConfigProvider: React.FC<any> = ({ children }) => {
  const [persistent, persist] = useLocalStorage<ChatEngineConfig>(
    "@galileo/chat-engine-config",
    {}
  );
  const [, persistCustomModel] = useLocalStorage<Partial<IModelInfo>>(
    "@galileo/custom-model",
    {}
  );
  const isAdmin = useIsAdmin();
  const [config, updateConfig] = useImmer<ChatEngineConfig>(persistent);
  const configRef = useRef<ChatEngineConfig>();
  configRef.current = config;

  const reset = useCallback(() => {
    updateConfig({});
    persist({});
    persistCustomModel({});
  }, [persist, persistCustomModel, updateConfig]);

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

  const debouncedValue = useDebounce(config, 1000);

  useEffect(() => {
    if (isAdmin && debouncedValue) {
      persist(debouncedValue);
    }
  }, [debouncedValue, isAdmin, persist]);

  return (
    <ChatEngineConfigContext.Provider
      value={isAdmin ? context : DEFAULT_CONTEXT}
    >
      {children}
    </ChatEngineConfigContext.Provider>
  );
};

export default ChatEngineConfigProvider;
