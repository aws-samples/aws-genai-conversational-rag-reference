import * as path from 'node:path';
import { MonorepoTsProject } from '@aws/pdk/monorepo';
import { DEFAULT_RELEASE_BRANCH, PROJECT_AUTHOR, VERSIONS } from '../constants';
import { TypeScriptProject } from 'projen/lib/typescript';
import { Project } from 'projen';
import { GalileoSdk } from '../framework';
import { NodePackageManager } from 'projen/lib/javascript';
import { Stability } from 'projen/lib/cdk';
import { Api } from './api';

export interface CorpusOptions {
  readonly monorepo: MonorepoTsProject;
  readonly rootOutdir: string;
  readonly galileoSdk: GalileoSdk;
  readonly api: Api;
}

export class Corpus {
  public readonly project: Project;
  public readonly logic: TypeScriptProject;

  get dockerOutdir(): string {
    return this.project.outdir;
  }

  constructor(options: CorpusOptions) {
    const { monorepo, rootOutdir, galileoSdk, api } = options;

    const parent = new Project({
      ...PROJECT_AUTHOR,
      parent: monorepo,
      outdir: path.join(rootOutdir, 'corpus'),
      name: 'corpus',
    });

    const logic = new TypeScriptProject({
      ...PROJECT_AUTHOR,
      parent,
      defaultReleaseBranch: DEFAULT_RELEASE_BRANCH,
      outdir: 'logic',
      name: 'corpus-logic',
      packageManager: NodePackageManager.PNPM,
      stability: Stability.EXPERIMENTAL,
      prettier: true,
      package: false,
      deps: [
        '@aws-lambda-powertools/logger',
        '@aws-lambda-powertools/metrics',
        '@aws-lambda-powertools/parameters',
        `langchain@${VERSIONS.LANGCHAIN}`, // not semver so need to pin
        '@middy/core',
        '@middy/error-logger',
        '@middy/http-router',
        '@middy/input-output-logger',
        'async',
        'dotenv',
        'fast-glob',
        'lodash',
        'node-fetch@^2',
        api.apiInterceptorsTs.package.packageName,
        api.project.runtime.typescript!.package.packageName,
        galileoSdk.package.packageName,
      ],
      devDeps: [
        '@aws-sdk/types',
        '@types/async',
        '@types/aws-lambda',
        '@types/lodash',
        '@types/node-fetch@^2',
        '@types/uuid',
        'aws-sdk-client-mock',
      ],
      peerDeps: [
        `@aws-sdk/client-dynamodb@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/client-s3@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/client-sagemaker-runtime@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/client-secrets-manager@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/lib-dynamodb@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/types@^${VERSIONS.AWS_SDK}`,
        `@smithy/types@^${VERSIONS.SMITHY_TYPES}`,
      ],
      publishDryRun: true,
      tsconfigDev: {
        compilerOptions: {
          skipLibCheck: true,
          noUnusedLocals: false,
          noUnusedParameters: false,
        },
      },
      tsconfig: {
        compilerOptions: {
          skipLibCheck: true,
        },
      },
    });
    logic.gitignore.exclude('.docker-dist');
    const bundleTask = logic.addTask('bundle', {
      steps: [
        {
          exec: 'pnpm dlx esbuild src/api/index.ts --bundle --sourcemap --platform=node --target=node18 --outfile=.docker-dist/api.js',
        },
        {
          exec: 'pnpm dlx esbuild src/indexing/index.ts --bundle --sourcemap --platform=node --target=node18 --outfile=.docker-dist/indexing.js',
        },
      ],
    });
    logic.postCompileTask.spawn(bundleTask);

    this.project = parent;
    this.logic = logic;

    // Add all subprojects to monorepo workspace
    monorepo.addWorkspacePackages(
      ...parent.subprojects.map((p) => {
        return path.relative(monorepo.outdir, p.outdir);
      }),
    );
  }
}
