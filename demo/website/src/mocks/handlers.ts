/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
/* eslint-disable import/no-extraneous-dependencies */
import { faker } from '@faker-js/faker';
import {
  ChatMessage,
  CreateChatMessageResponseContent,
  CreateChatResponseContent,
  DeleteChatResponseContent,
  ListChatMessageSourcesResponseContent,
  ListChatMessagesResponseContent,
  ListChatsResponseContent,
  MessageType,
} from 'api-typescript-react-query-hooks';
/* eslint-disable import/no-extraneous-dependencies */
import { rest } from 'msw';

const makeMessages = (chatId: string, n = 10) => {
  let messages: ChatMessage[] = [];
  let lastDate = faker.date.recent();
  for (let i = 0; i < n; i++) {
    lastDate = faker.date.recent({ refDate: lastDate });
    messages.push({
      messageId: faker.string.uuid(),
      chatId,
      type: (i % 2 === 0 ? 'human' : 'ai') as MessageType,
      text: faker.lorem.sentence(),
      createdAt: lastDate.getTime(),
    });
  }
  return messages;
};

const messages = makeMessages('', 30);

export const handlers = [
  rest.get('https://*/prod//chat', (_req, res, ctx) => {
    const response: ListChatsResponseContent = {
      chats: [
        {
          chatId: '001',
          title: 'Mock chat 1',
          userId: '001',
          createdAt: Date.now(),
        },
      ],
    };

    return res(ctx.json(response));
  }),

  rest.get('https://*/prod//chat/:chatId', (req, res, ctx) => {
    const chatId = req.params.chatId as string;

    const records: ChatMessage[] = messages.map((m) => ({ ...m, chatId }));

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

  rest.put('https://*/prod//chat', (_req, res, ctx) => {
    const response: CreateChatResponseContent = {
      chatId: '002',
      title: 'Mock chat 2',
      userId: '001',
      createdAt: Date.now(),
    };

    return res(ctx.json(response));
  }),

  rest.put('https://*/prod//chat/:chatId/message', (req, res, ctx) => {
    const chatId = req.params.chatId as string;
    const messageId = 'e73c8916-1f86-11ee-b903-effcb92a6ed2';
    const response: CreateChatMessageResponseContent = {
      answer: {
        createdAt: 1689037476075,
        chatId: chatId,
        messageId: 'e73e0922-1f86-11ee-9b90-effsasd',
        text: 'Hello! I am doing well, thank you. How can I assist you today?',
        type: 'ai',
      },
      question: {
        createdAt: 1689037476065,
        chatId: chatId,
        messageId,
        text: 'Hello how are you?',
        type: 'human',
      },
      sources: [],
      data: {},
    } as unknown as CreateChatMessageResponseContent;

    return res(ctx.json(response));
  }),

  rest.delete('https://*/prod//chat/:chatId', (req, res, ctx) => {
    const chatId = req.params.chatId as string;
    const response: DeleteChatResponseContent = {
      chatId,
    };

    return res(ctx.json(response));
  }),

  rest.get('https://*/prod//chat/:chatId/message/:messageId/source', (_req, res, ctx) => {
    const response: ListChatMessageSourcesResponseContent = {
      chatMessageSources: [],
    };

    return res(ctx.json(response));
  }),
];
