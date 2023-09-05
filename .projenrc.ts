import fs from "node:fs";
import { MonorepoTsProject } from "@aws/pdk/monorepo";
import { Project, javascript } from "projen";
import { GalileoCdkLib, Demo, GalileoSdk } from "./projenrc";
import { TypeScriptModuleResolution } from "projen/lib/javascript";

const DEMO_DIR = "demo";
const DEMO_NAME = "Galileo";

const monorepo = new MonorepoTsProject({
  defaultReleaseBranch: "mainline",
  npmignoreEnabled: false,
  devDeps: [
    "esbuild", // needed for aws-cdk-lib
    "esprima", // Error: Your application tried to access esprima, but it isn't declared in your dependencies; this makes the require call ambiguous and unsound.
    "@aws/pdk",
    "tsx",
    "commander",
    "figlet",
    "@types/figlet",
    "chalk",
    "@types/clear",
    "clear",
    "prompts",
    "@types/prompts",
    "execa",
    "@types/node-localstorage",
    "node-localstorage",
    "@types/spdx-satisfies",
    "spdx-satisfies",
    "@types/spdx-correct",
    "spdx-correct",
  ],
  name: "monorepo",
  packageManager: javascript.NodePackageManager.PNPM,
  projenrcTs: true,
  prettier: true,
  disableNodeWarnings: true,
  gitignore: [".DS_Store"],
  bin: {
    "galileo-cli": "./bin/galileo-cli.ts",
  },
  autoDetectBin: false,
  workspaceConfig: {
    linkLocalWorkspaceBins: true,
  },
});
monorepo.gitignore.exclude("oss-attribution");
monorepo.eslint?.addIgnorePattern(DEMO_DIR + "/**/*.*");
monorepo.package.setScript("prerequisite-check", "./prerequisite-check.sh");
monorepo.package.setScript("preinstall", "./prerequisite-check.sh");

monorepo.package.setScript("galileo-cli", "pnpm dlx tsx ./bin/galileo-cli.ts");

// Just some helper tasks to abstract deployment for consumers
monorepo.addTask("bootstrap-account", {
  description: "Bootstrap aws account with CDK",
  receiveArgs: true,
  exec: "pnpm dlx cdk bootstrap --profile ${AWS_PROFILE} aws://$(aws sts get-caller-identity --query Account --output text)/$(aws configure get region) --cloudformation-execution-policies arn:aws:iam::aws:policy/PowerUserAccess --cloudformation-execution-policies arn:aws:iam::aws:policy/IAMFullAccess",
});
monorepo.addNxRunManyTask("deploy:pipeline", {
  target: "deploy:pipeline",
});
monorepo.nx.setTargetDefault("deploy:pipeline", {
  dependsOn: ["build", "^deploy:pipeline"],
});
monorepo.addNxRunManyTask("deploy:app", {
  target: "deploy:app",
});
monorepo.nx.setTargetDefault("deploy:app", {
  dependsOn: ["build", "^deploy:app"],
});
monorepo.nx.nxIgnore.exclude("**/.venv/**/*", "**/cdk.out/**/*");
monorepo.nx.cacheableOperations.push("generated");

monorepo.addTask("oss", { exec: "pnpm dlx tsx ./scripts/oss.ts" });

monorepo.package.addPackageResolutions("nth-check@>=2.0.1");

//////////////////////////////////////////////////////////
// FRAMEWORK
//////////////////////////////////////////////////////////
const galileoSdk = new GalileoSdk(monorepo);
const galileoCdkLib = new GalileoCdkLib(monorepo);

//////////////////////////////////////////////////////////
// DEMOS
//////////////////////////////////////////////////////////
const demo = new Demo({
  monorepo,
  galileoCdkLib,
  galileoSdk,
  rootOutdir: DEMO_DIR,
  applicationName: DEMO_NAME,
});

//////////////////////////////////////////////////////////
// SYNTH
//////////////////////////////////////////////////////////
const HEADER_RULE = {
  "header/header": [
    2,
    "block",
    fs.readFileSync("./HEADER", { encoding: "utf-8" }).trimEnd() + " ",
  ],
};
function configureEsLint(project: any) {
  if (project.eslint) {
    project.addDevDeps("eslint-plugin-header");
    project.eslint.addPlugins("header");
    project.eslint.addRules(HEADER_RULE);
  }
}
function recurseProjects(
  project: Project,
  fn: (project: Project) => void
): void {
  fn(project);
  project.subprojects.forEach((_project) => recurseProjects(_project, fn));
}
recurseProjects(monorepo, configureEsLint);

monorepo.synth();

// TEMPORARY: tsconfig/tsconfigDev overrides not working yet in PDK 0.21.2
// TODO: once projen PR and PDK updates are done, remove this block
[galileoSdk, demo.api.apiInterceptorsTs, demo.website.project].forEach(
  (tsProject) => {
    [tsProject.tsconfig!.file, tsProject.tsconfigDev.file].forEach(
      (tsconfig) => {
        tsconfig.addOverride(
          "compilerOptions.moduleResolution",
          TypeScriptModuleResolution.NODE
        );
      }
    );
    tsProject.synth();
  }
);
