/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Spinner } from "@cloudscape-design/components";
import {
  ChatMessage,
  useListChatMessages,
} from "api-typescript-react-query-hooks";
import { forwardRef, useEffect, useMemo } from "react";
import Message from "./Message";
import { CHAT_MESSAGE_PARAMS } from "../../hooks/chats";
import EmptyState from "../Empty";

type ConversationViewProps = {
  chatId: string;
};

export const ConversationView = forwardRef(
  (props: ConversationViewProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const { chatId } = props;

    const { data, error, fetchNextPage, isFetching, isLoading, hasNextPage } =
      useListChatMessages({
        chatId,
        ...CHAT_MESSAGE_PARAMS,
      });

    const messages = useMemo<ChatMessage[]>(
      () => data?.pages?.flatMap((p) => p.chatMessages || []) ?? [],
      [data]
    );

    // TODO: load next page on scroll in view of last
    // Should we load newest items first?
    // Should we scroll the last message into view always?
    useEffect(() => {
      if (!isFetching && hasNextPage) {
        fetchNextPage().catch(console.error);
      }
    }, [hasNextPage && isFetching]);

    return (
      <div
        ref={ref}
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          backgroundColor: "#fcfcfc",
          padding: "4px",
          boxSizing: "border-box",
          overflowY: "scroll",
        }}
      >
        {messages.length === 0 && !isLoading && (
          <EmptyState title="No messages" subtitle="No messages to display." />
        )}
        {messages.map((message) => (
          <Message
            message={message}
            key={message.messageId}
            humanStyles={{
              backgroundColor: "#ffffff",
            }}
            aiStyles={{
              backgroundColor: "#efefef",
            }}
          />
        ))}
        {isLoading ||
          (isFetching && (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flex: 1,
                justifyContent: "center",
                padding: 20,
              }}
            >
              <Spinner size="normal" />
            </div>
          ))}
        {error && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flex: 1,
              justifyContent: "center",
            }}
          >
            <code>{error.message}</code>
          </div>
        )}
      </div>
    );
  }
);
