/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { MonorepoTsProject } from '@aws/pdk/monorepo';
import { Stability } from 'projen/lib/cdk';
import { EsmTypescriptProject } from '../components/esm-typescript';
import { VERSIONS } from '../constants';

// TODO: make this Jsii project so we can vend python and other languages automatically
// Requires bundling all non-Jsii deps and ensure specific interface rules, so waiting till working in Ts
export class GalileoSdk extends EsmTypescriptProject {
  constructor(monorepo: MonorepoTsProject) {
    super({
      // jsiiVersion: "5.x",
      deps: [
        '@aws-crypto/sha256-js',
        '@aws-lambda-powertools/logger',
        '@aws-lambda-powertools/metrics',
        '@aws-lambda-powertools/parameters',
        'cross-fetch',
        'handlebars-helpers-lite',
        'handlebars',
        'lodash',
        'pg-promise',
        'safe-handlebars',
        'uuid',
        `langchain@${VERSIONS.LANGCHAIN}`, // not semver so need to pin
      ],
      depsToTransform: ['safe-handlebars'],
      devDeps: ['@types/uuid', '@types/lodash', 'aws-sdk-client-mock'],
      packageManager: monorepo.package.packageManager,
      parent: monorepo,
      prettier: true,
      peerDeps: [
        `@aws-sdk/client-dynamodb`,
        `@aws-sdk/client-s3`,
        `@aws-sdk/client-sagemaker-runtime`,
        `@aws-sdk/client-secrets-manager`,
        `@aws-sdk/client-service-quotas`,
        `@aws-sdk/credential-providers`,
        `@aws-sdk/lib-dynamodb`,
        `@aws-sdk/rds-signer`,
        `@aws-sdk/types`,
        '@smithy/protocol-http',
        '@smithy/querystring-parser',
        '@smithy/signature-v4',
        `@smithy/types`,
      ],
      publishDryRun: true,
      name: '@aws/galileo-sdk',
      outdir: 'packages/galileo-sdk',
      // TODO: once we marshal the root module exports better for cross-env/modules we can re-enable this
      // currently will not support root import of the module
      rootExport: false,
      stability: Stability.EXPERIMENTAL,
    });
  }
}
