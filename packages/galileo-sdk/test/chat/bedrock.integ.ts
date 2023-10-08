/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
// @ts-ignore
import type {} from '@types/jest';
import { TextEncoder } from 'util';
import { InvokeEndpointCommand, InvokeEndpointCommandOutput, SageMakerRuntimeClient } from '@aws-sdk/client-sagemaker-runtime';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { BatchWriteCommand, DynamoDBDocumentClient, PutCommand, QueryCommandOutput, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

import * as chatDDBLib from '../../src/chat/dynamodb/lib/index.js';
import { ChatEngine, ChatEngineFromOption } from '../../src/chat/engine.js';
import { ChatTurn } from '../../src/chat/memory.js';
import { ModelFramework, FOUNDATION_MODEL_INVENTORY_SECRET, IFoundationModelInventory } from '../../src/models/index.js';

// const dynamoDBMock = mockClient(DynamoDBClient);
const dynamoDBDocumentMock = mockClient(DynamoDBDocumentClient);
const secretsManagerMock = mockClient(SecretsManagerClient);
const sageMakerRuntimeMock = mockClient(SageMakerRuntimeClient);

describe('integ/bedrock', () => {
  beforeAll(() => {
    process.env.AWS_DEFAULT_REGION = 'us-east-1';
    process.env[FOUNDATION_MODEL_INVENTORY_SECRET] = 'MOCK';
  });

  beforeEach(() => {
    // dynamoDBMock.reset();
    dynamoDBDocumentMock.reset();
    secretsManagerMock.reset();
    sageMakerRuntimeMock.reset();
  });

  test('query', async () => {
    const userId = 'tester';
    const chatId = 'test-chat';
    const answer = 'LLM QA answer';

    secretsManagerMock.on(GetSecretValueCommand).resolves({
      SecretString: JSON.stringify({
        defaultModelId: 'test',
        models: {
          test: {
            uuid: 'test',
            modelId: 'test',
            framework: {
              type: ModelFramework.BEDROCK,
              modelId: 'anthropic.claude-v2',
              region: 'us-east-1',
              modelKwargs: {
                max_tokens_to_sample: 300,
                temperature: 0.5,
                top_p: 0.5,
              },
            },
            adapter: {
              prompt: {
                chat: {
                  questionAnswer: {
                    template: 'Human: <system>You are a research assistant in the \"{{domain}}\" domain. Based on the following rules contained in <rules> tags and provided corpus contained in <corpus> tags, answer the question. \n\n<rules>\n{{#each rules}}{{add @index 1}}. {{.}}\n{{/each}}\n</rules>\n\n</system>\n\n<corpus>\n{{context}}\n</corpus>\n\nQuestion: {{question}}\n\nAssistant: ',
                  },
                  condenseQuestion: {
                    template: 'Human: <system>Given the following conversational dialog contained in <dialog> tags, and the \"Followup Question\" below, rephrase the \"Followup Question\" to be a concise standalone question in its original language. Without answering the question, return only the standalone question.\n</system>\n\n<dialog>\n{{#each chat_history}}\n{{~#if (eq type \"human\")}}User: {{content}}\n{{~else if (eq type \"ai\")}}You: {{content}}\n{{~else if (eq type \"system\")}}System: {{content}}\n{{~else}}{{#if type}}{{type}}: {{/if}}{{content}}\n{{/if}}\n\n{{/each}}\n</dialog>\n\nFollowup Question: {{question}}\n\nAssistant: ',
                  },
                },
              },
            },
          },
        },
      } as IFoundationModelInventory),
    });

    dynamoDBDocumentMock.on(QueryCommand).resolves({
      Items: [
        {
          userId,
          chatId,
          type: 'human',
          data: {
            content: 'Question 1?',
          },
        },
        {
          userId,
          chatId,
          type: 'ai',
          data: {
            content: 'Answer 1',
          },
        },
      ] as chatDDBLib.DDBChatMessage[],
      $metadata: {},
    } as QueryCommandOutput);
    dynamoDBDocumentMock.on(PutCommand).resolves({
      Attributes: {},
    });
    dynamoDBDocumentMock.on(BatchWriteCommand).resolves({});
    // combine inference
    sageMakerRuntimeMock.on(InvokeEndpointCommand)
      .resolvesOnce({
        Body: new TextEncoder().encode(JSON.stringify([{
          generated_text: 'LLM combine response',
        }])),
        $metadata: {},
      } as InvokeEndpointCommandOutput)
      .resolvesOnce({
        Body: new TextEncoder().encode(JSON.stringify([{
          generated_text: answer,
        }])),
        $metadata: {},
      } as InvokeEndpointCommandOutput);

    const options: ChatEngineFromOption = {
      chatId: 'mock',
      userId: 'tester',
      domain: 'TestDomain',
      chatHistoryTable: 'MockDatastore',
      chatHistoryTableIndexName: 'MockIndex',
      search: {
        url: 'http://localhost:1337',
        fetch: async (input, init): Promise<Response> => {

          const content = JSON.stringify({
            documents: [
              {
                pageContent: 'similar doc 1',
                metadata: { a: 'a', b: "b'" },
              },
              {
                pageContent: 'similar doc 2',
                metadata: { a: 'a', b: "b'" },
              },
              {
                pageContent: 'similar doc 3',
                metadata: { a: 'a', b: "b'" },
              },
            ],
          });

          return new Response(content, {
            status: 200,
            headers: new Headers({
              'Content-Type': 'application/json',
            }),
          });
        },
      },
      verbose: true,
    };

    const engine = await ChatEngine.from(options);

    expect(engine).toBeDefined();

    const question = 'user question';
    const result = await engine.query(question);
    expect(result.question).toBe(question);
    expect(result.answer).toBe(answer);
    expect(result.turn).toEqual(expect.objectContaining({
      ai: expect.anything(),
      human: expect.anything(),
      sources: expect.anything(),
    } as ChatTurn));
    expect(Array.isArray(result.turn.sources)).toBeTruthy();
  });
});
