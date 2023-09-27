/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import fs from "node:fs";
import path from "node:path";
import { MonorepoTsProject, MonorepoTsProjectOptions } from "@aws/pdk/monorepo";
import { Project, javascript } from "projen";
import { JsiiProject } from "projen/lib/cdk";
import { Job, JobPermission, JobStep } from "projen/lib/github/workflows-model";
import { TypeScriptProject } from "projen/lib/typescript";

// Scrappy shim around PDK MonorepoTsProject, which separates stuff we would like
// to make composable in PDK directly.
export class MonorepoProject extends MonorepoTsProject {
  // TODO: make these configurable
  readonly projectDirs;
  readonly packageDirs;

  readonly header: string;

  constructor(options: Partial<MonorepoTsProjectOptions>) {
    const projectDirs = ["projenrc", "bin", "scripts"];
    const packageDirs = ["demo", "packages"];

    super({
      name: "monorepo",
      defaultReleaseBranch: "mainline",
      npmignoreEnabled: false,
      packageManager: javascript.NodePackageManager.PNPM,
      projenrcTs: true,
      prettier: true,
      disableNodeWarnings: true,
      gitignore: [".DS_Store"],
      autoDetectBin: false,
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
      // buildWorkflow: false,
      githubOptions: {
        mergify: false,
        pullRequestLint: true,
      },
      pullRequestTemplate: false,
      ...options,
      devDeps: [
        "@aws/pdk",
        "esbuild", // needed for aws-cdk-lib
        "esprima", // Error: Your application tried to access esprima, but it isn't declared in your dependencies; this makes the require call ambiguous and unsound.
        "tsx",
        "nx",
        "@nrwl/devkit",
        "husky",
        "got@^11.8.5",
        ...(options.devDeps || []),
      ],
    });

    this.projectDirs = projectDirs;
    this.packageDirs = packageDirs;

    this.header =
      fs
        .readFileSync(path.join(this.outdir, "HEADER"), { encoding: "utf-8" })
        .trimEnd() + " ";

    this.nx.nxIgnore.exclude("**/.venv/**/*", "**/cdk.out/**/*");

    this.addTask("prepare", {
      exec: "husky install",
    });

    const gitSecretsScanTask = this.addTask("git-secrets-scan", {
      exec: "./scripts/git-secrets-scan.sh",
    });
    this.testTask.spawn(gitSecretsScanTask);

    // Commit lint and commitizen settings
    this.addFields({
      config: {
        commitizen: {
          path: "./node_modules/cz-conventional-changelog",
        },
      },
      commitlint: {
        extends: ["@commitlint/config-conventional"],
      },
    });
    this.addDevDeps(
      "@commitlint/cli",
      "@commitlint/config-conventional",
      "commitizen",
      "cz-conventional-changelog"
    );
    this.setScript("commit", "pnpm exec cz");

    // Update .gitignore
    this.gitignore.exclude(
      "/.tools/",
      "/.idea/",
      "*.iml",
      ".tmp",
      "LICENSE-THIRD-PARTY",
      ".DS_Store",
      "build",
      ".env",
      ".venv",
      "tsconfig.tsbuildinfo"
    );

    // add to local `.npmrc` to automatically avoid build hangs if npx is prompting to install a package
    this.npmrc.addConfig("yes", "true");
    this.npmrc.addConfig("prefer-workspace-packages", "true");

    // OpenSource Attribution
    this.gitignore.exclude("oss-attribution");
    this.addTask("oss", { exec: "pnpm dlx tsx ./scripts/oss.ts" });
    this.addDevDeps(
      "@types/spdx-satisfies",
      "spdx-satisfies",
      "@types/spdx-correct",
      "spdx-correct"
    );

    // Pre-requisite check can be made into component for project re-use
    this.package.setScript("prerequisite-check", "./prerequisite-check.sh");
    this.package.setScript("preinstall", "./prerequisite-check.sh");

    // Workflow config
    this.github?.actions.set("actions/checkout", "actions/checkout@v4");
    this.release?.addJobs({
      release_docs: this.renderReleaseGitHubPagesJob(),
    });
  }

  recurseProjects(project: Project, fn: (project: Project) => void): void {
    fn(project);
    project.subprojects.forEach((_project) =>
      this.recurseProjects(_project, fn)
    );
  }

