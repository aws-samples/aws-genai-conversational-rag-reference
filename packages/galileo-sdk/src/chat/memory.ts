/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { BufferWindowMemory, BufferWindowMemoryInput, getInputValue, BaseMemory } from 'langchain/memory';
import { DDBChatMessage, DDBMessageSource } from './dynamodb/lib/index.js';
import { CreateAIChatMessageResponse, CreateHumanChatMessageResponse } from './dynamodb/lib/messages.js';
import { DynamoDBChatMessageHistory } from './dynamodb/message-history.js';

export interface MemoryContext {
  readonly input: DDBChatMessage;
  readonly output: DDBChatMessage;
}

type SaveContext = Parameters<BaseMemory['saveContext']>;
type InputValues = SaveContext[0];
type OutputValues = SaveContext[0];

const getValue = (values: InputValues | OutputValues, key?: string) => {
  if (key !== undefined) {
    return values[key];
  }
  const keys = Object.keys(values);
  if (keys.length === 1) {
    return values[keys[0]];
  }
};

/**
 * This function is used by memory classes to select the output value
 * to use for the memory. If there is only one output value, it is used.
 * If there are multiple output values, the outputKey must be specified.
 * If no outputKey is specified, an error is thrown.
 */
export const getOutputValue = (outputValues: OutputValues, outputKey?: string) => {
  const value = getValue(outputValues, outputKey);
  if (!value) {
    const keys = Object.keys(outputValues);
    throw new Error(
      `output values have ${keys.length} keys, you must specify an output key or pass only 1 key as output`,
    );
  }
  return value;
};

export interface ChatTurn {
  readonly human: DDBChatMessage;
  readonly ai: DDBChatMessage;
  readonly sources: DDBMessageSource[];
}

export class ChatEngineHistory extends BufferWindowMemory {
  chatHistory: DynamoDBChatMessageHistory;

  protected _turns: ChatTurn[] = [];

  get lastTurn(): ChatTurn {
    return this._turns.slice(-1)[0];
  }

  constructor(fields: BufferWindowMemoryInput & { chatHistory: DynamoDBChatMessageHistory }) {
    super({
      k: 10,
      returnMessages: true,
      memoryKey: 'chat_history',
      ...fields,
    });

    this.chatHistory = fields.chatHistory;
  }

  async saveContext(inputValues: InputValues, outputValues: OutputValues): Promise<void> {
    const human: CreateHumanChatMessageResponse = await this.chatHistory.addUserMessage(getInputValue(inputValues));
    const ai: CreateAIChatMessageResponse = await this.chatHistory.addAIChatMessage(
      getOutputValue(outputValues, 'text'),
      outputValues.sourceDocuments || [],
    );

    this._turns.push({
      human: human.chatMessage,
      ai: ai.chatMessage,
      sources: ai.sources,
    });
  }
}
