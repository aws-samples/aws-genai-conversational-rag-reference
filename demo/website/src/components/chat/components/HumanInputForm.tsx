/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Badge } from '@cloudscape-design/components';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { Chat } from 'api-typescript-react-query-hooks';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useState } from 'react';
import { useDefaultApiWebSocketClient, useOnUpdateInferenceStatus } from 'ws-api-typescript-websocket-hooks';
import { useCreateChatMessageMutation, useUseStreaming } from '../../../hooks';
import { useChatEngineConfig } from '../../../providers/ChatEngineConfig';

export default function HumanInputForm(props: { chat: Chat; onSuccess?: () => void }) {
  const [options] = useChatEngineConfig();
  const [currentHumanMessage, setCurrentHumanMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onSuccess = useCallback(() => {
    props.onSuccess && props.onSuccess();
  }, [props.onSuccess]);

  const useStreaming = useUseStreaming();
  const createChatMessage = useCreateChatMessageMutation(props.chat.chatId, onSuccess);
  const wsClient = useDefaultApiWebSocketClient();

  useEffect(() => {
    if (!useStreaming) {
      setIsLoading(createChatMessage.isLoading);
    }
  }, [useStreaming, createChatMessage.isLoading]);

  useOnUpdateInferenceStatus((input) => {
    if (useStreaming) {
      if (input.chatId === props.chat.chatId && input.operation === 'HandleSendMessage') {
        if (input.status === 'SUCCESS') {
          setIsLoading(false);
        }
      }
    }
    console.log('onUpdateInferenceStatus -- HumanInputForm', input);
  }, []);

  async function sendMessage() {
    if (useStreaming) {
      setIsLoading(true);
      await wsClient.sendChatMessage({
        chatId: props.chat.chatId,
        question: currentHumanMessage,
        tmpMessageId: nanoid(32),
        options,
      });
    } else {
      await createChatMessage.mutateAsync({
        chatId: props.chat.chatId,
        // @ts-ignore - incorrect
        createChatMessageRequestContent: {
          question: currentHumanMessage,
          options,
        },
      });
    }
    setCurrentHumanMessage('');
  }

  return (
    <SpaceBetween direction="vertical" size="m">
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          gap: '14px',
          alignItems: 'center',
          maxHeight: 300,
        }}
      >
        <div style={{ flex: 1 }}>
          <textarea
            value={currentHumanMessage}
            onChange={({ target }) => setCurrentHumanMessage(target.value)}
            disabled={isLoading}
            onKeyUp={
              currentHumanMessage.length
                ? ({ ctrlKey, key }) => {
                    if (ctrlKey && key === 'Enter') {
                      sendMessage().catch(console.error);
                    }
                  }
                : undefined
            }
            style={{
              minHeight: 80,
              maxHeight: 300,
              width: '90%',
              resize: 'vertical',
              borderRadius: 10,
              padding: 8,
            }}
          />
        </div>
        <div
          style={{
            minWidth: 80,
            maxWidth: 120,
            alignSelf: 'flex-end',
            flex: 1,
          }}
        >
          <SpaceBetween direction="vertical" size="xs">
            <Button
              fullWidth={true}
              variant="primary"
              onClick={sendMessage}
              loading={isLoading}
              disabled={!currentHumanMessage.length}
            >
              {isLoading ? 'Processing question...' : 'Send'}
            </Button>
            <div style={{ opacity: 0.3, transform: 'scale(0.75)', width: 80 }}>
              <Badge>⌃</Badge> + <Badge>⏎</Badge>
            </div>
          </SpaceBetween>
        </div>
      </div>
    </SpaceBetween>
  );
}
