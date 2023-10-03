import * as path from "node:path";
import { MonorepoTsProject, NxProject } from "@aws/pdk/monorepo";
import { TypeScriptProject } from "projen/lib/typescript";
import { DEFAULT_RELEASE_BRANCH, PROJECT_AUTHOR, VERSIONS } from "../constants";
import { NodePackageManager } from "projen/lib/javascript";

export interface SampleOptions {
  readonly monorepo: MonorepoTsProject;
  readonly rootOutdir: string;
}

export class Sample {
  public readonly project: TypeScriptProject;

  constructor(options: SampleOptions) {
    const { monorepo, rootOutdir } = options;

    // EXAMPLE - This is very basic demo helper to get rudimentary third-party datasource
    // into the s3 processed bucket for demonstration purposes only.
    // Replace/Remove this with actual data pipeline based on where corp corpus resides
    this.project = new TypeScriptProject({
      ...PROJECT_AUTHOR,
      parent: monorepo,
      packageManager: NodePackageManager.PNPM,
      outdir: path.join(rootOutdir, "sample-dataset"),
      name: "sample-dataset",
      defaultReleaseBranch: DEFAULT_RELEASE_BRANCH,
      deps: ["cdk-nag"],
      peerDeps: [`aws-cdk-lib@^${VERSIONS.CDK}`, `constructs@^${VERSIONS.CONSTRUCTS}`],
      package: false,
    });
    this.project.package.addField("files", [
      "lib",
      "src",
      "generated/assets/**/*",
    ]);
    this.project.gitignore.exclude("generated");
    const generateTask = this.project.addTask("generate", {
      steps: [
        { exec: "pip3 install -r scripts/requirements.txt" },
        { exec: "python ./scripts/generate.py" },
      ],
    });
    this.project.preCompileTask.prependSpawn(generateTask);
    NxProject.ensure(this.project).setTarget("generate", {
      inputs: ["{projectRoot}/scripts/**/*"],
      outputs: [`{projectRoot}/generated/assets`],
    });
  }
}
