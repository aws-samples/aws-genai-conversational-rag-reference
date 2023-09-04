/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { Meta, StoryObj } from "@storybook/react";
import Chats from "../ChatSplitPanel";

const meta: Meta<typeof Chats> = {
  title: "Chat/ChatSplitPanel",
  component: Chats,
};
export default meta;
type Story = StoryObj<typeof Chats>;

export const Base: Story = {
  args: {},
};
