/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { NorthStarThemeProvider } from '@aws-northstar/ui';
import { Meta, StoryObj } from '@storybook/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import Chat from '../ChatPanel';

const meta: Meta<typeof Chat> = {
  title: 'Chat/Chat',
  component: Chat,
};
export default meta;
type Story = StoryObj<typeof Chat>;

export const Empty: Story = {
  args: {
    chat: {
      chatId: '001',
      title: 'Test Session',
      userId: '001',
    },
  },
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      return (
        <NorthStarThemeProvider>
          <QueryClientProvider client={queryClient}>
            <div style={{ width: '800px', height: '600px' }}>
              <Story />
            </div>
          </QueryClientProvider>
        </NorthStarThemeProvider>
      );
    },
  ],
};
