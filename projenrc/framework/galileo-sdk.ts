/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { MonorepoTsProject } from "@aws/pdk/monorepo";
import { Stability } from "projen/lib/cdk";
import { EsmTypescriptProject } from "../components/esm-typescript";
import {
  AWS_SDK_VERSION,
  LANGCHAIN_VERSION,
  SMITHY_TYPES_VERSION,
} from "../constants";

// TODO: make this Jsii project so we can vend python and other languages automatically
// Requires bundling all non-Jsii deps and ensure specific interface rules, so waiting till working in Ts
export class GalileoSdk extends EsmTypescriptProject {
  constructor(monorepo: MonorepoTsProject) {
    super({
      // jsiiVersion: "5.x",
      deps: [
        "@aws-crypto/sha256-js",
        "@aws-lambda-powertools/logger",
        "@aws-lambda-powertools/metrics",
        "@aws-lambda-powertools/parameters",
        "cross-fetch",
        "handlebars-helpers-lite",
        "handlebars",
        "lodash",
        "pg-promise",
        "safe-handlebars",
        "uuid",
        `langchain@${LANGCHAIN_VERSION}`, // not semver so need to pin
      ],
      depsToTransform: ["safe-handlebars"],
      devDeps: ["@types/uuid", "@types/lodash", "aws-sdk-client-mock"],
      packageManager: monorepo.package.packageManager,
      parent: monorepo,
      peerDeps: [
        "@aws-sdk/protocol-http",
        "@aws-sdk/querystring-parser",
        "@aws-sdk/signature-v4",
        `@aws-sdk/client-dynamodb@^${AWS_SDK_VERSION}`,
        `@aws-sdk/client-s3@^${AWS_SDK_VERSION}`,
        `@aws-sdk/client-sagemaker-runtime@^${AWS_SDK_VERSION}`,
        `@aws-sdk/client-secrets-manager@^${AWS_SDK_VERSION}`,
        `@aws-sdk/client-service-quotas@^${AWS_SDK_VERSION}`,
        `@aws-sdk/credential-providers@^${AWS_SDK_VERSION}`,
        `@aws-sdk/lib-dynamodb@^${AWS_SDK_VERSION}`,
        `@aws-sdk/rds-signer@^${AWS_SDK_VERSION}`,
        `@aws-sdk/types@^${AWS_SDK_VERSION}`,
        `@smithy/types@^${SMITHY_TYPES_VERSION}`,
      ],
      publishDryRun: true,
      name: "@aws-galileo/galileo-sdk",
      outdir: "packages/galileo-sdk",
      // TODO: once we marshal the root module exports better for cross-env/modules we can re-enable this
      // currently will not support root import of the module
      rootExport: false,
      stability: Stability.EXPERIMENTAL,
    });
  }
}
