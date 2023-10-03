/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as path from "node:path";
import { MonorepoTsProject, NodePackageUtils } from "@aws/pdk/monorepo";
import { Stability } from "projen/lib/cdk";
import {
  TypeScriptModuleResolution,
  TypescriptConfigOptions,
} from "projen/lib/javascript";
import { TypeScriptAppProject } from "projen/lib/typescript";
import { DEFAULT_RELEASE_BRANCH, PROJECT_AUTHOR, VERSIONS } from "../constants";

const CLI_NAME = "galileo-cli-experimental";

/**
 * Galileo CLI
 */
export class GalileoCli extends TypeScriptAppProject {
  constructor(monorepo: MonorepoTsProject) {
    // tsconfig update
    // TODO: review this once we're allowing building the CLI
    const tsconfig: TypescriptConfigOptions = {
      compilerOptions: {
        lib: ["ES2022"],
        module: "NodeNext",
        moduleResolution: TypeScriptModuleResolution.NODE_NEXT,

        // set these to `undefined` in order to be able to import "external" code
        // currently we're using imports (model ids) from demo/infra
        rootDir: undefined,
        outDir: undefined,
        target: "ES2022",
      },
    };

    super({
      ...PROJECT_AUTHOR,
      autoDetectBin: false,
      defaultReleaseBranch: DEFAULT_RELEASE_BRANCH,
      deps: [
        `@aws-sdk/client-cognito-identity-provider@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/client-s3@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/client-sfn@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/client-ssm@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/client-sts@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/lib-storage@^${VERSIONS.AWS_SDK}`,
        `@aws-sdk/credential-providers@^${VERSIONS.AWS_SDK}`,
        "@oclif/core",
        "@oclif/errors",
        "chalk@^4",
        "clear",
        "execa",
        "figlet",
        "ink",
        "lodash",
        "node-localstorage",
        "prompts",
      ],
      devDeps: [
        `@aws-sdk/types@^${VERSIONS.AWS_SDK}`,
        "@oclif/test",
        "@types/chalk",
        "@types/clear",
        "@types/execa",
        "@types/lodash",
        "@types/node-localstorage",
        "@types/prompts",
        "ts-node",
      ],
      name: "@aws-galileo/cli",
      outdir: "packages/galileo-cli",
      package: false,
      packageManager: monorepo.package.packageManager,
      parent: monorepo,
      peerDeps: [],
      prettier: true,
      publishDryRun: true,
      stability: Stability.EXPERIMENTAL,
      tsconfig,
      tsconfigDev: tsconfig,
    });

    // set `galileo-cli` as bin entry
    const bin: Record<string, string> = {};
    bin[CLI_NAME] = path.join("bin", "galileo-cli.ts");
    this.package.addBin(bin);

    this.package.addField("private", true);

    // additional setup for `oclif`
    this.setupPackageJsonOclif();

    // do not build this project
    // TODO: remove this part once building enabled
    // @ts-ignore - private
    this.buildTask._locked = false;
    this.buildTask.reset('echo "disabling build until we use it"');

    // register script in root to execute cli
    const packageRelPath = path.relative(monorepo.outdir, this.outdir);
    const execRelPath = path.join(packageRelPath, "bin", "galileo-cli.ts");

    monorepo.package.setScript(
      CLI_NAME,
      `${NodePackageUtils.command.downloadExec(
        monorepo.package.packageManager
      )} tsx ${execRelPath}`
    );

    // TEMPORARY
    this.eslint?.addOverride({
      rules: {
        quotes: [
          "error",
          "double",
          {
            avoidEscape: true,
          },
        ],
      },
      files: ["**/*.ts", "**/*.tsx"],
    });
  }

  setupPackageJsonOclif() {
    const hooks = {
      init: ["src/hooks/init"],
      prerun: [],
      postrun: [],
      command_not_found: [],
    };

    const oclifPlugins = [
      "@oclif/plugin-help",
      "@oclif/plugin-plugins",
      "@oclif/plugin-not-found",
      "@oclif/plugin-update",
      "@oclif/plugin-warn-if-update-available",
      "@oclif/plugin-commands",
      "@oclif/plugin-autocomplete",
    ];

    this.package.addDeps(...oclifPlugins);

    this.package.addField("files", ["bin", "oclif.manifest.json"]);
    this.package.addField("oclif", {
      bin: CLI_NAME,
      dirname: "galileo-cli-dir",
      commands: "src/commands",
      hooks,
      plugins: oclifPlugins,
      topicSeparator: " ",
    });
  }
}
