/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { Meta, StoryObj } from "@storybook/react";
import Message from "../Message";

const meta: Meta<typeof Message> = {
  title: "Chat/Message",
  component: Message,
};
export default meta;
type Story = StoryObj<typeof Message>;

export const Empty: Story = {
  args: {
    message: {
      chatId: "001",
      messageId: "001",
      type: "human",
      createdAt: Date.now(),
      text: "Hellow",
    },
  },
};
