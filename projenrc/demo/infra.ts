import * as path from "node:path";
import { NxMonorepoProject, NxProject } from "@aws-prototyping-sdk/nx-monorepo";
import { javascript } from "projen";
import { AwsCdkTypeScriptApp } from "projen/lib/awscdk";
import { GalileoCdkLib, GalileoSdk } from "../framework";
import { LAMBDA_RECOGNIZE_LAYER_VERSION } from "aws-cdk-lib/cx-api";
import { Api } from './api';
import { Corpus } from './corpus';
import { Website } from './website';
import { Sample } from './sample';
import { AWS_SDK_VERSION, CDK_VERSION, DEFAULT_RELEASE_BRANCH, PDK_VERSION } from '../constants';
import { EULA_ENABLED_CONTEXT } from '../../demo/infra/src/galileo/ai/llms/framework/eula/context';
import { IApplicationContext } from '../../demo/infra/src/application/context';
import { extractPeerDeps } from '../helpers/extract-peer-deps';
import { FoundationModelIds } from '../../demo/infra/src/application/ai/foundation-models/ids';

export interface InfraOptions {
  readonly monorepo: NxMonorepoProject;
  readonly rootOutdir: string;
  readonly applicationName: string;
  readonly galileoCdkLib: GalileoCdkLib;
  readonly galileoSdk: GalileoSdk;
  readonly api: Api;
  readonly corpus: Corpus;
  readonly website: Website;
  readonly sample: Sample;
}

export class Infra {
  public readonly project: AwsCdkTypeScriptApp;

  constructor(options: InfraOptions) {
    const { monorepo, rootOutdir, galileoSdk, api, corpus, website, sample, applicationName } = options;

    this.project = new AwsCdkTypeScriptApp({
      packageManager: javascript.NodePackageManager.PNPM,
      parent: monorepo,
      outdir: path.join(rootOutdir, "infra"),
      cdkVersion: CDK_VERSION,
      constructsVersion: "10.2.52",
      defaultReleaseBranch: DEFAULT_RELEASE_BRANCH,
      npmignoreEnabled: false,
      prettier: true,
      name: "infra",
      deps: [
        // this.galileoLibDep, TODO: removing this until we use it, so can remove build dep for now
        `@aws-prototyping-sdk/static-website@^${PDK_VERSION}`,
        `@aws-prototyping-sdk/identity@^${PDK_VERSION}`,
        `@aws-prototyping-sdk/pipeline@^${PDK_VERSION}`,
        `@aws-prototyping-sdk/pdk-nag@^${PDK_VERSION}`,
        `@aws-prototyping-sdk/cdk-graph-plugin-diagram@^${PDK_VERSION}`,
        `@aws-prototyping-sdk/cdk-graph@^${PDK_VERSION}`,
        `@aws-prototyping-sdk/aws-arch@^${PDK_VERSION}`,
        `@aws-prototyping-sdk/type-safe-api@^${PDK_VERSION}`,
        `@aws-cdk/aws-cognito-identitypool-alpha@^${CDK_VERSION}-alpha.0`,
        `@aws-cdk/aws-lambda-python-alpha@^${CDK_VERSION}-alpha.0`,
        `@aws-sdk/client-codebuild@^${AWS_SDK_VERSION}`,
        `@aws-sdk/client-dynamodb@^${AWS_SDK_VERSION}`,
        `@aws-sdk/lib-dynamodb@^${AWS_SDK_VERSION}`,
        `@aws-sdk/client-sfn@^${AWS_SDK_VERSION}`,
        `@aws-sdk/client-service-quotas@^${AWS_SDK_VERSION}`,
        "@aws-lambda-powertools/logger",
        "@aws-lambda-powertools/metrics",
        "@aws-lambda-powertools/parameters",
        "@middy/core",
        "@middy/error-logger",
        "@middy/http-router",
        "@middy/input-output-logger",
        "uuid",
        "shorthash2",
        "readline-sync",
        "cdk-nag",
        "pretty-bytes",
        // Workspace dependencies
        api.project.infrastructure.typescript!.package.packageName,
        api.project.runtime.typescript!.package.packageName,
        api.apiInterceptorsTs.package.packageName,
        website.project.package.packageName,
        galileoSdk.package.packageName,
        ...extractPeerDeps(galileoSdk),
        // For lambdas to reuse logic in step function
        corpus.logic.package.packageName,
        ...extractPeerDeps(corpus.logic),
        // Remove this if not using sample dataset
        sample.project.package.packageName,
      ],
      devDeps: [
        "aws-sdk",
        "aws-lambda",
        "@types/aws-lambda",
        "@types/uuid",
        "@types/readline-sync",
      ],
      context: {
        // Automatically update lambda description with asset hash to ensure new versions are deployed
        [LAMBDA_RECOGNIZE_LAYER_VERSION]: true,
        // CICD CodeCommit repository name
        "repositoryName": "galileo",
        // Indicates if LLM End-User License Agreement verification is enabled
        [EULA_ENABLED_CONTEXT]: false, // TODO: Re-enable EULA for beta
        ...{
          ApplicationName: applicationName,
          ChatDomain: "Legal",
          IncludeSampleDataset: true,
          // FoundationModelRegion: "us-east-1",
          DefaultModelId: FoundationModelIds.FALCON_LITE,
          FoundationModels: [
            // FoundationModelIds.FALCON_40B,
            // FoundationModelIds.FALCON_OA_7B,
            FoundationModelIds.FALCON_LITE,
          ],
          WebsiteContentPath: path.relative(
            path.join(options.monorepo.outdir, rootOutdir, "infra"),
            path.join(website.project.outdir, "build")
          ),
          CorpusDockerImagePath: path.relative(
            path.join(options.monorepo.outdir, rootOutdir, "infra"),
            path.join(corpus.dockerOutdir)
          ),
        } as IApplicationContext,
      },
      tsconfigDev: {
        compilerOptions: {
          noUnusedLocals: false,
          noUnusedParameters: false,
        },
      },
      tsconfig: {
        compilerOptions: {
          noUnusedLocals: false,
          noUnusedParameters: false,
          lib: ["ES2020"],
          target: "ES2020",
        },
      },
    });
    this.project.gitignore.exclude("cdk.context.json");
    this.project.eslint?.addIgnorePattern("cdk.out");
    this.project.eslint?.addIgnorePattern("node_modules");
    this.project.eslint?.addIgnorePattern("test_reports");

    NxProject.ensure(this.project).addBuildTargetFiles(
      ["!{projectRoot}/cdk.out/**/*"],
    );

    // Make sure that infra wait for python deps of the lambda handlers it contains
    NxProject.ensure(this.project).addImplicitDependency(
      api.project.runtime.python!,
      corpus.logic,
    );

    this.project.package.setScript(
      "deploy:app",
      `pnpm exec cdk deploy --region --app cdk.out --require-approval never Dev/${applicationName}`
    );
    this.project.package.setScript(
      "deploy:models",
      `pnpm exec cdk deploy --region --app cdk.out --require-approval never Dev/${applicationName}/FoundationModelStack`
    );
    this.project.package.setScript(
      "deploy:sample-dataset",
      `pnpm exec cdk deploy --region --app cdk.out --require-approval never Dev/${applicationName}-SampleDataset`
    );

    this.project.package.setScript(
      "deploy:pipeline",
      "pnpm exec cdk deploy --app cdk-out --require-approval never PipelineStack"
    );

    this.project.package.setScript(
      "nag",
      "SKIP_BUNDLING=1 pnpm exec cdk synth --no-staging --strict --quiet"
    )
  }
}
