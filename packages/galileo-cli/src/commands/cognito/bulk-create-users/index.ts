/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { Command } from "@oclif/core";
import chalk from "chalk";
import prompts from "prompts";
import accountUtils from "../../../lib/account-utils";
import context from "../../../lib/context";
import galileoPrompts from "../../../lib/prompts";
import { cognitoBulkCreateUsersCommandFlags } from "../flags";

export default class CognitoBulkCreateUsersCommand extends Command {
  static summary: "Bulk create Cognito users from CSV file";
  static description: `Bulk create Cognito users from CSV file

Make sure that the CSV file has the following columns: "username,email,group"
	`;
  static examples = [
    "galileo-cli-experimental cognito bulk-create-users --profile=myProfile --region=ap-southeast-1 --csvFile /path/to/users.csv",
  ];

  static flags = cognitoBulkCreateUsersCommandFlags;

  private onPromptCancel() {
    this.exit();
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(CognitoBulkCreateUsersCommand);

    const { profile, region, filePath, userGroup } = context.cachedAnswers(
      await prompts(
        [
          galileoPrompts.profile(flags.profile),
          galileoPrompts.awsRegion({
            initialVal: flags.region,
          }),
          galileoPrompts.userGroup({ initialVal: flags.group }),
          galileoPrompts.filePathPrompt({
            initialVal: flags.csvFile,
            what: "users CSV file",
          }),
        ],
        { onCancel: this.onPromptCancel }
      )
    );

    const userPools = await accountUtils.listCognitoUserPools(profile, region);

    if (userPools == null) {
      this.log(
        chalk.magentaBright(
          `No userpool deployed in region ${region}. First you need to deploy the app. Quitting...`
        )
      );
      this.exit();
    }

    const { userPoolId } = context.cachedAnswers(
      await prompts(galileoPrompts.userPoolPicker(userPools))
    );

    await accountUtils.bulkCreateCognitoUsers({
      profile,
      region,
      csvFile: filePath,
      userPoolId,
      group: userGroup,
    });
  }
}
