/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { Command } from '@oclif/core';
import chalk from 'chalk';
import prompts from 'prompts';
import accountUtils from '../../../lib/account-utils';
import context from '../../../lib/context';
import galileoPrompts from '../../../lib/prompts';
import { cognitoCreateUserCommandFlags } from '../flags';

export default class CognitoCreateUserCommand extends Command {
  static description = 'Create a Cognito user';
  static examples = [
    'galileo-cli cognito create-user --profile=myProfile --region=ap-southeast-1',
    'galileo-cli cognito create-user --email=myUser@example.com --username=myUser',
    'galileo-cli cognito create-user --skipConfirmations --profile=myProfile --region=ap-southeast-1 --email=admin@example.com --username=admin --group=Administrators',
  ];

  static flags = cognitoCreateUserCommandFlags;

  private onPromptCancel() {
    this.exit();
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(CognitoCreateUserCommand);

    let { profile, region, email, username, group, userpoolId } = flags;
    if (!flags.skipConfirmations) {
      const answersAccount = context.cachedAnswers(
        await prompts(
          [
            galileoPrompts.profile(flags.profile),
            galileoPrompts.awsRegion({
              initialVal: flags.region,
            }),
          ],
          { onCancel: this.onPromptCancel },
        ),
      );
      profile = answersAccount.profile!;
      region = answersAccount.region!;

      context.ui.newSpinner().start('Loading userpools');
      const userPools = await accountUtils.listCognitoUserPools({ profile: profile!, region });
      context.ui.spinner.succeed();

      if (userPools == null) {
        this.log(
          chalk.magentaBright(
            `No userpool deployed in region ${region}. First you need to deploy the app. Quitting...`,
          ),
        );
        this.exit();
      }

      const { userPoolId: _userpoolId } = context.cachedAnswers(
        await prompts(galileoPrompts.userPoolPicker(userPools)),
      );
      userpoolId = _userpoolId as string;

      const answersUser = await prompts(
        [galileoPrompts.email({ initialVal: flags.email }), galileoPrompts.username({ initialVal: flags.username })],
        { onCancel: this.onPromptCancel },
      );

      email = answersUser.email!;
      username = answersUser.username!;

      context.ui.newSpinner().start('Loading user groups');
      const userGroups = await accountUtils.listCognitoUserGroups({
        profile: profile!,
        region,
        userpoolId: userpoolId!,
      });
      context.ui.spinner.succeed();

      const { group: _group } = await prompts(
        galileoPrompts.userGroupPicker({ initialVal: flags.group, groups: userGroups }),
        { onCancel: this.onPromptCancel },
      );
      group = _group as string;
    }

    context.ui.newSpinner().start('Creating cognito user');
    await accountUtils.createCognitoUser({
      profile: profile!,
      region: region!,
      email: email!,
      username: username!,
      userpoolId: userpoolId!,
      group,
    });
    context.ui.spinner.succeed();
  }
}
