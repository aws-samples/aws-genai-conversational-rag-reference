/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { PDKPipeline } from "@aws/pdk/pipeline";
import { Stack, StackProps } from "aws-cdk-lib";
import {
  BuildSpec,
  Cache,
  ComputeType,
  LinuxBuildImage,
  LocalCacheMode,
} from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import { CodeBuildStep } from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";

export class PipelineStack extends Stack {
  readonly pipeline: PDKPipeline;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.pipeline = new PDKPipeline(this, "ApplicationPipeline", {
      primarySynthDirectory: "demo/infra/cdk.out",
      repositoryName: this.node.tryGetContext("repositoryName") || "monorepo",
      defaultBranchName:
        this.node.tryGetContext("defaultBranchName") ||
        PDKPipeline.defaultBranchName,
      publishAssetsInParallel: false,
      crossAccountKeys: true,
      codeBuildDefaults: {
        rolePolicy: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["sts:AssumeRole"],
            resources: ["arn:aws:iam::*:role/cdk-*"],
          }),
        ],
      },
      synth: {},
      synthCodeBuildDefaults: {
        buildEnvironment: {
          buildImage: LinuxBuildImage.STANDARD_7_0,
          computeType: ComputeType.LARGE,
          privileged: true,
        },
        cache: Cache.local(
          LocalCacheMode.CUSTOM,
          LocalCacheMode.DOCKER_LAYER,
          LocalCacheMode.SOURCE
        ),
        partialBuildSpec: BuildSpec.fromObject({
          cache: {
            paths: [
              "/root/.m2/**/*",
              "/root/.gradle/caches/**/*",
              "/var/cache/apt/**/*",
              "/var/lib/apt/lists/**/*",
              "/root/.composer/**/*",
              "/root/.pnpm-store/**/*",
              "node_modules/.cache/nx/**/*",
            ],
          },
        }),
      },
      synthShellStepPartialProps: {
        installCommands: [
          "pip3 install poetry",
          "poetry --version",
          "npm install -g pnpm",
          "pnpm install --frozen-lockfile || pnpm projen && pnpm install --frozen-lockfile",
        ],
        commands: ["pnpm build"],
      },
      assetPublishingCodeBuildDefaults: {
        buildEnvironment: {
          buildImage: LinuxBuildImage.STANDARD_7_0,
          computeType: ComputeType.LARGE,
          privileged: true,
        },
      },
      cdkCommand: "pnpm exec cdk",
      dockerEnabledForSelfMutation: true,
      dockerEnabledForSynth: true,
      sonarCodeScannerConfig: this.node.tryGetContext("sonarqubeScannerConfig"),
      selfMutation: true,
    });

    // [REUSE] can add this to PDK @see https://github.com/aws/aws-cdk/issues/9917
    let strip = new CodeBuildStep("StripAssetsFromAssembly", {
      input: this.pipeline.codePipeline.cloudAssemblyFileSet,
      commands: [
        "cross_region_replication_buckets=$(grep BucketName cross-region-stack-* | awk -F 'BucketName' '{print $2}' | tr -d ': ' | tr -d '\"' | tr -d ',')",
        'S3_PATH=${CODEBUILD_SOURCE_VERSION#"arn:aws:s3:::"}',
        "ZIP_ARCHIVE=$(basename $S3_PATH)",
        "rm -rf asset.*",
        "zip -r -q -A $ZIP_ARCHIVE *",
        "aws s3 cp $ZIP_ARCHIVE s3://$S3_PATH",
        "object_location=${S3_PATH#*/}",
        "for bucket in $cross_region_replication_buckets; do aws s3 cp $ZIP_ARCHIVE s3://$bucket/$object_location; done",
      ],
      rolePolicyStatements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: ["s3:Get*", "s3:List*", "s3:Put*"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: ["kms:GenerateDataKey"],
        }),
      ],
    });

    this.pipeline.codePipeline.addWave("BeforeStageDeploy", {
      pre: [strip],
    });
  }
}
