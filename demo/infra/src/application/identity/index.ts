/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { UserIdentity } from "@aws-prototyping-sdk/identity";
import { PDKNag } from "@aws-prototyping-sdk/pdk-nag";
import { CfnOutput, Stack } from "aws-cdk-lib";
import {
  CfnUserPoolGroup,
  CfnUserPoolUser,
  CfnUserPoolUserToGroupAttachment,
  UserPool,
} from "aws-cdk-lib/aws-cognito";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface CognitoUserProps {
  readonly username: string;
  readonly email: string;
}

export interface IIdentityLayer {
  readonly authenticatedUserRole: IRole;
  readonly identityPoolId: string;
  readonly userPoolId: string;
  readonly userPoolWebClientId: string;
}

export interface IdentityLayerProps {
  readonly adminUser?: CognitoUserProps;
}

export class IdentityLayer extends Construct implements IIdentityLayer {
  readonly userIdentity: UserIdentity;

  readonly adminGroup: CfnUserPoolGroup;

  constructor(scope: Construct, id: string, props: IdentityLayerProps = {}) {
    super(scope, id);

    this.userIdentity = new UserIdentity(this, "UserIdentity");
    PDKNag.addResourceSuppressionsByPathNoThrow(
      Stack.of(this),
      this.userIdentity.node.path,
      [
        {
          id: "AwsPrototyping-IAMNoWildcardPermissions",
          reason: "For SMS access - managed by CDK",
          appliesTo: ["Resource::*"],
        },
      ],
      true
    );

    this.adminGroup = new CfnUserPoolGroup(this, "AdminGroup", {
      userPoolId: this.userPoolId,
      description: "Administrator group",
      groupName: "Administrators",
    });

    if (props?.adminUser) {
      const adminUser = new CfnUserPoolUser(this, "AdminUser", {
        userPoolId: this.userPoolId,
        desiredDeliveryMediums: ["EMAIL"],
        forceAliasCreation: true,
        username: props.adminUser.username,
        userAttributes: [
          { name: "email_verified", value: "true" },
          { name: "email", value: props.adminUser.email },
        ],
      });

      const adminUserAttachment = new CfnUserPoolUserToGroupAttachment(
        this,
        "AdminUserAttachment",
        {
          groupName: this.adminGroupName,
          userPoolId: this.userPoolId,
          username: adminUser.username!,
        }
      );
      adminUserAttachment.addDependency(adminUser);
    }

    new CfnOutput(this, "CognitoUserPoolUrl", {
      value: `https://${
        Stack.of(this).region
      }.console.aws.amazon.com/cognito/v2/idp/user-pools/${this.userPoolId}`,
    });
  }

  get authenticatedUserRole(): IRole {
    return this.userIdentity.identityPool.authenticatedRole;
  }

  get identityPoolId(): string {
    return this.userIdentity.identityPool.identityPoolId;
  }

  get userPoolId(): string {
    return this.userIdentity.userPool.userPoolId;
  }

  get userPool(): UserPool {
    return this.userIdentity.userPool;
  }

  get userPoolWebClientId(): string {
    return this.userIdentity.userPoolClient.userPoolClientId;
  }

  get adminGroupName(): string {
    return this.adminGroup.groupName!;
  }
}
