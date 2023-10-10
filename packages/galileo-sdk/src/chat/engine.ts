/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import '../langchain/patch.js';
import { BaseLLM } from 'langchain/llms/base';
import { PromptTemplate } from 'langchain/prompts';
import { BaseRetriever } from 'langchain/schema/retriever';
import { ChatEngineChain } from './chain.js';
import { ChatEngineContext } from './context.js';
import { DynamoDBChatMessageHistory } from './dynamodb/message-history.js';
import { ChatEngineHistory, ChatTurn } from './memory.js';
import { SearchRetriever, SearchRetrieverInput } from './search.js';
import { TKwags } from '../common/types.js';
import { Dict, IModelInfo } from '../models/index.js';
import { ChatCondenseQuestionPromptRuntime, ChatQuestionAnswerPromptRuntime } from '../prompt/templates/chat/index.js';

export interface ChatEngineConfig {
  readonly llmModel?: string | IModelInfo;
  readonly llmModelKwargs?: TKwags;
  readonly llmEndpointKwargs?: TKwags;
  readonly search?: SearchRetrieverInput;
  readonly memoryKwargs?: TKwags;
  readonly qaPrompt?: string | ChatQuestionAnswerPromptRuntime;
  readonly condenseQuestionPrompt?: string | ChatCondenseQuestionPromptRuntime;
}

export interface ChatEngineFromOption {
  readonly chatId: string;
  readonly userId: string;
  readonly domain: string;
  readonly maxNewTokens?: number;
  readonly chatHistoryTable: string;
  readonly chatHistoryTableIndexName: string;
  readonly search: SearchRetrieverInput;
  readonly verbose?: boolean;
  readonly config?: ChatEngineConfig;
  readonly returnTraceData?: boolean;
}

interface ChatEngineProps {
  readonly chatId: string;
  readonly userId: string;
  readonly domain: string;
  readonly llm: BaseLLM;
  readonly chatHistory: DynamoDBChatMessageHistory;
  readonly memory: ChatEngineHistory;
  readonly retriever: BaseRetriever;
  readonly qaPrompt: PromptTemplate;
  readonly condenseQuestionPrompt: PromptTemplate;
  readonly verbose?: boolean;
  readonly returnTraceData?: boolean;
}

export class ChatEngine {
  static async from(options: ChatEngineFromOption): Promise<ChatEngine> {
    const {
      chatId,
      userId,
      domain,
      maxNewTokens = 500,
      chatHistoryTable,
      chatHistoryTableIndexName,
      search: searchOptions,
      config = {},
      verbose = (process.env.LOG_LEVEL === 'DEBUG'),
    } = options;

    if (domain == null || domain.length === 0) {
      throw new Error('Missing domain config');
    }

    const retriever = new SearchRetriever(searchOptions);

    const modelInfo = await ChatEngineContext.resolveModelInfo(config.llmModel);

    const context = new ChatEngineContext(modelInfo, {
      domain,
      maxNewTokens,
      qaPrompt: typeof config.qaPrompt === 'string' ? { template: config.qaPrompt } : config.qaPrompt,
      condenseQuestionPrompt: typeof config.condenseQuestionPrompt === 'string' ? { template: config.condenseQuestionPrompt } : config.condenseQuestionPrompt,
      endpointKwargs: config.llmEndpointKwargs,
      modelKwargs: config.llmModelKwargs,
      verbose,
    });

    const chatHistory = new DynamoDBChatMessageHistory({
      tableName: chatHistoryTable,
      indexName: chatHistoryTableIndexName,
      userId,
      chatId,
    });

    const memory = new ChatEngineHistory({
      chatHistory,
      k: 20, // TODO: need to right size this
      ...config.memoryKwargs,
    });

    return new ChatEngine({
      ...options,
      ...context,
      chatHistory,
      memory,
      retriever,
    });
  }

  readonly chatId: string;
  readonly userId: string;
  readonly llm: BaseLLM;
  readonly chatHistory: DynamoDBChatMessageHistory;
  readonly memory: ChatEngineHistory;
  readonly retriever: BaseRetriever;

  readonly chain: ChatEngineChain;

  protected qaPrompt: PromptTemplate;
  protected condenseQuestionPrompt: PromptTemplate;
  protected readonly returnTraceData: boolean;

  constructor(props: ChatEngineProps) {
    const {
      chatId,
      userId,
      chatHistory,
      llm,
      memory,
      retriever,
      qaPrompt,
      condenseQuestionPrompt,
      verbose,
      returnTraceData,
    } = props;

    this.returnTraceData = returnTraceData ?? false;
    this.qaPrompt = qaPrompt;
    this.condenseQuestionPrompt = condenseQuestionPrompt;

    this.chatId = chatId;
    this.userId = userId;
    this.llm = llm;
    this.chatHistory = chatHistory;
    this.memory = memory;
    this.retriever = retriever;

    this.chain = ChatEngineChain.fromLLM(
      this.llm,
      this.retriever,
      {
        verbose,
        memory: this.memory,
        qaChainOptions: {
          type: 'stuff',
          prompt: this.qaPrompt,
          verbose,
        },
        questionGenerator: {
          llm: this.llm,
          prompt: this.condenseQuestionPrompt,
        },
        returnSourceDocuments: true,
      },
    ) as ChatEngineChain;

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
        llm: this.llm.toJSON(),
        qaPrompt: this.qaPrompt.toJSON(),
        condenseQuestionPrompt: this.condenseQuestionPrompt.toJSON(),
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
