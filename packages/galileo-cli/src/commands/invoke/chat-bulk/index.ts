/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { AuthenticationResultType } from '@aws-sdk/client-cognito-identity-provider';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { Command } from '@oclif/core';
import * as async from 'async';
import chalk from 'chalk';
import fs from 'fs-extra';
import { isEmpty, set, meanBy, sumBy } from 'lodash';
import prompts from 'prompts';
import { helpers } from '../../../internals';
import { createSignedFetcher } from '../../../lib/account-utils/signed-fetch';
import context from '../../../lib/context';
import galileoPrompts from '../../../lib/prompts';
import CognitoAuthCommand from '../../cognito/auth';

/** Number of minutes before cognito token expiration to consider expired, to ensure enough time to execute operations */
const TOKEN_BUFFER = 300 * 60; // 5 minutes

/** RegEx to extract parts of lambda function url */
const LAMBDA_URL_PATTERN = /^https:\/\/(?<id>[^.]+)\.lambda-url\.(?<region>[^.]+)\.on\.aws/;

export default class InvokeChatBulkCommand extends Command {
  static description = 'Invoke the chat engine lambda with bulk prompts based on settings json';
  static examples = ['galileo-cli invoke chat-bulk'];

  async run(): Promise<void> {
    let cognitoAuth = context.fromCache<AuthenticationResultType & { ExpiresAt?: number }>('cognitoAuth');
    if (cognitoAuth == null || cognitoAuth.ExpiresAt == null || cognitoAuth.ExpiresAt < Date.now() - TOKEN_BUFFER) {
      const cognitoAuthCommand = new CognitoAuthCommand([], this.config);
      cognitoAuth = await cognitoAuthCommand.run({ logIdToken: false });
      context.toCache('cognitoAuth', {
        ...cognitoAuth,
        ExpiresAt: Date.now() + (cognitoAuth?.ExpiresIn || 0) * 1000,
      });
    }

    const lambdaUrl = await galileoPrompts.inferenceEngineLambdaUrl();
    const chatId = await galileoPrompts.chatId();
    const settingsFile = await galileoPrompts.chatEngineSettingsFile();
    const settings = settingsFile && !isEmpty(settingsFile) ? await fs.readJSON(settingsFile) : {};
    // ensure that settings
    set(settings, 'memory.limit', -1);

    const { inputDataFile } = await prompts({
      type: 'text',
      name: 'inputDataFile',
      message: helpers.textPromptMessage('Question data json file?', {
        instructions: 'Must be a JSON file that is an array of strings, that will be the questions asked',
      }),
      initial: context.fromCache('invokeChatBulkInputDataFile'),
    });
    context.toCache('invokeChatBulkInputDataFile', inputDataFile);
    const bulkInvokeBatchSize = await galileoPrompts.bulkInvokeBatchSize();
    const questions = await this.parseInputDataFile(inputDataFile);

    const { region } = LAMBDA_URL_PATTERN.exec(lambdaUrl)?.groups || {};

    const bulkExecStart = Date.now();
    const answers = await this.invokeQuestionsParallel(
      lambdaUrl,
      region,
      chatId,
      cognitoAuth?.IdToken!,
      settings,
      bulkInvokeBatchSize,
      questions,
    );
    // overall execution time
    const execTime = ((Date.now() - bulkExecStart) / 1000).toFixed(2);

    // average execution time
    const avargeExecTime = meanBy(answers, (a) => {
      return a.stats.execTimeInSeconds;
    });
    const numberOfCallsFailed = sumBy(answers, (a) => {
      return a.stats.retryCount;
    });

    this.log(chalk.yellowBright('Stats:'));
    this.log(`Number of questions: ${questions.length}`);
    this.log(`Batch size: ${bulkInvokeBatchSize}`);
    this.log(`Execution time: ${execTime} seconds`);
    this.log(`Average QA time: ${avargeExecTime}`);
    this.log(`Number of calls failed: ${numberOfCallsFailed}`);
    this.log(`Average fail per question: ${numberOfCallsFailed / questions.length}`);

    const { outputFile } = await prompts({
      type: 'text',
      name: 'outputFile',
      message: helpers.textPromptMessage('Save results to file?', {
        instructions: 'Caution: will overwrite existing files',
      }),
      initial: context.fromCache('invokeChatBulkOutputFile'),
    });
    context.toCache('invokeChatBulkOutputFile', outputFile);

    if (outputFile && !isEmpty(outputFile)) {
      await fs.writeJson(outputFile, answers, { spaces: 2 });
    }
  }

