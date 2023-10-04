/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { getStageName } from "@aws/galileo-cdk/lib/common";
import { NestedStackProps, NestedStack } from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { Role } from "aws-cdk-lib/aws-iam";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { SageMakerStudio } from "@aws/galileo-cdk/tooling/sagemaker/studio";

interface ToolingProps extends NestedStackProps {
  readonly vpc: IVpc;
  readonly domainName: string;
}

export class Tooling extends NestedStack {
  readonly studio: SageMakerStudio;

  get studioUserRole(): Role {
    return this.studio.userRole;
  }

  constructor(scope: Construct, id: string, props: ToolingProps) {
    super(scope, id, props);

    this.studio = new SageMakerStudio(this, "SageMakerStudio", {
      domainName: `${props.domainName}-${getStageName(this, "Sandbox")}`,
      vpc: props.vpc,
    });

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
