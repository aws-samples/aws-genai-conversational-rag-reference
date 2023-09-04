/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Spinner } from "@cloudscape-design/components";
import { Virtualizer, useVirtualizer } from "@tanstack/react-virtual";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useInView } from "react-intersection-observer";
import Message from "./Message";
import {
  useInifniteChatMessages,
  useListChatMessages,
} from "../../hooks/chats";
import EmptyState from "../Empty";

type ConversationViewProps = {
  chatId: string;
  isWaiting?: boolean;
  onMessages?: () => void;
};

const CenterLoading = () => (
  <div
    style={{
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div>
      <Spinner size="normal" />
    </div>
  </div>
);

export function ConversationViewInfinite({
  chatId,
  isWaiting = false,
  onMessages,
}: ConversationViewProps) {
  const { ref, inView } = useInView();

  const itemEstimatedSize = 120;
  const loadingIndicatorHeight = 50;

  const { data, error, fetchNextPage, isFetching } =
    useInifniteChatMessages(chatId);

  const allMessages = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data]
  );

  useEffect(() => {
    onMessages && onMessages();
  }, [allMessages, onMessages]);

  const count = allMessages.length;
  const reverseIndex = useCallback(
    (index: number) => count - 1 - index,
    [count]
  );
  const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element> | null>(
    null
  );

  if (
    virtualizerRef.current &&
    count !== virtualizerRef.current.options.count
  ) {
    const delta = count - virtualizerRef.current.options.count;
    const nextOffset =
      virtualizerRef.current.scrollOffset + delta * itemEstimatedSize;

    virtualizerRef.current.scrollOffset = nextOffset;
    virtualizerRef.current.scrollToOffset(nextOffset, { align: "start" });
  }

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemEstimatedSize,
    getItemKey: useCallback(
      (index: number) => {
        return allMessages[reverseIndex(index)].messageId;
      },
      [allMessages, reverseIndex]
    ),
    scrollMargin: loadingIndicatorHeight,
    overscan: 5,
  });

  useLayoutEffect(() => {
    virtualizerRef.current = rowVirtualizer;
  });

  const currentSize = rowVirtualizer.getTotalSize();
  const items = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (inView) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchNextPage();
    }
  }, [inView]);

  const [paddingTop, paddingBottom] =
    items.length > 0
      ? [
          Math.max(0, items[0].start - rowVirtualizer.options.scrollMargin),
          Math.max(0, currentSize - items[items.length - 1].end),
        ]
      : [0, 0];

  return (
    <div
      ref={parentRef}
      style={{ height: "100%", overflow: "auto", backgroundColor: "#fcfcfc" }}
    >
      <div
        ref={ref}
        style={{ height: isFetching || error ? loadingIndicatorHeight : 1 }}
      >
        {isFetching ? <CenterLoading /> : error ? <span>Error</span> : ""}
      </div>
      <div
        style={{
          overflowAnchor: "none",
          paddingTop,
          paddingBottom,
        }}
      >
        {items.length === 0 ? (
          <EmptyState title="No messages" subtitle="No messages to display." />
        ) : (
          items.map((virtualRow) => {
            const index = reverseIndex(virtualRow.index);
            const message = allMessages[index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                data-reverse-index={index}
                ref={rowVirtualizer.measureElement}
                className={
                  virtualRow.index % 2 ? "ListItemOdd" : "ListItemEven"
                }
              >
                <Message
                  message={message}
                  key={virtualRow.key}
                  humanStyles={{
                    backgroundColor: "#ffffff",
                  }}
                  aiStyles={{
                    backgroundColor: "#efefef",
                  }}
                />
              </div>
            );
          })
        )}
        {isWaiting && <CenterLoading />}
      </div>
    </div>
  );
}

export default function ConversationView(props: ConversationViewProps) {
  const { data, isLoading } = useListChatMessages(props.chatId);
  const messages = data?.chatMessages || [];
  const loading = isLoading;

  useEffect(() => {
    props.onMessages && props.onMessages();
  }, [messages, props.onMessages]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fcfcfc",
        padding: "4px",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {messages.length === 0 && !loading && (
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
      {loading && (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <Spinner size="normal" />
        </div>
      )}
    </div>
  );
}
