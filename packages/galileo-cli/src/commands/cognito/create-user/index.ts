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
  static description: "Create a Cognito user";
  static examples = [
    "galileo-cli-experimental cognito create-user --profile=myProfile --region=ap-southeast-1",
    "galileo-cli-experimental cognito create-user --email=myUser@example.com --username=myUser",
    "galileo-cli-experimental cognito create-user --skipConfirmations --profile=myProfile --region=ap-southeast-1 --email=admin@example.com --username=admin --group=Administrators",
  ];

  static flags = cognitoCreateUserCommandFlags;

  private onPromptCancel() {
    this.exit();
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(CognitoCreateUserCommand);

    let { profile, region, email, username, group: userGroup } = flags;
    if (!flags.skipConfirmations) {
      const answers = context.cachedAnswers(
        await prompts(
          [
            galileoPrompts.profile(flags.profile),
            galileoPrompts.awsRegion({
              initialVal: flags.region,
            }),
            galileoPrompts.userEmail({ initialVal: flags.email }),
            galileoPrompts.username({ initialVal: flags.username }),
            galileoPrompts.userGroup({ initialVal: flags.group }),
          ],
          { onCancel: this.onPromptCancel }
        )
      );
      profile = answers.profile!;
      region = answers.region!;
      email = answers.email!;
      username = answers.username!;
      userGroup = answers.userGroup!;
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
      userGroup,
    });
  }
}
