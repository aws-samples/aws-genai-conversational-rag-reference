/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  DynamoDBClient,
  DynamoDBClientConfig,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';

import { Document } from 'langchain/document';
import {
  BaseMessage,
  BaseListChatMessageHistory,
  HumanMessage,
  AIMessage,
  StoredMessage,
} from 'langchain/schema';
import * as lib from './lib/index.js';
import { getLogger } from '../../common/index.js';
import {
  mapStoredMessagesToChatMessages,
} from '../../langchain/stores/messages/utils.js';

const logger = getLogger(__filename);

export interface DynamoDBChatMessageHistoryFields {
  tableName: string;
  indexName: string;
  messagesLimit?: number;
  userId: string;
  chatId: string;
  config?: DynamoDBClientConfig;
}

export class DynamoDBChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace = ['galileo', 'chat', 'dynamodb'];

  get lc_secrets(): { [key: string]: string } | undefined {
    return {
      'config.credentials.accessKeyId': 'AWS_ACCESS_KEY_ID',
      'config.credentials.secretAccessKey': 'AWS_SECRETE_ACCESS_KEY',
      'config.credentials.sessionToken': 'AWS_SESSION_TOKEN',
    };
  }

  protected tableName: string;
  protected indexName: string;
  protected messagesLimit: number;
  protected userId: string;
  protected chatId: string;

  protected client: DynamoDBClient;
  protected docClient: DynamoDBDocumentClient;

  constructor({
    tableName,
    indexName,
    messagesLimit,
    userId,
    chatId,
    config,
  }: DynamoDBChatMessageHistoryFields) {
    super();
    this.tableName = tableName;
    this.indexName = indexName;
    this.messagesLimit = messagesLimit || 40;
    this.userId = userId;
    this.chatId = chatId;

    this.client = new DynamoDBClient(config ?? {});
    this.docClient = DynamoDBDocumentClient.from(this.client);

  }

  async getMessages(): Promise<BaseMessage[]> {
    try {
      const Items = await lib.Messages.listAllMessagesByTime(
        this.docClient,
        this.tableName,
        this.indexName,
        this.userId,
        this.chatId,
        false,
        this.messagesLimit,
      );

      if (Items == null) {
        return [];
      }

      // Need to reverse since in descending order (latest is first)
      Items.reverse();

      return mapStoredMessagesToChatMessages(Items.map((item): StoredMessage => {
        return {
          type: item.type,
          data: {
            name: undefined,
            content: item.data.content,
            role: item.type,
            additional_kwargs: item,
          },
        };
      }));
    } catch (error) {
      logger.error('Failed to get messages', error as Error);
      return [];
    }
  }

  async clear(): Promise<void> {
    throw new Error('Not implemented - DynamoDBChatMessageHistory.clear');
  }

  async addUserMessage(message: string): Promise<any> {
    return this.addMessage(new HumanMessage(message));
  }

  async addAIChatMessage(message: string, sources?: Document[]): Promise<any> {
    return this.addMessage(new AIMessage(message), sources);
  }

  async addMessage(message: BaseMessage, sources?: Document[]): Promise<any> {
    try {
      if (message instanceof AIMessage) {
        const response = await lib.Messages.createAIChatMessage(
          this.docClient,
          this.tableName,
          this.userId,
          this.chatId,
          message.content,
          sources || [],
        );

        logger.debug({ message: 'Successfully stored chat message', response });

        return response;
      } else if (message instanceof HumanMessage) {
        const response = await lib.Messages.createHumanChatMessage(
          this.docClient,
          this.tableName,
          this.userId,
          this.chatId,
          message.content,
        );

        logger.debug({ message: 'Successfully stored chat message', response });

        return response;
      }
    } catch (error) {
      logger.error('Failed to save message', error as Error);
      throw error;
    }
  }
}
