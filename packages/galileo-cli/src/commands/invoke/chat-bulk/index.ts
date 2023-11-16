/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { AuthenticationResultType } from '@aws-sdk/client-cognito-identity-provider';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { Command } from '@oclif/core';
import chalk from 'chalk';
import fs from 'fs-extra';
import { isEmpty, set } from 'lodash';
import prompts from 'prompts';
import { helpers } from '../../../internals';
import { createSignedFetcher } from '../../../lib/account-utils/signed-fetch';
import context from '../../../lib/context';
import galileoPrompts from '../../../lib/prompts';
import CognitoAuthCommand from '../../cognito/auth';

const TOKEN_BUFFER = 300 * 60 * 1000; // 5 minutes

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
    const questions = await this.parseInputDataFile(inputDataFile);

    const { region } = LAMBDA_URL_PATTERN.exec(lambdaUrl)?.groups || {};

    const fetcher = createSignedFetcher({
      service: 'lambda',
      region,
      credentials: fromNodeProviderChain(),
    });

    const answers: { question: string; answer: string }[] = [];
    this.log(`Invoking chat for ${questions.length} questions`);
    for (const question of questions) {
      this.log(chalk.bold('> Question: ') + chalk.cyanBright(question));
      context.ui.newSpinner().start('Waiting for response...');

      // Lambda FunctionURL does not support `pathParameters` so we need to use queryParameters
      const response = await fetcher(`${lambdaUrl}/chat/${chatId}/message?chatId=${chatId}`, {
        headers: {
          'X-Cognito-IdToken': cognitoAuth?.IdToken!,
        },
        body: JSON.stringify({
          question,
          options: settings,
        }),
        method: 'PUT',
      });

      if (response.ok) {
        const result = await response.json();
        const answer = result.answer.text;
        context.ui.spinner.succeed(chalk.greenBright(answer));
        answers.push({ question, answer });
      } else {
        this.error(`${response.status} - ${response.statusText}`);
      }
    }

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
}
