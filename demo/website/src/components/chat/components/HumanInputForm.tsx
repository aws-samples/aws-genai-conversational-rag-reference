/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Badge } from "@cloudscape-design/components";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { Chat } from "api-typescript-react-query-hooks";
import { isEmpty } from "lodash";
import { useCallback, useState } from "react";
import { useIsAdmin } from "../../../Auth";
import { useCreateChatMessageMutation } from "../../../hooks/chats";
import { useChatEngineConfig } from "../../../providers/ChatEngineConfig";

export default function HumanInputForm(props: {
  chat: Chat;
  onSuccess?: () => void;
}) {
  const isAdmin = useIsAdmin();
  const [config] = useChatEngineConfig();
  const [currentMessage, setCurrentMessage] = useState("");

  const onSuccess = useCallback(() => {
    props.onSuccess && props.onSuccess();
  }, [props.onSuccess]);

  const createChatMessage = useCreateChatMessageMutation(
    props.chat.chatId,
    onSuccess
  );

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

  return (
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
              currentMessage.length
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
              padding: 8,
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
              disabled={!currentMessage.length}
            >
              Send
            </Button>
            <div style={{ opacity: 0.3, transform: "scale(0.75)", width: 80 }}>
              <Badge>⌃</Badge> + <Badge>⏎</Badge>
            </div>
          </SpaceBetween>
        </div>
      </div>
    </SpaceBetween>
  );
}
