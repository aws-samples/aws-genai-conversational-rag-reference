/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { Flags } from "@oclif/core";
import { FlagInput } from "@oclif/core/lib/interfaces/parser";

export interface BaseCognitoCommandFlags {
  profile?: string;
  region?: string;
  skipConfirmations?: boolean;
}

export interface CognitoCreateUserCommandFlags extends BaseCognitoCommandFlags {
  email?: string;
  username?: string;
  group?: string;

  skipConfirmations?: boolean;
}

export interface CognitoBulkCreateUsersCommandFlags
  extends BaseCognitoCommandFlags {
  group?: string;
  csvFile?: string;
}

export interface CognitoDeleteUserCommandFlags extends BaseCognitoCommandFlags {
  username?: string;
}

const baseFlags: FlagInput<BaseCognitoCommandFlags> = {
  profile: Flags.string({
    aliases: ["p"],
    description:
      "The profile set up for you AWS CLI (associated with your AWS account",
  }),
  region: Flags.string({
    aliases: ["r"],
    description: "The region you want to add your user (user pool)",
  }),
};

export const cognitoCreateUserCommandFlags: FlagInput<CognitoCreateUserCommandFlags> =
  {
    ...baseFlags,
    email: Flags.string({
      description: "The email address for the new user",
    }),
    username: Flags.string({
      description: "The username for the new user",
    }),
    group: Flags.string({
      description: "The user group to associate the new user with (optional)",
    }),

    skipConfirmations: Flags.boolean({
      aliases: ["yes", "non-interactive"],
      description:
        "Non-interactive mode. (You need to supply all other flags).",
      relationships: [
        {
          type: "all",
          flags: ["profile", "region", "email", "username"],
        },
      ],
    }),
  };

export const cognitoDeleteUserCommandFlags: FlagInput<CognitoDeleteUserCommandFlags> =
  {
    ...baseFlags,
    username: Flags.string({
      description: "The username for the new user",
    }),
    skipConfirmations: Flags.boolean({
      aliases: ["yes", "non-interactive"],
      description:
        "Non-interactive mode. (You need to supply all other flags).",
      relationships: [
        {
          type: "all",
          flags: ["profile", "region", "username"],
        },
      ],
    }),
  };

export const cognitoBulkCreateUsersCommandFlags: FlagInput<CognitoBulkCreateUsersCommandFlags> =
  {
    ...baseFlags,
    group: Flags.string({
      description: "The user group to associate the new users with (optional)",
    }),
    csvFile: Flags.string({
      description:
        "The path to the CSV file containing user information (username, email)",
    }),
  };
