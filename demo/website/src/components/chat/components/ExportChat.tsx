/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  Box,
  Checkbox,
  FormField,
  Icon,
  Modal,
  Popover,
  SegmentedControl,
  SpaceBetween,
  Textarea,
} from '@cloudscape-design/components';
import Button from '@cloudscape-design/components/button';
import { Chat, ChatMessage } from 'api-typescript-react-query-hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChatExportHelper,
  ExportFormat,
  ExportFormatExtension,
  ExportFormatMime,
  exportFormatOptions,
} from './ExportChat.utils';
import { CHAT_MESSAGE_PARAMS, useListChatMessages } from '../../../hooks/chats';
import { useChatEngineConfig } from '../../../providers/ChatEngineConfig';

export default function ExportChat(props: { chat: Chat }) {
  const {
    chat: { chatId },
  } = props;

  const [modalVisible, setModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState(ExportFormat.text);
  const [renderedMessages, setRenderedMessages] = useState<string>();
  const [includeModelKwargs, setIncludeModelKwargs] = useState(true);
  const [includeLLMInfo, setIncludeLLMInfo] = useState(true);
  const [config] = useChatEngineConfig();

  const { data, isFetching, isError, isLoading } = useListChatMessages({
    chatId,
    ...CHAT_MESSAGE_PARAMS,
  });

  const messages: ChatMessage[] = useMemo<ChatMessage[]>(
    () => data?.pages?.flatMap((p) => p.chatMessages || (p as any).data || []) ?? [],
    [data],
  );

  const exportChatButtonClicked = useCallback(() => {
    setModalVisible(true);
  }, []);

  const downloadButtonClicked = useCallback(() => {
    const element = document.createElement('a');
    const file = new Blob(
      [
        // UTF-8 BOM
        new Uint8Array([0xef, 0xbb, 0xbf]),
        renderedMessages ?? '',
      ],
      {
        type: `${ExportFormatMime[exportFormat]};charset=utf-8`,
      },
    );
    element.href = URL.createObjectURL(file);
    element.download = `chat-${props.chat.chatId}.${ExportFormatExtension[exportFormat]}`;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  }, [renderedMessages, exportFormat]);

  useEffect(() => {
    let text = '';
    const exportHelper = ChatExportHelper.from({
      chat: props.chat,
      messages,
      chatEngineConfig: config,
      includeLLMInfo,
      includeModelKwargs,
    });

    switch (exportFormat) {
      case ExportFormat.csv: {
        text = exportHelper.getCsv();
        break;
      }
      case ExportFormat.json: {
        text = exportHelper.getJson();
        break;
      }
      default: {
        text = exportHelper.getText();
        break;
      }
    }

    setRenderedMessages(text);
  }, [messages, exportFormat, includeLLMInfo, includeModelKwargs]);

  if (messages.length === 0) {
    return null;
  } else {
    return (
      <>
        <Button
          variant="inline-icon"
          iconName="download"
          ariaLabel="Export chat"
          onClick={exportChatButtonClicked}
          disabled={isFetching || isLoading}
        />

        <Modal
          onDismiss={() => setModalVisible(false)}
          size="large"
          visible={modalVisible}
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="link" onClick={() => setModalVisible(false)}>
                  Cancel
                </Button>
                <Button variant="primary" loading={isLoading} disabled={isError} onClick={downloadButtonClicked}>
                  Download {exportFormat}
                </Button>
              </SpaceBetween>
            </Box>
          }
          header="Export chat"
        >
          <SpaceBetween size="m">
            <SpaceBetween size="l" direction="horizontal" alignItems="center">
              <FormField label="Export format" stretch={true}>
                <SegmentedControl
                  selectedId={exportFormat}
                  onChange={({ detail }) => {
                    setExportFormat(detail.selectedId as ExportFormat);
                  }}
                  options={exportFormatOptions}
                />
              </FormField>
              {config.llmModelKwargs != null && (
                <FormField label="Model kwargs">
                  <Checkbox
                    checked={includeModelKwargs}
                    onChange={({ detail }) => {
                      setIncludeModelKwargs(detail.checked);
                    }}
                  >
                    Include
                  </Checkbox>
                </FormField>
              )}
              {config.llmModel != null && (
                <FormField label="LLM Info">
                  <Checkbox
                    checked={includeLLMInfo}
                    onChange={({ detail }) => {
                      setIncludeLLMInfo(detail.checked);
                    }}
                  >
                    Include
                  </Checkbox>
                </FormField>
              )}
              <Box float="right">
                <Popover
                  position="right"
                  size="medium"
                  triggerType="custom"
                  content={
                    <>
                      <i>LLM info</i>/<i>Model kwargs</i> are only available in recent chats
                    </>
                  }
                >
                  <Icon name="status-info" />
                </Popover>
              </Box>
            </SpaceBetween>

            <FormField label="Content" stretch={true}>
              <Textarea value={renderedMessages ?? ''} rows={30} readOnly={true} />
            </FormField>
          </SpaceBetween>
        </Modal>
      </>
    );
  }
}
