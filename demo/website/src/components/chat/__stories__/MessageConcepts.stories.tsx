/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { Meta, StoryObj } from "@storybook/react";
import { ChatMessage } from "api-typescript-react-query-hooks";
import MessageComponent1 from "../message/Concept1";
import MessageComponent3 from "../message/Concept3";

interface IMessageConcept {
  Component: React.ComponentType<{ message: ChatMessage }>;
  title: string;
  wrapperStyle?: React.HTMLAttributes<HTMLDivElement>["style"];
}

function MessageConceptFrame({
  concepts,
  messages,
}: {
  concepts: IMessageConcept[];
  messages: ChatMessage[];
}) {
  return (
    <div style={{ display: "flex", gap: "30px", flexDirection: "column" }}>
      {concepts.map((concept) => (
        <MessageConcept key={concept.title} {...concept} messages={messages} />
      ))}
    </div>
  );
}

function MessageConcept({
  Component,
  messages,
  title,
  wrapperStyle = {},
}: {
  Component: React.ComponentType<{ message: ChatMessage }>;
  messages: ChatMessage[];
  title: string;
  wrapperStyle?: React.HTMLAttributes<HTMLDivElement>["style"];
}) {
  return (
    <div>
      <h3>{title}</h3>
      <div
        style={{ border: "1px solid #ddd", padding: "12px", ...wrapperStyle }}
      >
        {messages.map((msg) => (
          // @ts-ignore
          <Component message={msg} key={title + msg.messageId} />
        ))}
      </div>
    </div>
  );
}

const meta: Meta<typeof MessageConceptFrame> = {
  title: "Chat/Message",
  component: MessageConceptFrame,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "600px" }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof MessageConceptFrame>;

export const Concepts: Story = {
  args: {
    messages: [
      {
        chatId: "001",
        messageId: "001",
        type: "human",
        createdAt: Date.now(),
        text: "Hello",
      },
      {
        chatId: "001",
        messageId: "002",
        type: "ai",
        createdAt: Date.now() + 2,
        text: "Hi Human",
      },
      {
        chatId: "001",
        messageId: "003",
        type: "human",
        createdAt: Date.now() + 4,
        text: "What's the outlook?",
      },
      {
        chatId: "001",
        messageId: "004",
        type: "ai",
        createdAt: Date.now() + 6,
        text: "It looks like it's going to rain.",
      },
    ],
    concepts: [
      {
        title: "Concept 1",
        Component: MessageComponent1,
      },
      // {
      //   title: "Concept 2",
      //   Component: MessageComponent2,
      // },
      {
        title: "Concept 3",
        Component: MessageComponent3,
        wrapperStyle: {
          background: "#eee",
          display: "grid",
        },
      },
    ],
  },
};