  async parseInputDataFile(file: string): Promise<string[]> {
    const data = await fs.readJSON(file);
    if (Array.isArray(data) && data.every((v) => typeof v === 'string')) {
      return data;
    }

    throw new Error('Input data file is invalid, must be an array of strings');
  }

  async invokeQuestionsParallel(
    lambdaUrl: string,
    region: string,
    chatId: string,
    idToken: string,
    settings: any,
    batchSize: number,
    questions: string[],
  ) {
    const fetcher = createSignedFetcher({
      service: 'lambda',
      region,
      credentials: fromNodeProviderChain(),
    });

    const answers: {
      question: string;
      answer: string;
      classification: any;
      stats: { execTimeInSeconds: number; retryCount: number };
    }[] = [];
    this.log(`Invoking chat for ${questions.length} questions with batchSize ${batchSize}`);

    const maxRetries = 5;

    const createTaskWithRetryCount = async (options: { q: string; idx: number }) => {
      let retryCount = 0;
      const { q } = options;
      const idx = options.idx + 1;
      let success = false;

      while (retryCount < maxRetries) {
        try {
          this.log(chalk.bold(`> Question ${idx}/${questions.length}: ${chalk.cyanBright(q)}`));
          // Lambda FunctionURL does not support `pathParameters` so we need to use queryParameters

          const start = Date.now();
          const response = await fetcher(`${lambdaUrl}/chat/${chatId}/message?chatId=${chatId}`, {
            headers: {
              'X-Cognito-IdToken': idToken,
            },
            body: JSON.stringify({
              question: q,
              options: settings,
            }),
            method: 'PUT',
          });

          if (response.ok) {
            const result = await response.json();
            const answer = result.answer.text;
            const finish = Date.now();
            const taskResult = {
              answer: {
                question: q,
                answer,
                classification: result.traceData.classification,
                stats: {
                  execTimeInSeconds: (finish - start) / 1000,
                  retryCount,
                },
              },
              idx,
            };

            answers.push(taskResult!.answer);
            this.log(
              chalk.bold(
                `> Question ${taskResult!.idx}/${questions.length}: ${chalk.greenBright('OK')} ${chalk.grey(
                  `retry ${retryCount}`,
                )}`,
              ),
            );

            success = true;
          } else {
            this.log(
              `> Question ${idx}/${questions.length}: ${chalk.redBright(
                `${response.status} - ${response.statusText}`,
              )} - ${chalk.gray(`retry ${retryCount}`)}`,
            );
            success = false;
          }
        } catch (err: any) {
          this.log(`Question ${idx}/${questions.length}: Error -- ${err.message}`);
          success = false;
        } finally {
          if (success) break;

          retryCount++;

          const waitMs = mixedExponentialBackMs(retryCount);
          this.log(`> Question ${idx}/${questions.length}: waiting ${waitMs} ms`);
          await wait(waitMs);
        }
      }

      if (!success) {
        throw new Error(`Task errored after ${retryCount} for question ${idx}/${questions.length}`);
      }
    };

    const iteratorTask: async.AsyncBooleanIterator<{ q: string; idx: number }> = async (options) => {
      return createTaskWithRetryCount(options);
    };

    const qWithIdx = questions.map((value, idx) => ({ q: value, idx: idx }));
    await async.eachLimit(qWithIdx, batchSize, iteratorTask.bind(this));

    return answers;
  }
}

const mixedExponentialBackMs = (retryCount: number): number => {
  return Math.random() * 3000 + 250 * Math.pow(2, retryCount);
};
const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
