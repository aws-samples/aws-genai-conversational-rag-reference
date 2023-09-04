/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  CdkGraph,
  FilterPreset,
  Filters,
} from "@aws-prototyping-sdk/cdk-graph";
import { CdkGraphDiagramPlugin } from "@aws-prototyping-sdk/cdk-graph-plugin-diagram";
import { AwsPrototypingChecks, PDKNag } from "@aws-prototyping-sdk/pdk-nag";
import { Aspects } from "aws-cdk-lib";
import { BUNDLING_STACKS } from "aws-cdk-lib/cx-api";
import { ManualApprovalStep } from "aws-cdk-lib/pipelines";
import { NagSuppressions } from "cdk-nag";
import { ApplicationStage } from "./application/stage";
import { PipelineStack } from "./cicd/pipeline-stack";
import { GalileoNagSupression } from "./galileo/nag";

/* eslint-disable @typescript-eslint/no-floating-promises */
(async () => {
  const app = PDKNag.app({
    nagPacks: [new AwsPrototypingChecks()],
  });

  if (process.env.SKIP_BUNDLING) {
    console.warn("SKIPPING BUNDLING");
    app.node.setContext(BUNDLING_STACKS, []);
  }

  Aspects.of(app).add(new GalileoNagSupression());

  const pipelineStack = new PipelineStack(app, "PipelineStack", {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT!,
      region: process.env.CDK_DEFAULT_REGION!,
    },
  });

  const stageContext = app.node.tryGetContext("stages") || {};

  // Dev Stage
  const devStage = new ApplicationStage(app, "Dev", {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT!,
      region: process.env.CDK_DEFAULT_REGION!,
      ...stageContext.dev?.env,
    },
    stageContext: stageContext.dev,
    // Dev Only: Support developer accounts to assume role to invoke models during development
    supportCrossAccountModelAccess: true,
  });
  pipelineStack.pipeline.addStage(devStage);

  // Staging Stage - very basic example of staged release with manual approval
  const stagingStage = new ApplicationStage(app, "Staging", {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT!,
      region: process.env.CDK_DEFAULT_REGION!,
      ...stageContext.staging?.env,
    },
    stageContext: stageContext.staging,
  });
  pipelineStack.pipeline
    .addStage(stagingStage)
    .addPre(new ManualApprovalStep("Promote"));
  // Add Integration tests here to "Staging" stage

  // Prod Stage... add additional stages like production here...

  pipelineStack.pipeline.buildPipeline(); // Needed for CDK Nag

  NagSuppressions.addResourceSuppressions(
    pipelineStack.pipeline,
    [
      {
        id: "AwsPrototyping-CodeBuildProjectPrivilegedModeDisabled",
        reason: "Privileged mode required for docker image builds",
      },
    ],
    true
  );

  // [Optional] Additional reporting and tooling provided by CdkGraph such as automatically generating diagrams
  // @see https://aws.github.io/aws-prototyping-sdk/developer_guides/cdk-graph/index.html
  const graph = new CdkGraph(app, {
    plugins: [
      new CdkGraphDiagramPlugin({
        defaults: {
          filterPlan: {
            preset: FilterPreset.COMPACT,
            focus: (store) => {
              return store.stages.find(
                (_stage) => _stage.id === devStage.node.id
              )!;
            },
            filters: [
              Filters.pruneCustomResources(),
              (store) => {
                store.nodes.forEach((node) => {
                  if (node.isDestroyed) return;

                  switch (node.id) {
                    case "CDKMetadata": {
                      node.mutateDestroy();
                      return;
                    }
                    case "WebsiteAcl": {
                      node.mutateDestroy();
                      return;
                    }
                    case "WebsiteDeployment": {
                      node.mutateDestroy();
                      return;
                    }
                    case "WebACLAssociation": {
                      const _parent = node.parent!;
                      node.mutateHoist(_parent.parent!);
                      _parent.mutateDestroy();
                      return;
                    }
                  }

                  if (node.constructInfoFqn === "aws-cdk-lib.CfnJson") {
                    node.mutateDestroy();
                    return;
                  }
                  if (
                    node.constructInfoFqn ===
                    "aws-cdk-lib.aws_s3_deployment.BucketDeployment"
                  ) {
                    node.mutateDestroy();
                    return;
                  }
                  if (
                    node.constructInfoFqn?.startsWith(
                      "aws-cdk-lib.aws_stepfunctions."
                    )
                  ) {
                    node.mutateCollapseToParent();
                    return;
                  }
                });
              },
              Filters.pruneEmptyContainers(),
            ],
          },
        },
      }),
    ],
  });

  app.synth();

  // async cdk-graph reporting hook
  await graph.report();
})();
