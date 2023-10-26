/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { Command } from "@oclif/core";
import chalk from "chalk";
import prompts from "prompts";
import accountUtils from "../../../lib/account-utils";
import context from "../../../lib/context";
import galileoPrompts from "../../../lib/prompts";
import { cognitoCreateUserCommandFlags } from "../flags";

export default class CognitoCreateUserCommand extends Command {
  static description = "Create a Cognito user";
  static examples = [
    "galileo-cli cognito create-user --profile=myProfile --region=ap-southeast-1",
    "galileo-cli cognito create-user --email=myUser@example.com --username=myUser",
    "galileo-cli cognito create-user --skipConfirmations --profile=myProfile --region=ap-southeast-1 --email=admin@example.com --username=admin --group=Administrators",
  ];

  static flags = cognitoCreateUserCommandFlags;

  private onPromptCancel() {
    this.exit();
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(CognitoCreateUserCommand);

    let { profile, region, email, username, group } = flags;
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
        [
          galileoPrompts.email({ initialVal: flags.email }),
          galileoPrompts.username({ initialVal: flags.username }),
          galileoPrompts.group({ initialVal: flags.group }),
        ],
        { onCancel: this.onPromptCancel }
      );

      profile = answersAccount.profile!;
      region = answersAccount.region!;
      email = answersUser.email!;
      username = answersUser.username!;
      group = answersUser.group!;
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

    await accountUtils.createCognitoUser({
      profile: profile!,
      region: region!,
      email: email!,
      username: username!,
      userPoolId,
      group,
    });
  }
}
