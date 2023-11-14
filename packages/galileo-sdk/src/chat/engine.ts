/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import '../langchain/patch.js';
import { BaseLanguageModel } from 'langchain/base_language';
import { BaseRetriever } from 'langchain/schema/retriever';
import { ChatEngineChain, ChatEngineChainFromInput } from './chain.js';
import { UnresolvedChatEngineConfig, resolveChatEngineConfig } from './config/index.js';
import { DynamoDBChatMessageHistory } from './dynamodb/message-history.js';
import { ChatEngineHistory, ChatTurn } from './memory.js';
import { SearchRetriever } from './search.js';
import { Dict } from '../models/index.js';

export interface ChatEngineFromOption extends UnresolvedChatEngineConfig {
  readonly chatId: string;
  readonly userId: string;
  readonly maxNewTokens?: number;
  readonly chatHistoryTable: string;
  readonly chatHistoryTableIndexName: string;
  readonly verbose?: boolean;
  readonly returnTraceData?: boolean;
}

interface ChatEngineProps extends ChatEngineChainFromInput {
  readonly chatId: string;
  readonly userId: string;
  readonly llm: BaseLanguageModel;
  readonly memory: ChatEngineHistory;
  readonly retriever: BaseRetriever;
  readonly verbose?: boolean;
  readonly returnTraceData?: boolean;
}

export class ChatEngine {
  static async from(options: ChatEngineFromOption): Promise<ChatEngine> {
    const {
      chatId,
      userId,
      maxNewTokens = 500,
      chatHistoryTable,
      chatHistoryTableIndexName,
      verbose = process.env.LOG_LEVEL === 'DEBUG',
      returnTraceData,
      ...unresolvedConfig
    } = options;

    const config = await resolveChatEngineConfig(unresolvedConfig, {
      verbose,
    });

    const retriever = new SearchRetriever(config.search);

    const historyLimit = config.memory?.limit ?? 20;
    const chatHistory = new DynamoDBChatMessageHistory({
      tableName: chatHistoryTable,
      indexName: chatHistoryTableIndexName,
      userId,
      chatId,
      messagesLimit: historyLimit,
    });

    const memory = new ChatEngineHistory({
      chatHistory,
      k: historyLimit,
    });

    return new ChatEngine({
      ...options,
      ...config,
      qaChain: {
        type: 'stuff',
        ...config.qaChain,
      },
      memory,
      retriever,
    });
  }

  readonly chatId: string;
  readonly userId: string;
  readonly llm: BaseLanguageModel;
  readonly memory: ChatEngineHistory;
  readonly retriever: BaseRetriever;
  readonly chain: ChatEngineChain;

  protected readonly returnTraceData: boolean;

  constructor(props: ChatEngineProps) {
    const {
      chatId,
      userId,
      llm,
      memory,
      retriever,
      qaChain,
      condenseQuestionChain,
      classifyChain,
      verbose,
      returnTraceData,
    } = props;

    this.returnTraceData = returnTraceData ?? false;

    this.chatId = chatId;
    this.userId = userId;
    this.llm = llm;
    this.memory = memory;
    this.retriever = retriever;

    this.chain = ChatEngineChain.from({
      verbose,
      memory,
      retriever,
      qaChain,
      condenseQuestionChain,
      classifyChain,
      returnSourceDocuments: true,
    }) as ChatEngineChain;

    if (!(this.chain instanceof ChatEngineChain)) {
      throw new Error('Chain is not instanceof ChatEngineChain');
    }
  }

  async query(query: string): Promise<ChatEngineQueryResponse> {
    const result = await this.chain.call({ question: query });
    const turn = this.memory.lastTurn;

    return {
      question: query,
      answer: result.text,
      turn,
      traceData: this.returnTraceData ? this._resolveTraceData() : undefined,
    };
  }

  protected _resolveTraceData(): Dict {
    try {
      return {
        chatId: this.chatId,
        userId: this.userId,
        ...this.chain.traceData,
      };
    } catch (error) {
      return {
        __resolveTraceError: (error as Error).message,
      };
    }
  }
}

export interface ChatEngineQueryResponse {
  /** The input question text for the query */
  readonly question: string;
  /** The output answer text from the engine */
  readonly answer: string;
  /** Full details regarding stored entities/sources for the turn (human => ai) */
  readonly turn: ChatTurn;
  /** Additional data about the query execution, such as debugging data for admins */
  readonly traceData?: Record<string, any>;
}
