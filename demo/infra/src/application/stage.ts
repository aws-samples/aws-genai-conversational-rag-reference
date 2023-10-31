/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { ApplicationContext } from "@aws/galileo-cdk/lib/core/app";
import { SampleDataSets } from "@aws/galileo-cdk/lib/core/app/context/types";
import { Aspects, Stage, StageProps, Tags } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { LAMBDA_RECOGNIZE_LAYER_VERSION } from "aws-cdk-lib/cx-api";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { SampleDatasetStack } from "sample-dataset";
import { Application } from "./stack";

export interface ApplicationStageProps extends StageProps {
  readonly stageContext?: Record<string, any>;
  readonly supportCrossAccountModelAccess?: boolean;
}

export class ApplicationStage extends Stage {
  constructor(scope: Construct, id: string, props?: ApplicationStageProps) {
    super(scope, id, props);

    if (props?.stageContext) {
      Object.entries(props.stageContext).forEach(([key, value]) => {
        this.node.setContext(key, value);
      });
    }

    const context = ApplicationContext.of(this);
    const { applicationName, config } = context;

    const application = new Application(this, applicationName, {
      supportCrossAccountModelAccess: props?.supportCrossAccountModelAccess,
      ...context,
      config,
    });

    Tags.of(this).add("Application", `${this.stageName}/${applicationName}`);

    // TODO: remove sample dataset once we have cli uploader working
    if (
      config.rag.samples?.datasets.includes(SampleDataSets.SUPREME_COURT_CASES)
    ) {
      // EXAMPLE: rudimentary example of deploying dataset into processed bucket to get picked up by the ETL/Indexing job
      // Replace/remove this with actual implementation - this is for demonstration purposes only
      const sampleDatasetStack = new SampleDatasetStack(
        this,
        `${applicationName}-SampleDataset`,
        {
          // since our dataset is already in plain text and we perform basic etl in build, we push directly to "processed" bucket
          destinationBucketArn: application.corpusProcessedBucketArn,
          destinationKeyPrefix: undefined,
          corpusEtlStateMachineArn: application.corpusEtlStateMachineArn,
        }
      );

      NagSuppressions.addStackSuppressions(sampleDatasetStack, [
        {
          id: "AwsPrototyping-LambdaLatestVersion",
          reason:
            "stack has no control of custom resource lambda version used by SampleBucketDeployment",
        },
        {
          id: "AwsPrototyping-IAMNoWildcardPermissions",
          reason:
            "stack has no control of permissions used by SampleBucketDeployment",
        },
        {
          id: "AwsPrototyping-IAMNoManagedPolicies",
          reason:
            "stack has no control of policies used by SampleBucketDeployment",
        },
      ]);
    }

    Aspects.of(this).add({
      visit: (node) => {
        if (node instanceof lambda.Function) {
          // Add lambda powertools environment vars
          Object.entries(ApplicationContext.getPowerToolsEnv(node)).forEach(
            ([key, value]) => node.addEnvironment(key, value)
          );
        }
      },
    });
    Aspects.of(this).add(
      new lambda.FunctionVersionUpgrade(LAMBDA_RECOGNIZE_LAYER_VERSION)
    );
  }
}
