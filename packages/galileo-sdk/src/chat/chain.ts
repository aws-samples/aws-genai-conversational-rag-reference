/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { BaseLanguageModel } from 'langchain/base_language';
import { CallbackManagerForChainRun } from 'langchain/callbacks';
import { BaseChain, ChainInputs, LLMChain, loadQAChain, QAChainParams, StuffDocumentsChain } from 'langchain/chains';
import { PromptTemplate } from 'langchain/prompts';
// import { SerializedChatVectorDBQAChain } from "./serde.js";
import { ChainValues } from 'langchain/schema';
import { BaseRetriever } from 'langchain/schema/retriever';
import { getLogger } from '../common/index.js';
import { startPerfMetric } from '../common/metrics/index.js';
import { PojoOutputParser } from '../langchain/output_parsers/pojo.js';

const logger = getLogger('chat/chain');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LoadValues = Record<string, any>;

export interface ChatEngineChainInput extends ChainInputs {
  retriever: BaseRetriever;
  /**
   * Classify chain for adaptive chain (classification, category, language, etc.)
   * which outputs JSON config proved to following chain inputs
   */
  classifyChain: false | LLMChain;
  /**
   * Primary Question/Answer chain that provides the final answer generation to the user.
   */
  qaChain: BaseChain;
  /**
   * Followup question generator chain which condenses followup question based on chat history
   * into a standalone question which is provided to the QA chain.
   */
  condenseQuestionChain: LLMChain;
  returnSourceDocuments?: boolean;
  inputKey?: string;
}

export type ChatEngineChainFromInput = {
  returnSourceDocuments?: boolean;
  retriever: BaseRetriever;
  classifyChain:
    | false
    | {
        llm: BaseLanguageModel;
        prompt: PromptTemplate;
        /** Key to use for output, default to "classification" */
        outputKey?: string;
      };
  condenseQuestionChain: {
    llm: BaseLanguageModel;
    prompt: PromptTemplate;
  };
  qaChain: {
    // TODO: support other combine document types, we need to implement templates + adapters?
    type: 'stuff';
    llm: BaseLanguageModel;
    prompt: PromptTemplate;
  };
} & Omit<
  ChatEngineChainInput,
  'retriever' | 'combineDocumentsChain' | 'qaChain' | 'classifyChain' | 'condenseQuestionChain'
>;

export class ChatEngineChain extends BaseChain implements ChatEngineChainInput {
  static lc_name() {
    return 'ChatEngineChain';
  }

  /**
   * Static method to create a new ChatEngineChain from a
   * BaseLanguageModel and a BaseRetriever.
   * @param retriever {@link BaseRetriever} instance used to retrieve relevant documents.
   * @param options.returnSourceDocuments Whether to return source documents in the final output
   * @param options.condenseQuestionChain Options to initialize the standalone question generation chain used as the first internal step
   * @param options.qaChain {@link QAChainParams} used to initialize the QA chain used as the second internal step
   * @returns A new instance of ChatEngineChain.
   */
  static from(options: ChatEngineChainFromInput): ChatEngineChain {
    const {
      qaChain: qaChainOptions,
      classifyChain: classifyOptions,
      condenseQuestionChain: condenseQuestionChainOptions,
      verbose,
      ...rest
    } = options;

    const qaChain = loadQAChain(qaChainOptions.llm, {
      verbose,
      ...qaChainOptions,
    });

    const classifyChain =
      classifyOptions &&
      new LLMChain({
        verbose,
        ...classifyOptions,
        outputKey: 'classification',
        // classify chain must return parsable JSON
        outputParser: new PojoOutputParser<any>(),
      });

    const condenseQuestionChain = new LLMChain({
      verbose,
      ...condenseQuestionChainOptions,
    });

    const instance = new this({
      classifyChain,
      qaChain,
      condenseQuestionChain,
      verbose,
      ...rest,
    });
    return instance;
  }

  inputKey = 'question';

  classificationKey = 'classification';

  chatHistoryKey = 'chat_history';

  get inputKeys() {
    return [this.inputKey, this.chatHistoryKey];
  }

  get outputKeys() {
    return this.qaChain.outputKeys.concat(this.returnSourceDocuments ? ['sourceDocuments'] : []);
  }

