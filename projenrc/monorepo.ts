/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import fs from 'node:fs';
import path from 'node:path';
import { MonorepoTsProject, MonorepoTsProjectOptions } from '@aws/pdk/monorepo';
import { JsonFile, Project, javascript } from 'projen';
import { JsiiProject } from 'projen/lib/cdk';
import { Job, JobPermission, JobStep } from 'projen/lib/github/workflows-model';
import { Eslint, TrailingComma } from 'projen/lib/javascript';
import { PythonProject } from 'projen/lib/python';
import { TypeScriptProject } from 'projen/lib/typescript';
import { VERSIONS } from './constants';

// Scrappy shim around PDK MonorepoTsProject, which separates stuff we would like
// to make composable in PDK directly.
export class MonorepoProject extends MonorepoTsProject {
  // TODO: make these configurable
  readonly projectDirs;
  readonly packageDirs;

  readonly header: string;

  constructor(options: Partial<MonorepoTsProjectOptions>) {
    const projectDirs = ['projenrc', 'bin', 'scripts'];
    const packageDirs = ['demo', 'packages'];

    super({
      name: 'monorepo',
      defaultReleaseBranch: 'mainline',
      npmignoreEnabled: false,
      packageManager: javascript.NodePackageManager.PNPM,
      projenrcTs: true,
      prettier: true,
      prettierOptions: {
        settings: {
          trailingComma: TrailingComma.ALL,
          singleQuote: true,
          printWidth: 120,
        },
      },
      disableNodeWarnings: true,
      gitignore: ['.DS_Store'],
      autoDetectBin: false,
      vscode: true,
      workspaceConfig: {
        linkLocalWorkspaceBins: true,
      },
      eslint: true,
      eslintOptions: {
        dirs: projectDirs,
        ignorePatterns: packageDirs.map((v) => `${v}/`),
      },
      stale: true,
      github: true,
      release: true,
      githubOptions: {
        mergify: false,
        pullRequestLint: true,
      },
      mutableBuild: false,
      pullRequestTemplate: false,
      depsUpgrade: false,
      ...options,
      devDeps: [
        '@nrwl/devkit',
        'esbuild', // needed for aws-cdk-lib
        'esprima', // Error: Your application tried to access esprima, but it isn't declared in your dependencies; this makes the require call ambiguous and unsound.
        'got@^11.8.5',
        'husky',
        'nx',
        'tsx',
        ...(options.devDeps || []),
      ],
    });

    this.addDevDeps(`@aws/pdk@${VERSIONS.PDK}`);

    this.package.addPackageResolutions(
      `aws-cdk-lib@${VERSIONS.CDK}`,
      `constructs@${VERSIONS.CONSTRUCTS}`,
      `@aws/pdk@${VERSIONS.PDK}`,
    );

    this.projectDirs = projectDirs;
    this.packageDirs = packageDirs;

    this.header = fs.readFileSync(path.join(this.outdir, 'HEADER'), { encoding: 'utf-8' }).trimEnd() + ' ';

    this.nx.nxIgnore.exclude('**/.venv/**/*', '**/cdk.out/**/*');

    this.addTask('prepare', {
      exec: 'husky install',
    });

    const gitSecretsScanTask = this.addTask('git-secrets-scan', {
      exec: './scripts/git-secrets-scan.sh',
    });
    this.testTask.spawn(gitSecretsScanTask);

    // Commit lint and commitizen settings
    this.addFields({
      config: {
        commitizen: {
          path: './node_modules/cz-conventional-changelog',
        },
      },
      commitlint: {
        extends: ['@commitlint/config-conventional'],
      },
    });
    this.addDevDeps('@commitlint/cli', '@commitlint/config-conventional', 'commitizen', 'cz-conventional-changelog');
    this.setScript('commit', 'pnpm exec cz');

    // Update .gitignore
    this.gitignore.exclude(
      '.DS_Store',
      '.env',
      '.tmp',
      '.venv',
      '*.iml',
      '/.idea/',
      '/.tools/',
      'build',
      'LICENSE-THIRD-PARTY',
      'tsconfig.tsbuildinfo',
    );

    // add to local `.npmrc` to automatically avoid build hangs if npx is prompting to install a package
    this.npmrc.addConfig('yes', 'true');
    this.npmrc.addConfig('prefer-workspace-packages', 'true');

    // OpenSource Attribution
    this.gitignore.exclude('oss-attribution');
    this.addTask('oss', { exec: 'pnpm dlx tsx ./scripts/oss.ts' });
    this.addDevDeps('@types/spdx-correct', '@types/spdx-satisfies', 'spdx-correct', 'spdx-satisfies');

    // Pre-requisite check can be made into component for project re-use
    this.package.setScript('prerequisite-check', './prerequisite-check.sh');
    this.package.setScript('preinstall', './prerequisite-check.sh');

    // Workflow config
    this.github?.actions.set('actions/checkout', 'actions/checkout@v4');
    this.release?.addJobs({
      release_docs: this.renderReleaseGitHubPagesJob(),
    });
    this._mutateBuildWorkflowSteps();

    // patch release:mainline workflow by restoring poetry.locks to prevent git diff
    this.tasks.tryFind('unbump')?.exec("git ls-files -m | grep 'poetry.lock' | xargs git restore || exit 0;");
  }

