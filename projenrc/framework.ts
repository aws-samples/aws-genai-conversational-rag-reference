import { NxMonorepoProject } from "@aws-prototyping-sdk/nx-monorepo";
import { AwsCdkConstructLibrary } from "projen/lib/awscdk";
import { Stability } from "projen/lib/cdk";
import { AWS_SDK_VERSION, CDK_VERSION, LANGCHAIN_VERSION, PROJECT_AUTHOR } from "./constants";
import { TypeScriptProject } from 'projen/lib/typescript';
import { DEFAULT_RELEASE_BRANCH } from './constants';

export class GalileoCdkLib extends AwsCdkConstructLibrary {
  constructor(monorepo: NxMonorepoProject) {
    super({
      ...PROJECT_AUTHOR,
      parent: monorepo,
      stability: Stability.EXPERIMENTAL,
      packageManager: monorepo.package.packageManager,
      name: "@aws-galileo/galileo-cdk-lib",
      outdir: "packages/galileo-cdk-lib",
      cdkVersion: CDK_VERSION,
      constructsVersion: "10.2.52",
      jsiiVersion: "5.x",
      defaultReleaseBranch: DEFAULT_RELEASE_BRANCH,
      deps: [
        // `@aws-prototyping-sdk/identity@^${PDK_VERSION}`
        // `@aws-prototyping-sdk/pdk-nag@^${PDK_VERSION}`
      ],
      publishDryRun: true,
    });

    // TODO: remove this once we start using this framework lib
    // for now just going to start dumping some snippets in here
    // and don't want to slow development of the demo as dep
    // @ts-ignore - private
    this.buildTask._locked = false;
    this.buildTask.reset("echo \"disabling build until we use it\"")

    // this.package.addPackageResolutions("jsii-rosetta@5.x");
  }
}

// TODO: make this Jsii project so we can vend python and other languages automatically
// Requires bundling all non-Jsii deps and ensure specific interface rules, so waiting till working in Ts
export class GalileoSdk extends TypeScriptProject {
  constructor(monorepo: NxMonorepoProject) {
    super({
      ...PROJECT_AUTHOR,
      parent: monorepo,
      stability: Stability.EXPERIMENTAL,
      packageManager: monorepo.package.packageManager,
      name: "@aws-galileo/galileo-sdk",
      outdir: "packages/galileo-sdk",
      // jsiiVersion: "5.x",
      defaultReleaseBranch: DEFAULT_RELEASE_BRANCH,
      deps: [
        `langchain@${LANGCHAIN_VERSION}`, // not semver so need to pin
        "uuid",
        "pg-promise",
        "@aws-lambda-powertools/logger",
        "@aws-lambda-powertools/metrics",
        "@aws-lambda-powertools/parameters",
        "@aws-crypto/sha256-js",
        "cross-fetch",
        "lodash",
      ],
      devDeps: [
        "@types/uuid",
        "@types/lodash",
        "aws-sdk-client-mock",
        "@aws-sdk/types",
      ],
      peerDeps: [
        `@aws-sdk/client-dynamodb@^${AWS_SDK_VERSION}`,
        `@aws-sdk/lib-dynamodb@^${AWS_SDK_VERSION}`,
        `@aws-sdk/client-s3@^${AWS_SDK_VERSION}`,
        `@aws-sdk/rds-signer@^${AWS_SDK_VERSION}`,
        `@aws-sdk/client-secrets-manager@^${AWS_SDK_VERSION}`,
        `@aws-sdk/client-sagemaker-runtime@^${AWS_SDK_VERSION}`,
        `@aws-sdk/client-service-quotas@^${AWS_SDK_VERSION}`,
        `@aws-sdk/credential-providers@^${AWS_SDK_VERSION}`,
        "@aws-sdk/signature-v4",
        "@aws-sdk/protocol-http",
        "@aws-sdk/querystring-parser",
      ],
      publishDryRun: true,
      tsconfigDev: {
        compilerOptions: {
          lib: [
            "DOM",
            "ES2021",
          ],
          skipLibCheck: true,
          noUnusedLocals: false,
          noUnusedParameters: false,
        }
      },
      tsconfig: {
        compilerOptions: {
          lib: [
            "DOM",
            "ES2021",
          ],
          skipLibCheck: true,
        }
      },
    });

    this.package.addField("private", true);

    this.package.addPackageResolutions("jsii-rosetta@5.x");
  }
}
