/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { NorthStarThemeProvider } from "@aws-northstar/ui";
import { Meta, StoryObj } from "@storybook/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import ChatsList from "../ChatsList";

const meta: Meta<typeof ChatsList> = {
  title: "Chat/Chats List",
  component: ChatsList,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      return (
        <NorthStarThemeProvider>
          <QueryClientProvider client={queryClient}>
            <div style={{ width: "400px" }}>
              <Story />
            </div>
          </QueryClientProvider>
        </NorthStarThemeProvider>
      );
    },
  ],
};
export default meta;
type Story = StoryObj<typeof ChatsList>;

export const Loading: Story = {
  args: {
    items: [],
    selectedItem: undefined,
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    items: [],
    selectedItem: undefined,
    loading: false,
  },
};

export const Single: Story = {
  args: {
    items: [
      {
        title: "First Chat",
        createdAt: Date.now() + 1,
        chatId: "001",
        userId: "001",
      },
    ],
    selectedItem: undefined,
    loading: false,
  },
};

const items = [
  {
    title: "First Chat",
    createdAt: Date.now() + 1,
    chatId: "001",
    userId: "001",
  },
];
export const SelectedChat: Story = {
  args: {
    items: items,
    selectedItem: items[0],
    loading: false,
  },
};

export const Multipage: Story = {
  args: {
    items: [
      {
        title: "First Chat",
        createdAt: Date.now() + 1,
        chatId: "001",
        userId: "001",
      },
      {
        title: "Second Chat",
        createdAt: Date.now() + 1,
        chatId: "002",
        userId: "001",
      },
      {
        title: "Third Chat",
        createdAt: Date.now() + 1,
        chatId: "003",
        userId: "001",
      },
      {
        title: "Fourth Chat",
        createdAt: Date.now() + 1,
        chatId: "004",
        userId: "001",
      },
      {
        title: "Fifth Chat",
        createdAt: Date.now() + 1,
        chatId: "005",
        userId: "001",
      },
      {
        title: "Sixth Chat",
        createdAt: Date.now() + 1,
        chatId: "006",
        userId: "001",
      },
    ],
    selectedItem: undefined,
    loading: false,
  },
};
