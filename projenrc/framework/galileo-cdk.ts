/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import path from "node:path";
import { MonorepoTsProject, NxProject } from "@aws/pdk/monorepo";
import { awscdk } from "projen";
import { AwsCdkConstructLibrary, LambdaAutoDiscover } from "projen/lib/awscdk";
import { AutoDiscoverBase, Stability } from "projen/lib/cdk";
import { CdkAssetAutoDiscover } from "../components/awscdk/assets";
import { DEFAULT_RELEASE_BRANCH, PROJECT_AUTHOR, VERSIONS } from "../constants";

export class GalileoCdk extends AwsCdkConstructLibrary {
  constructor(monorepo: MonorepoTsProject) {
    super({
      ...PROJECT_AUTHOR,
      cdkVersion: VERSIONS.CDK,
      constructsVersion: VERSIONS.CONSTRUCTS,
      defaultReleaseBranch: DEFAULT_RELEASE_BRANCH,
      jsiiVersion: "5.x",
      packageManager: monorepo.package.packageManager,
      parent: monorepo,
      name: "@aws/galileo-cdk",
      outdir: "packages/galileo-cdk",
      stability: Stability.EXPERIMENTAL,
      publishDryRun: true,
      package: false, // TODO: enable packaging once we publish, for now only local so faster build without packaging
      deps: [
        `@aws-cdk/aws-cognito-identitypool-alpha@^${VERSIONS.CDK}-alpha.0`,
        `@aws-cdk/aws-lambda-python-alpha@^${VERSIONS.CDK}-alpha.0`,
        "cdk-nag",
      ],
      devDeps: [
        `@aws-sdk/client-codebuild@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/client-dynamodb@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/client-service-quotas@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/client-sfn@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/lib-dynamodb@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/types@^${VERSIONS.AWS_SDK}`,
        "@types/fs-extra",
      ],
      bundledDeps: [
        "@aws-lambda-powertools/logger",
        "@aws-lambda-powertools/metrics",
        "@aws-lambda-powertools/parameters",
        "@middy/core",
        "@middy/error-logger",
        "@middy/http-router",
        "@middy/input-output-logger",
        `@smithy/types@^${VERSIONS.SMITHY_TYPES}`,
        "@types/aws-lambda",
        "@types/lodash",
        "@types/readline-sync",
        "@types/uuid",
        "aws-lambda",
        "aws-sdk",
        "case",
        "fs-extra",
        "lodash",
        "pretty-bytes",
        "readline-sync",
        "shorthash2",
        "tsconfig-paths",
        "uuid",
      ],
      lambdaOptions: {
        runtime: awscdk.LambdaRuntime.NODEJS_18_X,
      },
    });

    // Add /assets dir to build cache outputs
    NxProject.ensure(this).addBuildTargetFiles(undefined, [
      "{projectRoot}/assets",
    ]);

    // TODO: enable packing once we publish - for now is just local so faster builds
    this.packageTask.reset();

    // allow aws sdk imports for lambda
    this.eslint?.allowDevDeps("!@aws-sdk/*");

    new CdkAssetAutoDiscover(this, {
      srcdir: this.srcdir,
      cdkDeps: this.cdkDeps,
      tsconfigPath: this.tsconfigDev.fileName,
    });

    const autoDiscoverComps = this.components.filter(
      (v) => v instanceof AutoDiscoverBase
    ) as AutoDiscoverBase[];
    autoDiscoverComps.forEach((c: AutoDiscoverBase) => {
      if (c instanceof LambdaAutoDiscover) {
        c.entrypoints.forEach((entrypoint) => {
          const basePath = path.posix.join(
            path.dirname(entrypoint),
            path.basename(entrypoint, ".lambda.ts")
          );
          const functionPath = basePath + "-function.ts";
          if (this.tryFindFile(functionPath)) {
            this.eslint?.addIgnorePattern(functionPath);
          }
        });
      }
    });
  }
}
