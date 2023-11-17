/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as path from 'node:path';
import { MonorepoTsProject, NodePackageUtils } from '@aws/pdk/monorepo';
import { Stability } from 'projen/lib/cdk';
import { TypeScriptModuleResolution, TypescriptConfigOptions } from 'projen/lib/javascript';
import { TypeScriptAppProject } from 'projen/lib/typescript';
import { DEFAULT_RELEASE_BRANCH, PROJECT_AUTHOR, VERSIONS } from '../constants';

const CLI_NAME = 'galileo-cli';

/**
 * Galileo CLI
 */
export class GalileoCli extends TypeScriptAppProject {
  constructor(monorepo: MonorepoTsProject) {
    // tsconfig update
    // TODO: review this once we're allowing building the CLI
    const tsconfig: TypescriptConfigOptions = {
      compilerOptions: {
        lib: ['ES2022', 'DOM'],
        module: 'None',
        moduleResolution: TypeScriptModuleResolution.NODE,
        skipLibCheck: true,
        resolveJsonModule: false,
        noEmit: true,

        // set these to `undefined` in order to be able to import "external" code
        // currently we're using imports (model ids) from demo/infra
        rootDir: undefined,
        outDir: undefined,
        target: 'ES2022',
      },
      include: ['examples/**/*.ts', 'bin/*.ts'],
    };

    super({
      ...PROJECT_AUTHOR,
      autoDetectBin: false,
      defaultReleaseBranch: DEFAULT_RELEASE_BRANCH,
      deps: [
        '@aws-crypto/sha256-js',
        `@aws-sdk/client-cognito-identity-provider@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/client-s3@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/client-sfn@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/client-ssm@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/client-sts@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/credential-providers@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/lib-storage@^${VERSIONS.AWS_SDK}`,
        '@aws-sdk/protocol-http',
        '@aws-sdk/querystring-parser',
        '@aws-sdk/signature-v4',
        `@aws-sdk/types@^${VERSIONS.AWS_SDK}`,
        `@smithy/property-provider`,
        '@oclif/core',
        '@oclif/errors',
        'async',
        'chalk@^4',
        'clear',
        'cross-fetch',
        'csv-parse',
        'exceljs',
        'execa',
        'fs-extra',
        'figlet',
        'ink',
        'jsonschema',
        'lodash',
        'node-localstorage',
        'ora',
        'prompts',

        // packages used in examples
        // ...
      ],
      devDeps: [
        `@aws-sdk/types@^${VERSIONS.AWS_SDK}`,
        '@oclif/test',
        '@types/async',
        '@types/chalk',
        '@types/clear',
        '@types/csv-parse',
        '@types/exceljs',
        '@types/execa',
        '@types/jsonschema',
        '@types/fs-extra',
        '@types/lodash',
        '@types/node-localstorage',
        '@types/ora',
        '@types/prompts',
        'ts-node',
      ],
      name: '@aws/galileo-cli',
      outdir: 'packages/galileo-cli',
      package: false,
      packageManager: monorepo.package.packageManager,
      parent: monorepo,
      prettier: true,
      peerDeps: [],
      publishDryRun: true,
      stability: Stability.EXPERIMENTAL,
      tsconfig,
    });

    // set `galileo-cli` as bin entry
    const bin: Record<string, string> = {};
    bin[CLI_NAME] = path.join('bin', 'galileo-cli.ts');
    this.package.addBin(bin);

    this.package.addField('private', true);

    this.addGitIgnore('examples/**/generated/**');

    // additional setup for `oclif`
    this.setupPackageJsonOclif();

    // do not build this project
    // TODO: remove this part once building enabled
    // @ts-ignore - private
    this.buildTask._locked = false;
    this.buildTask.reset('pnpm exec tsc --noEmit');

    // register script in root to execute cli
    const packageRelPath = path.relative(monorepo.outdir, this.outdir);
    const execRelPath = path.join(packageRelPath, 'bin', 'galileo-cli.ts');

    monorepo.package.setScript(
      CLI_NAME,
      `${NodePackageUtils.command.downloadExec(monorepo.package.packageManager)} tsx ${execRelPath}`,
    );
  }

  setupPackageJsonOclif() {
    const hooks = {
      init: ['src/hooks/init'],
      prerun: [],
      postrun: [],
      command_not_found: [],
    };

    const oclifPlugins = [
      '@oclif/plugin-help',
      '@oclif/plugin-plugins',
      '@oclif/plugin-not-found',
      '@oclif/plugin-update',
      '@oclif/plugin-warn-if-update-available',
      '@oclif/plugin-commands',
      '@oclif/plugin-autocomplete',
    ];

    this.package.addDeps(...oclifPlugins);

    this.package.addField('files', ['bin', 'oclif.manifest.json']);
    this.package.addField('oclif', {
      bin: CLI_NAME,
      dirname: 'galileo-cli-dir',
      commands: 'src/commands',
      hooks,
      plugins: oclifPlugins,
      topics: {
        cognito: { description: 'Cognito user management' },
        document: { description: 'Document management' },
      },
      topicSeparator: ' ',
    });
  }
}
