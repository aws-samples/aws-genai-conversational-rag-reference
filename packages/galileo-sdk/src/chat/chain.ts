/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { BaseLanguageModel } from 'langchain/base_language';
import { CallbackManagerForChainRun } from 'langchain/callbacks';
import { BaseChain, ChainInputs, LLMChain, loadQAChain, QAChainParams } from 'langchain/chains';
import { PromptTemplate } from 'langchain/prompts';
// import { SerializedChatVectorDBQAChain } from "./serde.js";
import {
  ChainValues,
} from 'langchain/schema';
import { BaseRetriever } from 'langchain/schema/retriever';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LoadValues = Record<string, any>;

export interface ChatEngineChainInput extends ChainInputs {
  retriever: BaseRetriever;
  combineDocumentsChain: BaseChain;
  questionGeneratorChain: LLMChain;
  returnSourceDocuments?: boolean;
  inputKey?: string;
}

export class ChatEngineChain extends BaseChain implements ChatEngineChainInput {
  static lc_name() {
    return 'ChatEngineChain';
  }

  /**
   * Static method to create a new ChatEngineChain from a
   * BaseLanguageModel and a BaseRetriever.
   * @param llm {@link BaseLanguageModel} instance used to generate a new question.
   * @param retriever {@link BaseRetriever} instance used to retrieve relevant documents.
   * @param options.returnSourceDocuments Whether to return source documents in the final output
   * @param options.questionGeneratorChainOptions Options to initialize the standalone question generation chain used as the first internal step
   * @param options.qaChainOptions {@link QAChainParams} used to initialize the QA chain used as the second internal step
   * @returns A new instance of ChatEngineChain.
   */
  static fromLLM(
    llm: BaseLanguageModel,
    retriever: BaseRetriever,
    options: {
      returnSourceDocuments?: boolean;
      questionGenerator: {
        llm?: BaseLanguageModel;
        prompt: PromptTemplate;
      };
      qaChainOptions: QAChainParams;
    } & Omit<
    ChatEngineChainInput,
    'retriever' | 'combineDocumentsChain' | 'questionGeneratorChain'
    >,
  ): ChatEngineChain {
    const {
      qaChainOptions,
      questionGenerator,
      verbose,
      ...rest
    } = options;

    const qaChain = loadQAChain(llm, qaChainOptions);

    const questionGeneratorChain = new LLMChain({
      prompt: questionGenerator.prompt,
      llm: questionGenerator.llm ?? llm,
      verbose,
    });

    const instance = new this({
      retriever,
      combineDocumentsChain: qaChain,
      questionGeneratorChain,
      verbose,
      ...rest,
    });
    return instance;
  }

  inputKey = 'question';

  chatHistoryKey = 'chat_history';

  get inputKeys() {
    return [this.inputKey, this.chatHistoryKey];
  }

  get outputKeys() {
    return this.combineDocumentsChain.outputKeys.concat(
      this.returnSourceDocuments ? ['sourceDocuments'] : [],
    );
  }

  retriever: BaseRetriever;

  combineDocumentsChain: BaseChain;

  questionGeneratorChain: LLMChain;

  returnSourceDocuments = false;

  constructor(fields: ChatEngineChainInput) {
    super(fields);
    this.retriever = fields.retriever;
    this.combineDocumentsChain = fields.combineDocumentsChain;
    this.questionGeneratorChain = fields.questionGeneratorChain;
    this.inputKey = fields.inputKey ?? this.inputKey;
    this.returnSourceDocuments =
      fields.returnSourceDocuments ?? this.returnSourceDocuments;
  }

  /** @ignore */
  async _call(
    values: ChainValues,
    runManager?: CallbackManagerForChainRun,
  ): Promise<ChainValues> {
    if (!(this.inputKey in values)) {
      throw new Error(`Question key ${this.inputKey} not found.`);
    }
    if (!(this.chatHistoryKey in values)) {
      throw new Error(`Chat history key ${this.chatHistoryKey} not found.`);
    }
    const question: string = values[this.inputKey];
    const chatHistory = values[this.chatHistoryKey];

    let newQuestion = question;
    if (chatHistory.length > 0) {
      const result = await this.questionGeneratorChain.call(
        {
          question,
          chat_history: chatHistory,
        },
        runManager?.getChild('question_generator'),
      );
      const keys = Object.keys(result);
      if (keys.length === 1) {
        newQuestion = result[keys[0]];
      } else {
        throw new Error(
          'Return from llm chain has multiple values, only single values supported.',
        );
      }
    }
    const docs = await this.retriever.getRelevantDocuments(
      newQuestion,
      runManager?.getChild('retriever'),
    );
    const inputs = {
      question: newQuestion,
      input_documents: docs,
      chat_history: chatHistory,
    };
    const result = await this.combineDocumentsChain.call(
      inputs,
      runManager?.getChild('combine_documents'),
    );
    if (this.returnSourceDocuments) {
      return {
        ...result,
        sourceDocuments: docs,
      };
    }
    return result;
  }

  _chainType(): string {
    return 'conversational_retrieval_chain';
  }

  // static async deserialize(
  //   _data: SerializedChatVectorDBQAChain,
  //   _values: LoadValues
  // ): Promise<ChatEngineChain> {
  //   throw new Error("Not implemented.");
  // }

  // serialize(): SerializedChatVectorDBQAChain {
  //   throw new Error("Not implemented.");
  // }
}
