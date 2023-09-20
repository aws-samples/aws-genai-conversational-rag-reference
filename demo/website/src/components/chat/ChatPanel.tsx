/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Badge, FormField, Modal } from "@cloudscape-design/components";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import { Chat } from "api-typescript-react-query-hooks";
import { isEmpty } from "lodash";
import { useCallback, useRef, useState } from "react";
import Conversation, { ConversationViewInfinite } from "./ConversationView";
import { useIsAdmin } from "../../Auth";
import {
  useCreateChatMessageMutation,
  useDeleteChatMutation,
  useUpdateChatMutation,
} from "../../hooks/chats";
import { useChatEngineConfig } from "../../providers/ChatEngineConfig";
import { useFeatureFlag } from "../../providers/FlagsProvider";
import InlineEditor from "../InlineEditor";

type SessionChatProps = {
  chat: Chat;
};

export default function ChatPanel(props: SessionChatProps) {
  const isAdmin = useIsAdmin();

  const [config] = useChatEngineConfig();

  const [currentMessage, setCurrentMessage] = useState("");

  const createChatMessage = useCreateChatMessageMutation(props.chat.chatId);

  const updateChat = useUpdateChatMutation();

  const [deleteChatModalVisible, setDeleteChatModalVisiblity] = useState(false);

  const deleteChat = useDeleteChatMutation(() => {
    setDeleteChatModalVisiblity(false);
  });

  const shouldUseInfiniteQuery = useFeatureFlag("infiniteQuery");

  async function deleteChatHanlder() {
    await deleteChat.mutateAsync({ chatId: props.chat.chatId });
  }

  async function sendMessage() {
    await createChatMessage.mutateAsync({
      chatId: props.chat.chatId,
      // @ts-ignore - incorrect
      createChatMessageRequestContent: {
        question: currentMessage,
        ...(isAdmin && !isEmpty(config) ? { config } : {}),
      },
    });
    setCurrentMessage("");
  }

  async function updateChatTitle(title: string) {
    await updateChat.mutateAsync({
      chatId: props.chat.chatId,
      updateChatRequestContent: {
        title,
      },
    });
  }

  // scroll to bottom when messages are updated
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const onMessages = useCallback(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [messageContainerRef]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: "16px",
      }}
    >
      <Modal
        onDismiss={() => setDeleteChatModalVisiblity(false)}
        visible={deleteChatModalVisible}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={() => setDeleteChatModalVisiblity(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={deleteChat.isLoading}
                disabled={deleteChat.isError}
                onClick={() => deleteChatHanlder()}
              >
                Ok
              </Button>
            </SpaceBetween>
          </Box>
        }
        header="Confirm chat delete"
      >
        <p>
          Are you sure you want to delete the chat?
          <br />
          This operation will delete all of the chat history and can not be
          reversed.
        </p>
      </Modal>

      <div
        style={{
          height: "40px",
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Header variant="h3">
          <InlineEditor
            loading={updateChat.isLoading}
            onChange={updateChatTitle}
          >
            {props.chat.title}
          </InlineEditor>
        </Header>
        <Button
          variant="inline-icon"
          iconName="remove"
          onClick={() => setDeleteChatModalVisiblity(true)}
        />
      </div>
      <div
        style={{
          overflow: "hidden",
          flexGrow: 1,
          boxShadow: "inset 0px 0px 9px 0px rgba(0,0,0,0.1)",
          height: "0px",
        }}
      >
        <div
          ref={messageContainerRef}
          style={{ height: "100%", overflowY: "auto" }}
        >
          {shouldUseInfiniteQuery ? (
            <ConversationViewInfinite chatId={props.chat.chatId} />
          ) : (
            <Conversation chatId={props.chat.chatId} onMessages={onMessages} />
          )}
        </div>
      </div>
      <Box>
        <SpaceBetween direction="vertical" size="m">
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              width: "100%",
              gap: "14px",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1 }}>
              <FormField stretch>
                <Textarea
                  value={currentMessage}
                  onChange={({ detail }) => setCurrentMessage(detail.value)}
                  disabled={createChatMessage.isLoading}
                  onKeyUp={
                    currentMessage.length
                      ? async ({ detail }) => {
                          if (detail.ctrlKey && detail.key === "Enter") {
                            await sendMessage();
                          }
                        }
                      : undefined
                  }
                />
              </FormField>
            </div>
            <div
              style={{
                minWidth: 80,
                maxWidth: 120,
                alignSelf: "flex-end",
                flex: 1,
              }}
            >
              <SpaceBetween direction="vertical" size="xs">
                <Button
                  fullWidth={true}
                  variant="primary"
                  onClick={sendMessage}
                  loading={createChatMessage.isLoading}
                  disabled={currentMessage.length === 0}
                >
                  Send
                </Button>
                <div
                  style={{ opacity: 0.3, transform: "scale(0.75)", width: 80 }}
                >
                  <Badge>⌃</Badge> + <Badge>⏎</Badge>
                </div>
              </SpaceBetween>
            </div>
          </div>
        </SpaceBetween>
      </Box>
    </div>
  );
}
