/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { AuthenticationResultType } from '@aws-sdk/client-cognito-identity-provider';
import { Command } from '@oclif/core';
import chalk from 'chalk';
import prompts from 'prompts';
import accountUtils from '../../../lib/account-utils';
import context from '../../../lib/context';
import galileoPrompts from '../../../lib/prompts';

export default class CognitoAuthCommand extends Command {
  static description = 'Authenticate with Cognito';
  static examples = ['galileo-cli cognito auth'];

  private onPromptCancel() {
    this.exit();
  }

  async run(options?: { logIdToken?: boolean }): Promise<AuthenticationResultType | undefined> {
    const { profile, region } = await prompts([galileoPrompts.profile(), galileoPrompts.awsRegion({})], {
      onCancel: this.onPromptCancel,
    });

    context.ui.newSpinner().start('Loading userpools');
    const userPools = await accountUtils.listCognitoUserPools({ profile: profile!, region });
    context.ui.spinner.succeed();

    if (userPools == null) {
      this.log(
        chalk.magentaBright(`No userpool deployed in region ${region}. First you need to deploy the app. Quitting...`),
      );
      this.exit();
    }

    const { userPoolId } = await prompts(galileoPrompts.userPoolPicker(userPools));

    const { username, password } = await prompts([galileoPrompts.username(), galileoPrompts.password()], {
      onCancel: this.onPromptCancel,
    });

    context.ui.newSpinner().start('Initiating login...');
    const challenge = await accountUtils.authCognitoUser({
      profile: profile!,
      region: region!,
      username,
      password,
      userpoolId: userPoolId,
    });
    context.ui.spinner.succeed();

    let authenticationResult;
    if (challenge.challengeName === 'SOFTWARE_TOKEN_MFA') {
      const { responseValue } = await prompts(
        [
          galileoPrompts.username({
            name: 'responseValue',
            message: 'Enter OTP:',
          }),
        ],
        {
          onCancel: this.onPromptCancel,
        },
      );

      context.ui.newSpinner().start('Sending OTP...');
      authenticationResult = await accountUtils.respondCognitoChallenge({
        ...challenge,
        responseValue,
      });
      context.ui.spinner.succeed();
      if (options?.logIdToken !== false) this.log(`Tokens acquired. Id Token:`, authenticationResult?.IdToken);
      return authenticationResult;
    } else {
      this.log(`${challenge.challengeName} challange not supported. Quitting...`);
      this.exit();
    }
  }
}