  getVersionedDeps(project: Project): Set<string> {
    return new Set<string>(project.deps.all.filter((v) => v.version != null).map((v) => v.name));
  }

  recurseProjects(project: Project, fn: (project: Project) => void): void {
    fn(project);
    project.subprojects.forEach((_project) => this.recurseProjects(_project, fn));
  }

  configUpgradeDependencies(): void {
    const versionedDeps = new Set<string>();
    this.recurseProjects(this, (p) => {
      this.getVersionedDeps(p).forEach((v) => versionedDeps.add(v));
    });

    // ignore all deps that have explicit versioning from being updated
    if (versionedDeps.size) {
      const depsFilter = [...versionedDeps]
        .sort()
        .map((v) => v.replace('/', '\\/'))
        .join('|');
      const filter = `^(?!(${depsFilter})).*`;

      const ncurc =
        this.tryFindObjectFile('.ncurc.json') ?? new JsonFile(this, '.ncurc.json', { marker: false, obj: {} });
      ncurc.addOverride('filter', filter);

      const syncpackrc =
        this.tryFindObjectFile('.syncpackrc.json') ??
        new JsonFile(this, '.syncpackrc.json', { marker: false, obj: {} });
      syncpackrc.addOverride('filter', filter);
    }
  }

  configureVscode(): void {
    if (!this.vscode) return;

    const subprojects: Project[] = [];
    this.recurseProjects(this, (p) => subprojects.push(p));
    subprojects.sort((a, b) => (a.outdir < b.outdir ? -1 : 1));
    const pythonProjects = subprojects.filter((p) => p instanceof PythonProject);

    const prettierOptions = this.prettier?.settings;

    this.vscode.settings.addSettings({
      'search.exclude': {
        '**/.yarn': true,
        '**/.pnp.*': true,
        '**/node_modules/**/*': true,
        '**/.cache/**/*': true,
        '**/build/**/*': true,
      },
      'prettier.prettierPath': 'node_modules/prettier/index.js',
      'typescript.tsdk': 'node_modules/typescript/lib',
      'typescript.enablePromptUseWorkspaceTsdk': true,
      'gradle.nestedProjects': true,
      'python.analysis.extraPaths': pythonProjects.map(
        (p) => `\${workspaceFolder}/${path.relative(this.outdir, p.outdir)}`,
      ),
      ...(prettierOptions && {
        ...Object.fromEntries(Object.entries(prettierOptions).map(([key, value]) => [`prettier.${key}`, value])),
        'typescript.preferences.quoteStyle': prettierOptions.singleQuote ? 'single' : 'double',
        'javascript.preferences.quoteStyle': prettierOptions.singleQuote ? 'single' : 'double',
      }),
    });

    // Eslint
    this.vscode.settings.addSettings({
      'eslint.nodePath': 'node_modules/eslint/lib',
      'eslint.validate': ['javascript', 'javascriptreact', 'typescript', 'typescriptreact'],
      'eslint.workingDirectories': [
        ...subprojects.filter((p) => Eslint.of(p) != null).map((p) => './' + path.relative(this.outdir, p.outdir)),
      ],
      'editor.codeActionsOnSave': {
        'source.fixAll': true,
        'source.organizeImports': false,
      },
    });
  }

  configureLinting(project: Project) {
    const root = this;
    const isRoot = project === root;

    const prettierOptions = this.prettier?.settings;

    if (project instanceof TypeScriptProject && project.eslint) {
      const dirs = isRoot ? this.projectDirs : [project.srcdir, project.testdir];
      project.addDevDeps('eslint-plugin-header');
      project.eslint.addPlugins('header');
      project.eslint.addRules({
        'header/header': [2, 'block', this.header],
      });

      project.eslint.addIgnorePattern('samples/');
      project.eslint.addIgnorePattern('scripts/');

      project.eslint.addRules({ 'import/no-cycle': 'error' });

      if (prettierOptions) {
        project.eslint.addOverride({
          files: ['**/*.ts', '**/*.tsx'],
          rules: {
            'prettier/prettier': ['error', prettierOptions],
          },
        });
        project.prettier?.addOverride({
          files: ['**/*.ts', '**/*.tsx'],
          options: prettierOptions,
        });
      }

      const eslintTask = project.tasks.tryFind('eslint');
      if (eslintTask) {
        if (isRoot) {
          eslintTask.prependExec(`eslint --ext .ts,.tsx \${CI:-'--fix'} --no-error-on-unmatched-pattern .`);
        } else {
          eslintTask.reset(`eslint --ext .ts,.tsx \${CI:-'--fix'} --no-error-on-unmatched-pattern ${dirs.join(' ')}`, {
            receiveArgs: true,
          });
          project.testTask.spawn(eslintTask);
          project.packageTask.spawn(eslintTask);
        }

        project.addTask('eslint-staged', {
          description: 'Run eslint against the staged files only',
          steps: [
            {
              exec: `eslint --fix --no-error-on-unmatched-pattern $(git diff --name-only --relative --staged HEAD . | grep -E '^(${dirs.join(
                '|',
              )})/.*\.(ts|tsx)$' | xargs)`,
            },
          ],
        });
      }
    }
  }

