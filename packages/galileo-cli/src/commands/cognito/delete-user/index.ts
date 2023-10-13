/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { Command } from "@oclif/core";
import chalk from "chalk";
import prompts from "prompts";
import accountUtils from "../../../lib/account-utils";
import context from "../../../lib/context";
import galileoPrompts from "../../../lib/prompts";
import { cognitoDeleteUserCommandFlags } from "../flags";

export default class CognitoDeleteUserCommand extends Command {
  static description: "Delete a Cognito user";
  static examples = [
    "galileo-cli cognito delete-user",
    "galileo-cli cognito delete-user --skipConfirmations --profile myProfile --region ap-southeast-1 --username myUserName",
  ];

  static flags = cognitoDeleteUserCommandFlags;

  private onPromptCancel() {
    this.exit();
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(CognitoDeleteUserCommand);

    let { profile, region, username } = flags;
    if (!flags.skipConfirmations) {
      const answersAccount = context.cachedAnswers(
        await prompts(
          [
            galileoPrompts.profile(flags.profile),
            galileoPrompts.awsRegion({
              initialVal: flags.region,
            }),
          ],
          { onCancel: this.onPromptCancel }
        )
      );
      const answersUser = await prompts(
        galileoPrompts.username({ initialVal: flags.username }),
        { onCancel: this.onPromptCancel }
      );

      profile = answersAccount.profile!;
      region = answersAccount.region!;
      username = answersUser.username!;
    }

    const userPools = await accountUtils.listCognitoUserPools(
      profile!,
      region!
    );

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

    await accountUtils.deleteCognitoUser({
      profile: profile!,
      region: region!,
      username: username!,
      userPoolId,
    });
  }
}
