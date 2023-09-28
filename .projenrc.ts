/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { GalileoCdkLib, Demo, GalileoSdk } from "./projenrc";
import { MonorepoProject } from "./projenrc/monorepo";

const DEMO_DIR = "demo";
const DEMO_NAME = "Galileo";

const monorepo = new MonorepoProject({
  bin: {
    "galileo-cli": "./bin/galileo-cli.ts",
  },
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
  ],
});
monorepo.eslint?.addIgnorePattern(DEMO_DIR + "/**/*.*");

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
const galileoCdkLib = new GalileoCdkLib(monorepo);

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
