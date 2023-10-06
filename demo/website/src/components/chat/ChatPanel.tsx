/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Badge, Modal } from "@cloudscape-design/components";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { Chat } from "api-typescript-react-query-hooks";
import { isEmpty } from "lodash";
import { useCallback, useRef, useState } from "react";
import { ConversationView } from "./ConversationView";
import { useIsAdmin } from "../../Auth";
import {
  useCreateChatMessageMutation,
  useDeleteChatMutation,
  useUpdateChatMutation,
} from "../../hooks/chats";
import { useChatEngineConfig } from "../../providers/ChatEngineConfig";
import InlineEditor from "../InlineEditor";

type SessionChatProps = {
  chat: Chat;
};

export default function ChatPanel(props: SessionChatProps) {
  const conversationRef = useRef<HTMLDivElement>(null);
  const isAdmin = useIsAdmin();
  const [config] = useChatEngineConfig();
  const [currentMessage, setCurrentMessage] = useState("");
  const updateChat = useUpdateChatMutation();
  const [deleteChatModalVisible, setDeleteChatModalVisiblity] = useState(false);
  const deleteChat = useDeleteChatMutation(() => {
    setDeleteChatModalVisiblity(false);
  });
  const onMessageCreated = useCallback(() => {
    // scroll to new message when created
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversationRef]);
  const createChatMessage = useCreateChatMessageMutation(
    props.chat.chatId,
    onMessageCreated
  );

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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        flex: 1,
      }}
    >
      {/* Title */}
      <div
        style={{
          flex: 0,
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

      {/* Dialog */}
      <div
        style={{
          display: "flex",
          flex: 1,
          justifySelf: "stretch",
          alignSelf: "stretch",
          overflow: "hidden",
        }}
      >
        <ConversationView ref={conversationRef} chatId={props.chat.chatId} />
      </div>

      {/* Input  */}
      <div
        style={{
          flex: 0,
        }}
      >
        <SpaceBetween direction="vertical" size="m">
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              width: "100%",
              gap: "14px",
              alignItems: "center",
              maxHeight: 300,
            }}
          >
            <div style={{ flex: 1 }}>
              <textarea
                value={currentMessage}
                onChange={({ target }) => setCurrentMessage(target.value)}
                disabled={createChatMessage.isLoading}
                onKeyUp={
                  currentMessage.length > 3
                    ? ({ ctrlKey, key }) => {
                        if (ctrlKey && key === "Enter") {
                          sendMessage().catch(console.error);
                        }
                      }
                    : undefined
                }
                style={{
                  minHeight: 80,
                  maxHeight: 300,
                  width: "90%",
                  resize: "vertical",
                  borderRadius: 10,
                  padding: 6,
                }}
              />
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
                  disabled={currentMessage.length <= 3}
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
      </div>

      {/* Model */}
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
    </div>
  );
}
