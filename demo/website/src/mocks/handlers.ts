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
      sources: [
        {
          sourceId: '0',
          chatId,
          messageId,
          metadata: {
            source_location:
              's3://dev-galileo-corpusnested-processeddatabucket4e25d-zdoz53846j8j/cases/42/case1499.txt',
            example: 'True',
            'category-id': '42',
            domain: 'Legal',
            'original-source-url': 'https://osf.io/qvg8s/files/osfstorage',
            category: 'Immigration Law',
            'asset-key-prefix': '/cases/42/',
            collection: 'casefiles',
            'original-location': 'https://osf.io/8mjcy#preprocessed_cases[cases_29404]/42',
            'original-source': 'OSF: SigmaLaw - Large Legal Text Corpus and Word Embeddings',
            section_index: 57,
          },
          pageContent: "Q. \n\nAnd ma'am, you indica",
        },
        {
          sourceId: '1',
          chatId,
          messageId,
          metadata: {
            source_location: 's3://dev-galileo-corpusnested-processeddatabucket4e25d-zdoz53846j8j/cases/36/case740.txt',
            example: 'True',
            'category-id': '36',
            domain: 'Legal',
            'original-source-url': 'https://osf.io/qvg8s/files/osfstorage',
            category: 'Family Law',
            'asset-key-prefix': '/cases/36/',
            collection: 'casefiles',
            'original-location': 'https://osf.io/8mjcy#preprocessed_cases[cases_29404]/36',
            'original-source': 'OSF: SigmaLaw - Large Legal Text Corpus and Word Embeddings',
            section_index: 32,
          },
          pageContent:
            "How are you feeling?)   \n\nI feel nervous.   \n\nHe cries and makes me feel bad.   \n\nIt feels fake.   \n\nHe calls me ‘My precious.’   \n\nIt's too much, it's gross.   \n\nHe clings on to you.  \n\n[¶] I don't like how he treats my grandmother.  \n\n(How does he treat her?)   \n\nHarshly, like she works for him.   \n\nOne time, I made a mess in his office and she said she needed to clean this up or he would fire her!”\n\n\nNancy told Clipson:  “He picks me up, holds me tight, so I'm kicking to get down.   \n\nHe won't let go of me.   \n\nI don't want to visit with him even if my grandmother and aunt are around.  \n\n(How do you feel about visiting your aunt and grandmother?)   \n\nI sometimes want to visit them.   \n\nI feel they spoil us so we love them more than our own parents.  \n\n[¶] (How do you feel about seeing your grandfather today?)   \n\nIt's awkward.   \n\nI haven't seen him in a long time.   \n\nHe's like a stranger.   \n\nI want him to see our haircuts.”",
        },
        {
          sourceId: '2',
          chatId,
          messageId,
          metadata: {
            source_location: 's3://dev-galileo-corpusnested-processeddatabucket4e25d-zdoz53846j8j/cases/1/case1181.txt',
            example: 'True',
            'category-id': '1',
            domain: 'Legal',
            'original-source-url': 'https://osf.io/qvg8s/files/osfstorage',
            category: 'Administrative Law',
            'asset-key-prefix': '/cases/1/',
            collection: 'casefiles',
            'original-location': 'https://osf.io/8mjcy#preprocessed_cases[cases_29404]/1',
            'original-source': 'OSF: SigmaLaw - Large Legal Text Corpus and Word Embeddings',
            section_index: 2,
          },
          pageContent:
            "The note stated:\nI know I really haven't talked to you in awhile.   \n\nHopefully this note doesn't come out the wrong way.   \n\nI've heard 3 diff[erent] stories about you & Ryan.\n\nThe one I heard almost made me want to go kill myself.   \n\nMostly because if there was any chance in hell of you & me solving the what if's I fucked it up.   \n\nAnyways I heard that instead of Danielle it was you online Friday.   \n\nIf I said anything stupid, I apologize (this weekend sucked & I've tried to make myself forget it).   \n\nSo how have you been?   \n\nHow's driving going?   \n\nRemember stop signs w/ white lines around them are optional & if you hit a pedestrian @\n\nnite\n\n& he's wearing black its 100 pts.   \n\nFor some reason, I just thought this & have to ask you, is there any grudge or an[imosity] btwn us?   \n\nI g2g.   Write back if you can, if not hopefully I ttyl.   \n\nLuv ya.   Ur ex-husband, Mike.\n(App. 41 (emphasis added).)",
        },
        {
          sourceId: '3',
          chatId,
          messageId,
          metadata: {
            source_location: 's3://dev-galileo-corpusnested-processeddatabucket4e25d-zdoz53846j8j/cases/10/case683.txt',
            example: 'True',
            'category-id': '10',
            domain: 'Legal',
            'original-source-url': 'https://osf.io/qvg8s/files/osfstorage',
            category: 'Class Actions',
            'asset-key-prefix': '/cases/10/',
            collection: 'casefiles',
            'original-location': 'https://osf.io/8mjcy#preprocessed_cases[cases_29404]/10',
            'original-source': 'OSF: SigmaLaw - Large Legal Text Corpus and Word Embeddings',
            section_index: 20,
          },
          pageContent: '49',
        },
        {
          sourceId: '4',
          chatId,
          messageId,
          metadata: {
            source_location: 's3://dev-galileo-corpusnested-processeddatabucket4e25d-zdoz53846j8j/cases/38/case414.txt',
            example: 'True',
            'category-id': '38',
            domain: 'Legal',
            'original-source-url': 'https://osf.io/qvg8s/files/osfstorage',
            category: 'Government Benefits',
            'asset-key-prefix': '/cases/38/',
            collection: 'casefiles',
            'original-location': 'https://osf.io/8mjcy#preprocessed_cases[cases_29404]/38',
            'original-source': 'OSF: SigmaLaw - Large Legal Text Corpus and Word Embeddings',
            section_index: 8,
          },
          pageContent:
            "I can take care of myself.   \n\nI am happy then and have a good, positive attitude.\n\n\n2. The Medical Evidence\na. Treating Physician, Dr. Kratche\nFamily practitioner Dr. Robert Kratche first treated Buxton from late 1991 to late 1992.   \n\nIn response to a question regarding Buxton's limitations to do work-related activities, Dr. Kratche wrote:  “In my opinion, Fran Buxton is fully capable of performing any and all activities delineated above.   \n\nShe is bright and articulate and has no demonstrable physical disability.”   \n\nDr. Kratche directed the reader's attention to his patient notes for July 15, 1992 and August 5, 1992.   \n\nDr. Kratche's note on July 15, 1992 reads as follows:\nS: \n\nPatient is a 43 year old white female who presents quite upset with a complaint of 3 year history of chronic fatigue.   \n\nShe states that various chemicals including the chlorine in her water at home tend to make her quite weak.",
        },
      ],
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

  rest.get('https://*/prod//chat/:chatId/message/:messageId/source', (req, res, ctx) => {
    const messageId = req.params.messageId as string;
    const chatId = req.params.chatId as string;
    const response: ListChatMessageSourcesResponseContent = {
      chatMessageSources: [
        {
          sourceId: '0',
          chatId,
          messageId,
          metadata: {
            source_location:
              's3://dev-galileo-corpusnested-processeddatabucket4e25d-zdoz53846j8j/cases/42/case1499.txt',
            example: 'True',
            'category-id': '42',
            domain: 'Legal',
            'original-source-url': 'https://osf.io/qvg8s/files/osfstorage',
            category: 'Immigration Law',
            'asset-key-prefix': '/cases/42/',
            collection: 'casefiles',
            'original-location': 'https://osf.io/8mjcy#preprocessed_cases[cases_29404]/42',
            'original-source': 'OSF: SigmaLaw - Large Legal Text Corpus and Word Embeddings',
            section_index: 57,
          },
          pageContent: "Q. \n\nAnd ma'am, you indica",
        },
        {
          sourceId: '1',
          chatId,
          messageId,
          metadata: {
            source_location: 's3://dev-galileo-corpusnested-processeddatabucket4e25d-zdoz53846j8j/cases/36/case740.txt',
            example: 'True',
            'category-id': '36',
            domain: 'Legal',
            'original-source-url': 'https://osf.io/qvg8s/files/osfstorage',
            category: 'Family Law',
            'asset-key-prefix': '/cases/36/',
            collection: 'casefiles',
            'original-location': 'https://osf.io/8mjcy#preprocessed_cases[cases_29404]/36',
            'original-source': 'OSF: SigmaLaw - Large Legal Text Corpus and Word Embeddings',
            section_index: 32,
          },
          pageContent:
            "How are you feeling?)   \n\nI feel nervous.   \n\nHe cries and makes me feel bad.   \n\nIt feels fake.   \n\nHe calls me ‘My precious.’   \n\nIt's too much, it's gross.   \n\nHe clings on to you.  \n\n[¶] I don't like how he treats my grandmother.  \n\n(How does he treat her?)   \n\nHarshly, like she works for him.   \n\nOne time, I made a mess in his office and she said she needed to clean this up or he would fire her!”\n\n\nNancy told Clipson:  “He picks me up, holds me tight, so I'm kicking to get down.   \n\nHe won't let go of me.   \n\nI don't want to visit with him even if my grandmother and aunt are around.  \n\n(How do you feel about visiting your aunt and grandmother?)   \n\nI sometimes want to visit them.   \n\nI feel they spoil us so we love them more than our own parents.  \n\n[¶] (How do you feel about seeing your grandfather today?)   \n\nIt's awkward.   \n\nI haven't seen him in a long time.   \n\nHe's like a stranger.   \n\nI want him to see our haircuts.”",
        },
        {
          sourceId: '2',
          chatId,
          messageId,
          metadata: {
            source_location: 's3://dev-galileo-corpusnested-processeddatabucket4e25d-zdoz53846j8j/cases/1/case1181.txt',
            example: 'True',
            'category-id': '1',
            domain: 'Legal',
            'original-source-url': 'https://osf.io/qvg8s/files/osfstorage',
            category: 'Administrative Law',
            'asset-key-prefix': '/cases/1/',
            collection: 'casefiles',
            'original-location': 'https://osf.io/8mjcy#preprocessed_cases[cases_29404]/1',
            'original-source': 'OSF: SigmaLaw - Large Legal Text Corpus and Word Embeddings',
            section_index: 2,
          },
          pageContent:
            "The note stated:\nI know I really haven't talked to you in awhile.   \n\nHopefully this note doesn't come out the wrong way.   \n\nI've heard 3 diff[erent] stories about you & Ryan.\n\nThe one I heard almost made me want to go kill myself.   \n\nMostly because if there was any chance in hell of you & me solving the what if's I fucked it up.   \n\nAnyways I heard that instead of Danielle it was you online Friday.   \n\nIf I said anything stupid, I apologize (this weekend sucked & I've tried to make myself forget it).   \n\nSo how have you been?   \n\nHow's driving going?   \n\nRemember stop signs w/ white lines around them are optional & if you hit a pedestrian @\n\nnite\n\n& he's wearing black its 100 pts.   \n\nFor some reason, I just thought this & have to ask you, is there any grudge or an[imosity] btwn us?   \n\nI g2g.   Write back if you can, if not hopefully I ttyl.   \n\nLuv ya.   Ur ex-husband, Mike.\n(App. 41 (emphasis added).)",
        },
        {
          sourceId: '3',
          chatId,
          messageId,
          metadata: {
            source_location: 's3://dev-galileo-corpusnested-processeddatabucket4e25d-zdoz53846j8j/cases/10/case683.txt',
            example: 'True',
            'category-id': '10',
            domain: 'Legal',
            'original-source-url': 'https://osf.io/qvg8s/files/osfstorage',
            category: 'Class Actions',
            'asset-key-prefix': '/cases/10/',
            collection: 'casefiles',
            'original-location': 'https://osf.io/8mjcy#preprocessed_cases[cases_29404]/10',
            'original-source': 'OSF: SigmaLaw - Large Legal Text Corpus and Word Embeddings',
            section_index: 20,
          },
          pageContent: '49',
        },
        {
          sourceId: '4',
          chatId,
          messageId,
          metadata: {
            source_location: 's3://dev-galileo-corpusnested-processeddatabucket4e25d-zdoz53846j8j/cases/38/case414.txt',
            example: 'True',
            'category-id': '38',
            domain: 'Legal',
            'original-source-url': 'https://osf.io/qvg8s/files/osfstorage',
            category: 'Government Benefits',
            'asset-key-prefix': '/cases/38/',
            collection: 'casefiles',
            'original-location': 'https://osf.io/8mjcy#preprocessed_cases[cases_29404]/38',
            'original-source': 'OSF: SigmaLaw - Large Legal Text Corpus and Word Embeddings',
            section_index: 8,
          },
          pageContent:
            "I can take care of myself.   \n\nI am happy then and have a good, positive attitude.\n\n\n2. The Medical Evidence\na. Treating Physician, Dr. Kratche\nFamily practitioner Dr. Robert Kratche first treated Buxton from late 1991 to late 1992.   \n\nIn response to a question regarding Buxton's limitations to do work-related activities, Dr. Kratche wrote:  “In my opinion, Fran Buxton is fully capable of performing any and all activities delineated above.   \n\nShe is bright and articulate and has no demonstrable physical disability.”   \n\nDr. Kratche directed the reader's attention to his patient notes for July 15, 1992 and August 5, 1992.   \n\nDr. Kratche's note on July 15, 1992 reads as follows:\nS: \n\nPatient is a 43 year old white female who presents quite upset with a complaint of 3 year history of chronic fatigue.   \n\nShe states that various chemicals including the chlorine in her water at home tend to make her quite weak.",
        },
      ],
    };

    return res(ctx.json(response));
  }),
];