  configureJest(project: Project): void {
    if (project instanceof TypeScriptProject && project.jest) {
      const jestTask = project.addTask('jest', {
        exec: [
          'jest',
          '--passWithNoTests',
          // Only update snapshot locally
          "${CI:-'--updateSnapshot'}",
          // Always run in band for nx runner (nx run-many)
          "${NX_WORKSPACE_ROOT:+'--runInBand'}",
        ].join(' '),
        receiveArgs: true,
      });
      project.testTask.reset();
      jestTask && project.testTask.spawn(jestTask);
    }
  }

  configJsii(project: Project): void {
    if (project instanceof JsiiProject) {
      // Suppress JSII upgrade warnings
      project.tasks.addEnvironment('JSII_SUPPRESS_UPGRADE_PROMPT', 'true');
    }
  }

  protected _mutateBuildWorkflowSteps(): void {
    if (this.buildWorkflow) {
      // @ts-ignore - private
      const _renderBuildSteps = this.buildWorkflow.renderBuildSteps.bind(this.buildWorkflow);
      // The default checkout uses ref/repo which does not work with private repos
      // checkout@v4 now handles it auto-magically so can safely remove `with` options
      const renderBuildSteps = (): JobStep[] => {
        const steps: JobStep[] = _renderBuildSteps();
        const checkoutStep = steps.find((v) => v.uses?.startsWith('actions/checkout@'));
        checkoutStep && Object.assign(checkoutStep, { with: undefined });
        return steps;
      };

      // @ts-ignore - private
      this.buildWorkflow.renderBuildSteps = renderBuildSteps;

      this.buildWorkflow.addPostBuildSteps({
        name: 'Restore poetry.lock files',
        run: "git ls-files -m | grep 'poetry.lock' | xargs git restore || exit 0;",
      });
    }
  }

  synth(): void {
    this.recurseProjects(this, this.configureLinting.bind(this));
    this.recurseProjects(this, this.configureJest.bind(this));
    this.recurseProjects(this, this.configJsii.bind(this));

    this.configUpgradeDependencies();
    this.configureVscode();

    super.synth();
  }

  renderWorkflowSetup(_options?: javascript.RenderWorkflowSetupOptions | undefined): JobStep[] {
    return [
      {
        name: 'setup',
        uses: './.github/actions/setup',
      },
    ];
  }

  renderReleaseGitHubPagesJob(): Job {
    // Based on https://github.com/actions/starter-workflows/blob/main/pages/static.yml
    return {
      environment: {
        name: 'github-pages',
        url: '${{ steps.deployment.outputs.page_url }}',
      },
      runsOn: ['ubuntu-latest'],
      needs: ['release', 'release_github'],
      if: 'needs.release.outputs.latest_commit == github.sha',
      permissions: {
        contents: JobPermission.WRITE,
        pages: JobPermission.WRITE,
        idToken: JobPermission.WRITE,
      },
      steps: [
        {
          name: 'Checkout',
          uses: this.github?.actions.get('actions/checkout'),
        },
        {
          name: 'Setup Python',
          uses: 'actions/setup-python@v4',
          with: {
            'python-version': '3.11',
          },
        },
        {
          name: 'Setup Poetry',
          uses: 'Gr1N/setup-poetry@v8',
          with: {
            'poetry-version': '1.5.1',
          },
        },
        {
          name: 'Build Docs',
          run: './docs/scripts/build.sh',
        },
        {
          name: 'Setup Pages',
          uses: 'actions/configure-pages@v3',
        },
        {
          name: 'Upload artifact',
          uses: 'actions/upload-pages-artifact@v2',
          with: {
            path: './docs/dist/docs',
          },
        },
        {
          name: 'Deploy to GitHub Pages',
          id: 'deployment',
          uses: 'actions/deploy-pages@v2',
        },
      ],
    };
  }
}
