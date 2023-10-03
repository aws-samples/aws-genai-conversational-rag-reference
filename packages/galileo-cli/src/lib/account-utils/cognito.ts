/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import {
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
  GetGroupCommand,
  ListUserPoolsCommand,
  AdminDisableUserCommand,
  AdminDeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { fromIni } from "@aws-sdk/credential-providers";
import chalk from "chalk";
import { CredentialsParams } from "../types";

export interface CreateCognitoUserRequest extends CredentialsParams {
  readonly email: string;
  readonly username: string;
  readonly userGroup?: string;
  readonly userPoolId: string;
}

export type DeleteCognitoUserRequest = Omit<
  CreateCognitoUserRequest,
  "userGroup" | "email"
>;

export const listUserPools = async (profile: string, region?: string) => {
  const client = new CognitoIdentityProviderClient({
    credentials: fromIni({ profile }),
    region,
  });

  const userpoolsResp = await client.send(
    new ListUserPoolsCommand({
      MaxResults: 50,
    })
  );

  return userpoolsResp.UserPools?.map((up) => ({ id: up.Id!, name: up.Name! }));
};

export const createCognitoUser = async (options: CreateCognitoUserRequest) => {
  const client = new CognitoIdentityProviderClient({
    credentials: fromIni({ profile: options.profile }),
    region: options.region,
  });

  const createUserResp = await client.send(
    new AdminCreateUserCommand({
      ForceAliasCreation: true,
      DesiredDeliveryMediums: ["EMAIL"],
      UserAttributes: [
        {
          Name: "email",
          Value: options.email,
        },
        {
          Name: "email_verified",
          Value: "true",
        },
      ],
      Username: options.username,
      UserPoolId: options.userPoolId,
    })
  );

  console.log(
    "User successfully created.",
    createUserResp.User?.UserCreateDate
  );

  if (options.userGroup != null) {
    const groupResp = await client.send(
      new GetGroupCommand({
        GroupName: options.userGroup,
        UserPoolId: options.userPoolId,
      })
    );

    if (groupResp.Group == null) {
      throw new Error(
        `Provided user group ${options.userGroup} doesn't exist.`
      );
    }

    await client.send(
      new AdminAddUserToGroupCommand({
        GroupName: options.userGroup!,
        Username: options.username,
        UserPoolId: options.userPoolId,
      })
    );

    console.log(
      `User ${chalk.magentaBright(
        options.username
      )} added to ${chalk.magentaBright(options.userGroup)} user group.`
    );
  }
};

export const deleteCognitoUser = async (options: DeleteCognitoUserRequest) => {
  const client = new CognitoIdentityProviderClient({
    credentials: fromIni({ profile: options.profile }),
    region: options.region,
  });

  await client.send(
    new AdminDisableUserCommand({
      Username: options.username,
      UserPoolId: options.userPoolId,
    })
  );
  console.log(`${options.username} disabled.`);

  await client.send(
    new AdminDeleteUserCommand({
      Username: options.username,
      UserPoolId: options.userPoolId,
    })
  );

  console.log(`${options.username} deleted.`);
};