  get traceData(): any {
    return this._traceData;
  }

  retriever: BaseRetriever;

  classifyChain: false | LLMChain;

  qaChain: BaseChain;

  condenseQuestionChain: LLMChain;

  returnSourceDocuments = false;

  protected _traceData?: any;

  constructor(fields: ChatEngineChainInput) {
    super(fields);
    this.retriever = fields.retriever;
    this.classifyChain = fields.classifyChain;
    this.qaChain = fields.qaChain;
    this.condenseQuestionChain = fields.condenseQuestionChain;
    this.inputKey = fields.inputKey ?? this.inputKey;
    this.returnSourceDocuments = fields.returnSourceDocuments ?? this.returnSourceDocuments;
  }

  /** @ignore */
  async _call(values: ChainValues, runManager?: CallbackManagerForChainRun): Promise<ChainValues> {
    if (!(this.inputKey in values)) {
      throw new Error(`Question key ${this.inputKey} not found.`);
    }
    if (!(this.chatHistoryKey in values)) {
      throw new Error(`Chat history key ${this.chatHistoryKey} not found.`);
    }
    const question: string = values[this.inputKey];
    const chatHistory = values[this.chatHistoryKey] || [];

    let classification: ChainValues | undefined;
    if (this.classifyChain) {
      logger.debug('Calling classify chain: ', { question });
      const $$ClassifyChainExecutionTime = startPerfMetric('ClassifyChainExecutionTime');
      classification = (await this.classifyChain.call({ question }))[this.classificationKey];
      $$ClassifyChainExecutionTime();
      logger.debug('Result from classify chain: ', { classification });
    }

    let newQuestion = classification?.question || question;
    const hasHistory = chatHistory.length > 0;
    if (hasHistory) {
      const condenseQuestionInput: ChainValues = {
        question: newQuestion,
        ...classification,
        chat_history: chatHistory,
      };
      logger.debug('Chain:condenseQuestionChain:input', { input: condenseQuestionInput });
      const $$QuestionGeneratorExecutionTime = startPerfMetric('QuestionGeneratorExecutionTime');
      const result = await this.condenseQuestionChain.call(
        condenseQuestionInput,
        runManager?.getChild('question_generator'),
      );
      $$QuestionGeneratorExecutionTime();
      logger.debug('Chain:condenseQuestionChain:output', { output: result });

      const keys = Object.keys(result);
      if (keys.length === 1) {
        newQuestion = result[keys[0]];
        logger.debug(`Rewrote question from "${question}" to "${newQuestion}`);
      } else {
        throw new Error('Return from llm chain has multiple values, only single values supported.');
      }
    }
    logger.debug('Chain:retriever:getRelevantDocuments:query', { query: newQuestion });
    const $$GetRelevantDocumentsExecutionTime = startPerfMetric('GetRelevantDocumentsExecutionTime');
    const docs = await this.retriever.getRelevantDocuments(newQuestion, runManager?.getChild('retriever'));
    $$GetRelevantDocumentsExecutionTime();

    const inputs = {
      ...classification,
      input_documents: docs,
      chat_history: chatHistory,
      question: newQuestion,
    };

    logger.debug('Chain:condenseQuestionChain:input', { input: inputs });
    const $$CombineDocumentsExecutionTime = startPerfMetric('CombineDocumentsExecutionTime');
    const result = await this.qaChain.call(inputs, runManager?.getChild('combine_documents'));
    $$CombineDocumentsExecutionTime();
    logger.debug('Chain:condenseQuestionChain:output', { output: result });

    this._traceData = {
      originalQuestion: question,
      standaloneQuestion: newQuestion,
      classification,
      hasHistory,
      chainValues: values,
      chatHistory,
      sourceDocuments: docs,
      inputs,
      result,
      chains: {
        qaChain: this.qaChain instanceof StuffDocumentsChain ? this.qaChain.llmChain.toJSON() : this.qaChain.toJSON(),
        condenseQuestionChain: this.condenseQuestionChain.toJSON(),
        classifyChain: this.classifyChain && this.classifyChain.toJSON(),
      },
    };

    logger.debug('Trace data', { traceData: this.traceData });

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
