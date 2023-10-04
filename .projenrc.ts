/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { GalileoCdk, Demo, GalileoSdk, GalileoCli } from "./projenrc";
import { MonorepoProject } from "./projenrc/monorepo";

const DEMO_DIR = "demo";
const DEMO_NAME = "Galileo";

const monorepo = new MonorepoProject({
  devDeps: [
    "@types/clear",
    "@types/figlet",
    "@types/lodash",
    "@types/node-localstorage",
    "@types/prompts",
    "chalk",
    "clear",
    "commander",
    "execa",
    "figlet",
    "lodash",
    "node-localstorage",
    "prompts",
    "tsconfig-paths",
  ],
  tsconfig: {
    compilerOptions: {
      noEmit: true,
      rootDir: undefined,
      sourceRoot: undefined,
      baseUrl: ".",
      paths: {
        // Map to source files for projen workspace
        "@aws/galileo-sdk/*": ["packages/galileo-sdk/src/*"],
        "@aws/galileo-cdk/*": ["demo/infra/src/galileo/*"],
      },
    },
    include: [
      ".projenrc.ts",
      "projenrc/**/*.ts",
    ],
  }
});

monorepo.tryFindObjectFile("tsconfig.json")?.addOverride(
  "ts-node", {
  "require": [
    "tsconfig-paths/register"
  ]
});

monorepo.eslint?.addIgnorePattern(DEMO_DIR + "/**/*.*");

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
monorepo.nx.cacheableOperations.push("generated");

monorepo.package.addPackageResolutions("nth-check@>=2.0.1");

//////////////////////////////////////////////////////////
// Docs
//////////////////////////////////////////////////////////
monorepo.addTask("docs:build", { exec: "docs/scripts/build.sh" });
monorepo.addTask("docs:serve", { exec: "docs/scripts/serve.sh" });

//////////////////////////////////////////////////////////
// FRAMEWORK
//////////////////////////////////////////////////////////
const galileoSdk = new GalileoSdk(monorepo);

const galileoCdkLib = new GalileoCdk(monorepo);
galileoCdkLib.addBundledDeps(galileoSdk.package.packageName);

new GalileoCli(monorepo);

//////////////////////////////////////////////////////////
// DEMOS
//////////////////////////////////////////////////////////
new Demo({
  monorepo,
  galileoCdkLib,
  galileoSdk,
  rootOutdir: DEMO_DIR,
  applicationName: DEMO_NAME,
});

monorepo.synth();
