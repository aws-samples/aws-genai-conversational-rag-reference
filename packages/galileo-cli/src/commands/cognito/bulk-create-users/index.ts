/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { Command } from '@oclif/core';
import chalk from 'chalk';
import prompts from 'prompts';
import accountUtils from '../../../lib/account-utils';
import context from '../../../lib/context';
import galileoPrompts from '../../../lib/prompts';
import { cognitoBulkCreateUsersCommandFlags } from '../flags';

export default class CognitoBulkCreateUsersCommand extends Command {
  static summary = 'Bulk create Cognito users from CSV file';
  static description = `Bulk create Cognito users from CSV file

Make sure that the CSV file has the following columns: "username,email,group"
	`;
  static examples = [
    'galileo-cli cognito bulk-create-users --profile=myProfile --region=ap-southeast-1 --csvFile /path/to/users.csv',
  ];

  static flags = cognitoBulkCreateUsersCommandFlags;

  private onPromptCancel() {
    this.exit();
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(CognitoBulkCreateUsersCommand);

    const { profile, region } = context.cachedAnswers(
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

    context.ui.newSpinner().start('Loading userpools');
    const userPools = await accountUtils.listCognitoUserPools({ profile, region });
    context.ui.spinner.succeed();

    if (userPools == null) {
      this.log(
        chalk.magentaBright(`No userpool deployed in region ${region}. First you need to deploy the app. Quitting...`),
      );
      this.exit();
    }

    const userPoolId = await galileoPrompts.userPoolPicker(userPools);

    context.ui.newSpinner().start('Loading user groups');
    const userGroups = await accountUtils.listCognitoUserGroups({ profile, region, userpoolId: userPoolId });
    context.ui.spinner.succeed();

    const { filePath, group } = await prompts(
      [
        galileoPrompts.userGroupPicker({
          message: 'User group (for all new users):',
          initialVal: flags.group,
          groups: userGroups,
        }),
        galileoPrompts.filePathPrompt({
          initialVal: flags.csvFile,
          what: 'users CSV file',
        }),
      ],
      { onCancel: this.onPromptCancel },
    );

    context.ui.newSpinner().start('Creating cognito users');
    await accountUtils.bulkCreateCognitoUsers({
      profile,
      region,
      csvFile: filePath,
      userPoolId,
      group,
    });
    context.ui.spinner.succeed();
  }
}