  configureEsLint(project: Project) {
    const isRoot = project === this;
    if (project instanceof TypeScriptProject && project.eslint) {
      const dirs = isRoot
        ? this.projectDirs
        : [project.srcdir, project.testdir];
      project.addDevDeps("eslint-plugin-header");
      project.eslint.addPlugins("header");
      project.eslint.addRules({
        "header/header": [2, "block", this.header],
      });

      project.eslint.addIgnorePattern("samples/");
      project.eslint.addIgnorePattern("scripts/");

      const eslintTask = project.tasks.tryFind("eslint");
      if (eslintTask) {
        eslintTask.reset(
          `eslint --ext .ts,.tsx \${CI:-'--fix'} --no-error-on-unmatched-pattern ${dirs.join(
            " "
          )}`,
          { receiveArgs: true }
        );
        project.testTask.spawn(eslintTask);

        project.addTask("eslint-staged", {
          description: "Run eslint against the staged files only",
          steps: [
            {
              exec: `eslint --fix --no-error-on-unmatched-pattern $(git diff --name-only --relative --staged HEAD . | grep -E '^(.*/)?(${dirs.join(
                "|"
              )})/.*\.(ts|tsx)$' | xargs)`,
            },
          ],
        });
        project.packageTask.spawn(eslintTask);
      }
    }
  }

  configureJest(project: Project): void {
    if (project instanceof TypeScriptProject && project.jest) {
      const jestTask = project.addTask("jest", {
        exec: [
          "jest",
          "--passWithNoTests",
          // Only update snapshot locally
          "${CI:-'--updateSnapshot'}",
          // Always run in band for nx runner (nx run-many)
          "${NX_WORKSPACE_ROOT:+'--runInBand'}",
        ].join(" "),
        receiveArgs: true,
      });
      project.testTask.reset();
      jestTask && project.testTask.spawn(jestTask);
    }
  }

  configJsii(project: Project): void {
    if (project instanceof JsiiProject) {
      // Suppress JSII upgrade warnings
      project.tasks.addEnvironment("JSII_SUPPRESS_UPGRADE_PROMPT", "true");
    }
  }

  synth(): void {
    this.recurseProjects(this, this.configureEsLint.bind(this));
    this.recurseProjects(this, this.configureJest.bind(this));
    this.recurseProjects(this, this.configJsii.bind(this));

    super.synth();
  }

  renderWorkflowSetup(
    _options?: javascript.RenderWorkflowSetupOptions | undefined
  ): JobStep[] {
    return [
      {
        name: "setup",
        uses: "./.github/actions/setup",
      },
    ];
  }

  renderReleaseGitHubPagesJob(): Job {
    // Based on https://github.com/actions/starter-workflows/blob/main/pages/static.yml
    return {
      environment: {
        name: "github-pages",
        url: "${{ steps.deployment.outputs.page_url }}",
      },
      runsOn: ["ubuntu-latest"],
      needs: ["release", "release_github"],
      if: "needs.release.outputs.latest_commit == github.sha",
      permissions: {
        contents: JobPermission.WRITE,
        pages: JobPermission.WRITE,
        idToken: JobPermission.WRITE,
      },
      steps: [
        {
          name: "Checkout",
          uses: this.github?.actions.get("actions/checkout"),
        },
        {
          name: "Setup Python",
          uses: "actions/setup-python@v4",
          with: {
            "python-version": "3.11",
          },
        },
        {
          name: "Setup Poetry",
          uses: "Gr1N/setup-poetry@v8",
          with: {
            "poetry-version": "1.5.1",
          },
        },
        {
          name: "Build Docs",
          run: "./docs/scripts/build.sh",
        },
        {
          name: "Setup Pages",
          uses: "actions/configure-pages@v3",
        },
        {
          name: "Upload artifact",
          uses: "actions/upload-pages-artifact@v2",
          with: {
            path: "./docs/dist/docs",
          },
        },
        {
          name: "Deploy to GitHub Pages",
          id: "deployment",
          uses: "actions/deploy-pages@v2",
          if: "${{ false }}", // disable until repo is public, since all pages are public
        },
      ],
    };
  }
}
