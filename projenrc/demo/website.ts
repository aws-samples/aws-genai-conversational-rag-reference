import { CloudscapeReactTsWebsiteProject } from '@aws/pdk/cloudscape-react-ts-website';
import { MonorepoTsProject, NxProject } from '@aws/pdk/monorepo';
import * as path from 'node:path';
import { TextFile, javascript } from 'projen';
import { TypeScriptModuleResolution } from 'projen/lib/javascript';
import { DEFAULT_RELEASE_BRANCH, VERSIONS } from '../constants';
import { GalileoSdk } from '../framework';
import { withStorybook } from '../helpers/withStorybook';
import { Api } from './api';

export interface WebsiteOptions {
  readonly monorepo: MonorepoTsProject;
  readonly rootOutdir: string;
  readonly api: Api;
  readonly galileoSdk: GalileoSdk;
}

export class Website {
  public readonly project: CloudscapeReactTsWebsiteProject;

  constructor(options: WebsiteOptions) {
    const { monorepo, api, rootOutdir, galileoSdk } = options;

    this.project = new CloudscapeReactTsWebsiteProject({
      typeSafeApi: api.project,
      packageManager: javascript.NodePackageManager.PNPM,
      parent: monorepo,
      prettier: true,
      outdir: path.join(rootOutdir, 'website'),
      defaultReleaseBranch: DEFAULT_RELEASE_BRANCH,
      npmignoreEnabled: false,
      name: 'website',
      deps: [
        '@cloudscape-design/collection-hooks',
        '@faker-js/faker',
        '@tanstack/react-query-devtools',
        '@tanstack/react-query',
        '@tanstack/react-virtual@beta',
        'ace-builds',
        'assert',
        'dayjs',
        'immer',
        'jwt-decode',
        `langchain@${VERSIONS.LANGCHAIN}`, // not semver so need to pin
        'lodash',
        'nanoid',
        'react-collapsed',
        'react-intersection-observer',
        'react-markdown',
        'use-immer',
        'usehooks-ts',
        api.project.library.typescriptReactQueryHooks!.package.packageName,
        galileoSdk.package.packageName,
      ],
      devDeps: [
        '@testing-library/react-hooks',
        '@types/assert',
        '@types/jest',
        '@types/lodash',
        'console-browserify',
        'crypto-browserify',
        'msw-storybook-addon',
        'msw',
        'path-browserify',
        'process',
        'react-test-renderer',
        'stream-browserify',
      ],
      tsconfigDev: {
        compilerOptions: {
          noUnusedLocals: false,
          noUnusedParameters: false,
          moduleResolution: TypeScriptModuleResolution.NODE,
        },
      },
      rewire: {},
    });
    this.project.tsconfig?.addInclude('src/**/*.tsx');
    this.project.addGitIgnore('public/api.html');
    this.project.addGitIgnore('public/chat-engine-config.json');
    this.project.addGitIgnore('runtime-config.*');
    this.project.addGitIgnore('!runtime-config.example.json');
    const apiHtml = path.relative(
      this.project.outdir,
      path.join(api.project.documentation.html2!.outdir, 'index.html'),
    );
    this.project.preCompileTask.prependExec(`cp ${apiHtml} public/api.html`, {
      condition: `[ -f "${apiHtml}" ]`,
    });
    // Only warn on errors during development - https://create-react-app.dev/docs/advanced-configuration
    this.project.tasks.tryFind('dev')?.env('ESLINT_NO_DEV_ERRORS', 'true');
    this.project.tasks.tryFind('dev')?.env('TSC_COMPILE_ON_ERROR', 'true');
    NxProject.ensure(this.project).addImplicitDependency(api.project.documentation.html2!);
    withStorybook(this.project);

    // HACK: rewire values must be RegEx but projen only support JSON values
    const rewireConfig = this.project.tryFindFile('.projen/react-config-overrides.js') as TextFile;
    const _synthesizeContent =
      // @ts-ignore -- private
      rewireConfig.synthesizeContent.bind(rewireConfig);
    // @ts-ignore -- protected
    rewireConfig.synthesizeContent = (_: any) => {
      const text = _synthesizeContent(_);
      return text?.replace('return config;', `return require('../webpack/config-overrides')(config, env);`);
    };

    // TODO: figure out why these modules started failing on test with ecma import/export errors?
    this.project.package.addField('jest', {
      transformIgnorePatterns: [
        'node_modules\\/(?!\\.pnpm|@aws-northstar\\/\\w+|@cloudscape-design\\/\\w+)\\/.+\\.(js|jsx|mjs|cjs|ts|tsx)$',
        // defaults
        '^.+\\.module\\.(css|sass|scss)$',
      ],
    });
  }
}
