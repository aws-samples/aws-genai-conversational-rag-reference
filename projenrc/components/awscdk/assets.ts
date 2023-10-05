/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import path from "node:path";
import { CopyOptions } from "aws-cdk-lib/core/lib/fs";
import { pascal, constant } from "case";
import { Component, Project, SourceCode } from "projen";
import { AutoDiscoverCommonOptions } from "projen/lib/awscdk";
import { convertToPosixPath } from "projen/lib/awscdk/internal";
import { AutoDiscoverBase } from "projen/lib/cdk";
import { Bundler } from "projen/lib/javascript";
import { renderBundleName } from "projen/lib/javascript/util";

export const CDK_ASSET_EXT = ".asset";

export const CDK_ASSET_EXCLUDES = [
  "test_*",
  "__pycache__/**/*",
  ".pytest_cache/**/*",
];

export interface CdkCopyAssetOptions extends CopyOptions {
  readonly entrypoint: string;
  readonly name?: string;
  readonly constructFile?: string;
  readonly constructName?: string;
}

export class CdkCopyAsset extends Component {
  constructor(project: Project, options: CdkCopyAssetOptions) {
    super(project);

    const { entrypoint } = options;

    const name = options.name ?? renderBundleName(entrypoint);
    const basePath = path.posix.join(
      path.dirname(entrypoint),
      path.basename(entrypoint, CDK_ASSET_EXT)
    );
    const constructFile = options.constructFile ?? `${basePath}-asset.ts`;
    const constructName =
      options.constructName ?? pascal(path.basename(basePath)) + "Asset";

    const bundler = Bundler.of(project)!;
    const assetDir = bundler.bundledir;

    const dest = path.posix.join(assetDir, name);

    const rsyncArgs: string[] = [];

    if (options.exclude) {
      rsyncArgs.push(...options.exclude.map((v) => `--exclude=${v}`));
    }

    const rsyncCmd = [
      "rsync",
      "-av",
      ...rsyncArgs,
      entrypoint + "/", // only content
      dest,
    ];

    const task = project.addTask(`bundle:asset:${name}`, {
      steps: [{ exec: `mkdir -p ${dest}` }, { exec: rsyncCmd.join(" ") }],
    });

    project.tasks.tryFind("bundle")!.spawn(task);

    const outfileAbs = path.join(project.outdir, dest);
    const constructAbs = path.join(project.outdir, constructFile);
    const relativeOutfile = path.relative(
      path.dirname(constructAbs),
      outfileAbs
    );

    const src = new SourceCode(project, constructFile);
    if (src.marker) {
      src.line(`// ${src.marker}`);
    }

    const pathConst = constant(constructName + "Path");

    /* eslint-disable indent, prettier/prettier */
    src.line("/* eslint-disable */");
    src.line("import * as path from 'path';");
    src.line("import { Asset } from 'aws-cdk-lib/aws-s3-assets';");
    src.line("import { IConstruct } from 'constructs';");
    src.line();
    src.line(`/**`);
    src.line(` * Asset path for ${entrypoint}`);
    src.line(" */");
    src.line(
      `export const ${pathConst} = path.join(__dirname, '${convertToPosixPath(
        relativeOutfile
      )}');`
    );
    src.line();
    src.line(`/**`);
    src.line(` * Asset construct for ${entrypoint}`);
    src.line(" */");
    src.open(`export class ${constructName} extends Asset {`);
      src.open("constructor(scope: IConstruct, id: string) {");
        src.open("super(scope, id, {");
          src.line(`"path": ${pathConst},`);
        src.close("})");
      src.close("}");
    src.close("}");
    /* eslint-enable */
  }
}

/**
 * Options for `LambdaAutoDiscover`
 */
export interface CdkAssetAutoDiscoverOptions extends AutoDiscoverCommonOptions {
  /**
   * Project source tree (relative to project output directory).
   */
  readonly srcdir: string;
}

/**
 * Creates Cdk Asset from entry points discovered in the project's source tree.
 */
export class CdkAssetAutoDiscover extends AutoDiscoverBase {
  constructor(project: Project, options: CdkAssetAutoDiscoverOptions) {
    super(project, {
      projectdir: options.srcdir,
      extension: CDK_ASSET_EXT,
    });

    for (const entrypoint of this.entrypoints) {
      new CdkCopyAsset(this.project, {
        entrypoint,
        exclude: CDK_ASSET_EXCLUDES,
      });
    }
  }
}
