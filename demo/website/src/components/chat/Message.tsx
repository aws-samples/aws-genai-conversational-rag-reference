/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  Button,
  TextContent,
  Icon,
  Box,
  Modal,
  SpaceBetween,
  Spinner,
} from "@cloudscape-design/components";
import type {
  ChatMessage,
  ChatMessageSource,
} from "api-typescript-react-query-hooks";
import { useState } from "react";
import { useCollapse } from "react-collapsed";
import {
  useDeleteChatMessageMutation,
  useMessageSources,
} from "../../hooks/chats";
import CopyText from "../buttons/CopyText";

type SourceComponentProps = {
  source: ChatMessageSource;
};

export function ExpandableSourceComponent({ source }: SourceComponentProps) {
  const { getCollapseProps, getToggleProps, isExpanded } = useCollapse();
  return (
    <div>
      <div
        style={{
          alignItems: "middle",
          gap: "4px",
          display: "flex",
          marginTop: "10px",
        }}
      >
        <div
          {...getToggleProps()}
          className="button"
          style={{
            transition: "all 0.25s",
            transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
            height: "100%",
          }}
        >
          <Icon name="caret-down-filled" />
        </div>
        <div>Source {source.sourceId}</div>
        <Button iconName="external" variant="inline-icon" />
      </div>
      <div {...getCollapseProps()}>
        <div style={{ marginLeft: "20px", fontStyle: "italic" }}>
          {source.pageContent}
        </div>
      </div>
    </div>
  );
}

export function SourceComponent({ source }: SourceComponentProps) {
  return (
    <div>
      <h4>Source {+source.sourceId + 1}</h4>
      <div style={{ marginLeft: "20px", fontStyle: "italic" }}>
        {source.pageContent}
      </div>
    </div>
  );
}

type MessageProps = {
  message: ChatMessage;
  humanStyles?: React.HTMLAttributes<HTMLDivElement>["style"];
  aiStyles?: React.HTMLAttributes<HTMLDivElement>["style"];
};

type MessageSourcesProps = {
  messageId: string;
  chatId: string;
};

export function MessageSources({ chatId, messageId }: MessageSourcesProps) {
  const sourcesRequest = useMessageSources(chatId, messageId);
  return (
    <div>
      {sourcesRequest.isLoading ? (
        <Spinner size="big" />
      ) : (
        sourcesRequest.data &&
        sourcesRequest.data.length > 0 && (
          <div style={{ marginTop: "8px" }}>
            {sourcesRequest.data.map((source) => (
              <SourceComponent source={source} key={source.sourceId} />
            ))}
          </div>
        )
      )}
    </div>
  );
}

function SourcePopover(props: { chatId: string; messageId: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Modal
        onDismiss={() => setVisible(false)}
        visible={visible}
        size="large"
        header="Sources"
      >
        <MessageSources chatId={props.chatId} messageId={props.messageId} />
      </Modal>
      <Button
        iconName="folder-open"
        variant="inline-icon"
        onClick={() => setVisible(true)}
      />
    </>
  );
}

export default function Message({
  message,
  humanStyles = {},
  aiStyles = {},
}: MessageProps) {
  const [deleteChatMessageModalVisible, setDeleteChatMessageModalVisiblity] =
    useState(false);

  const deleteChatMessageMutation = useDeleteChatMessageMutation(() => {
    setDeleteChatMessageModalVisiblity(false);
  });

  async function deleteChatMessage() {
    await deleteChatMessageMutation.mutateAsync({
      chatId: message.chatId,
      messageId: message.messageId,
    });
  }

  function confirmDeleteChatMessage() {
    setDeleteChatMessageModalVisiblity(true);
  }

  let headerText = message.type === "human" ? "You" : "Assistant";
  const time = new Date(message.createdAt).toLocaleString();
  return (
    <div
      style={{
        padding: "15px 10px",
        ...(message.type === "ai" ? aiStyles : humanStyles),
      }}
    >
      <Modal
        onDismiss={() => setDeleteChatMessageModalVisiblity(false)}
        visible={deleteChatMessageModalVisible}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={() => setDeleteChatMessageModalVisiblity(false)}
              >
                Cancel
              </Button>
              <Button
                loading={deleteChatMessageMutation.isLoading}
                disabled={
                  deleteChatMessageMutation.isLoading ||
                  deleteChatMessageMutation.isError
                }
                variant="primary"
                onClick={() => deleteChatMessage()}
              >
                Ok
              </Button>
            </SpaceBetween>
          </Box>
        }
        header="Confirm chat message deletion"
      >
        <p>
          Are you sure you want to delete this chat message? <br />
          This operation will only delete this specific message and can not be
          undone.
        </p>
      </Modal>
      <TextContent>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
            gap: "8px",
            width: "100%",
          }}
        >
          <h4>{headerText}</h4>
          <span style={{ color: "#aaa" }}>{time}</span>
        </div>
      </TextContent>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <TextContent>
          <div style={{ whiteSpace: "pre-wrap" }}>{message.text}</div>
        </TextContent>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "flex-end",
          }}
        >
          {message.type === "ai" && (
            <SourcePopover
              chatId={message.chatId}
              messageId={message.messageId}
            />
          )}
          <CopyText textToCopy={message.text} contentName="Message" />
          <Button
            iconName="delete-marker"
            variant="inline-icon"
            onClick={() => {
              confirmDeleteChatMessage();
            }}
          />
        </div>
      </div>
    </div>
  );
}
