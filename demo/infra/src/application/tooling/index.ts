/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { getStageName } from "@aws/galileo-cdk/lib/common";
import { SageMakerStudio, PgAdmin } from "@aws/galileo-cdk/lib/tooling";
import { NestedStackProps, NestedStack } from "aws-cdk-lib";
import { ISecurityGroup, IVpc } from "aws-cdk-lib/aws-ec2";
import { Role } from "aws-cdk-lib/aws-iam";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

interface ToolingProps extends NestedStackProps {
  readonly vpc: IVpc;
  readonly sagemakerStudio?: {
    readonly domainName: string;
  };
  readonly pgAdmin?: {
    readonly pgSecurityGroup: ISecurityGroup;
    readonly pgPort?: number;
    readonly adminEmail: string;
  };
}

export class Tooling extends NestedStack {
  readonly studio?: SageMakerStudio;
  readonly pgAdmin?: PgAdmin;

  get studioUserRole(): Role | undefined {
    return this.studio?.userRole;
  }

  constructor(scope: Construct, id: string, props: ToolingProps) {
    super(scope, id, props);

    if (props.sagemakerStudio) {
      this.studio = new SageMakerStudio(this, "SageMakerStudio", {
        domainName: `${props.sagemakerStudio.domainName}-${getStageName(
          this,
          "Sandbox"
        )}`,
        vpc: props.vpc,
      });
    }

    if (props.pgAdmin) {
      this.pgAdmin = new PgAdmin(this, "PgAdmin", {
        vpc: props.vpc,
        pgSecurityGroup: props.pgAdmin!.pgSecurityGroup,
        pgAdminEmail: props.pgAdmin!.adminEmail,
        pgPort: props.pgAdmin!.pgPort,
      });
    }

    NagSuppressions.addStackSuppressions(this, [
      {
        id: "CdkNagValidationFailure",
        reason: "Suppressing errors due to dynamic tasks",
      },
      {
        id: "AwsPrototyping-IAMNoWildcardPermissions",
        reason:
          "DefaultPolicy resource with scoped down wildcard for dynamic resources and sub-wildcard actions (s3:GetObject*)",
        appliesTo: ["Resource::*"],
      },
    ]);
  }
}
