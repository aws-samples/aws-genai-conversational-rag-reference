/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  ChatMessage,
  Configuration,
  DefaultApi,
  DefaultApiClientProvider,
  ListChatMessagesResponseContent,
  MessageType,
} from 'api-typescript-react-query-hooks';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import React, { FC } from 'react';
import { useListChatMessages } from './chats';

export const mswServer = setupServer();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: Infinity,
    },
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: process.env.NODE_ENV === 'test' ? () => {} : console.error,
  },
});

const wrapper: FC<{ children: React.ReactNode }> = ({ children }) => {
  const apiClient = new DefaultApi(
    new Configuration({
      basePath: 'https://testing-in-localhost/prod/',
    }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <DefaultApiClientProvider apiClient={apiClient} client={queryClient}>
        {children}
      </DefaultApiClientProvider>
    </QueryClientProvider>
  );
};

describe('useInfiniteChatMessage', () => {
  beforeEach(() => {
    mswServer.listen({
      onUnhandledRequest: 'error',
    });
  });
  afterEach(() => {
    mswServer.resetHandlers();
    queryClient.clear();
  });
  afterAll(() => mswServer.close());

  test('should load nothing if there are no results', async () => {
    const chatId = '001';
    const records: ChatMessage[] = [];
    mswServer.use(
      rest.get('https://*/prod//chat/:chatId', (_req, res, ctx) => {
        const response: ListChatMessagesResponseContent = {
          chatMessages: records,
        };
        return res(ctx.json(response));
      }),
    );

    const { result } = renderHook(() => useListChatMessages({ chatId }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    const allMessages = result.current.data?.pages.flatMap((d) => d.chatMessages);
    expect(allMessages).toStrictEqual(records);
  });

  test('should load a single page of results if available', async () => {
    const chatId = '001';
    const records: ChatMessage[] = [
      {
        messageId: '1ae36536-e647-4a2a-8305-32e3366b4706',
        text: "I'm sorry, but I need more information to answer your question. Can you please provide more context or clarify what you are asking?",
        createdAt: 1689228245044,
        chatId: chatId,
        type: 'ai' as MessageType,
      },
    ];
    mswServer.use(
      rest.get('https://*/prod//chat/:chatId', (_req, res, ctx) => {
        const response: ListChatMessagesResponseContent = {
          chatMessages: records,
        };

        return res(ctx.json(response));
      }),
    );

    const { result } = renderHook(() => useListChatMessages({ chatId }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    const allMessages = result.current.data?.pages.flatMap((d) => d.chatMessages);
    expect(allMessages).toStrictEqual(records);
  });

  test('should load multiple pages of results if available', async () => {
    const chatId = '001';
    const pageSize = 2;
    const records: ChatMessage[] = [
      {
        messageId: '1ae36536-e647-4a2a-8305-32e3366b4706',
        text: "I'm sorry, but I need more information to answer your question. Can you please provide more context or clarify what you are asking?",
        createdAt: 1689228245044,
        chatId: chatId,
        type: 'ai' as MessageType,
      },
      {
        messageId: '24af6abd-7452-40b5-87a0-417387003b59',
        text: 'whats going on?',
        createdAt: 1689228245032,
        chatId: chatId,
        type: 'human' as MessageType,
      },
      {
        messageId: 'dd209d1b-267a-4f30-a8dc-143e93fdf12f',
        text: 'Hello! I am doing well, thank you for asking. How about you?',
        createdAt: 1689227819770,
        chatId: chatId,
        type: 'ai' as MessageType,
      },
      {
        messageId: 'a672d448-f7f7-497e-958f-aefd283fbaa9',
        text: 'dsadf',
        createdAt: 1689227819762,
        chatId: chatId,
        type: 'human' as MessageType,
      },
      {
        messageId: '1784e290-931c-4912-91d3-356ccd82b005',
        text: 'I apologize, but I am unable to answer your question as it is not a complete sentence or a question in any language. Please rephrase your question and provide me with a complete sentence or question so that I can assist you further. Thank you.',
        createdAt: 1689227819791,
        chatId: chatId,
        type: 'ai' as MessageType,
      },
    ];
    mswServer.use(
      rest.get('https://*/prod//chat/:chatId', (req, res, ctx) => {
        const reqPageSize = req.url.searchParams.get('pageSize') ? +(req.url.searchParams.get('pageSize') ?? '4') : 4;
        let nextToken = req.url.searchParams.get('nextToken') ? +(req.url.searchParams.get('nextToken') ?? '0') : 0;
        const startIndex = nextToken * reqPageSize;
        const endIndex = startIndex + reqPageSize;

        const response: ListChatMessagesResponseContent = {
          chatMessages: records.slice(startIndex, endIndex),
          nextToken: endIndex < records.length ? '' + (nextToken + 1) : undefined,
        };

        return res(ctx.json(response));
      }),
    );

    const { result } = renderHook(() => useListChatMessages({ chatId, pageSize }), {
      wrapper,
    });

    // get the initial result which should be 2 records
    await waitFor(() => expect(result.current.status).toBe('success'));
    const firstPage = result.current.data?.pages.flatMap((d) => d.chatMessages);
    expect(firstPage).toStrictEqual(records.slice(0, pageSize));

    // fetch the next page
    expect(result.current.hasNextPage).toBe(true);
    await result.current.fetchNextPage();
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    const secondPage = result.current.data?.pages.flatMap((d) => d.chatMessages);
    expect(secondPage).toStrictEqual(records.slice(0, pageSize * 2));

    // fetch the last page
    expect(result.current.hasNextPage).toBe(true);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    const lastPage = result.current.data?.pages.flatMap((d) => d.chatMessages);
    expect(lastPage).toStrictEqual(records.slice(0, pageSize * 3));

    expect(result.current.hasNextPage).toBe(false);
  });
});
