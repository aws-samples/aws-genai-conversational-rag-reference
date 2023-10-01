/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { MonorepoTsProject } from "@aws/pdk/monorepo";
import { AwsCdkConstructLibrary } from "projen/lib/awscdk";
import { Stability } from "projen/lib/cdk";
import { DEFAULT_RELEASE_BRANCH, PROJECT_AUTHOR, VERSIONS } from "../constants";

export class GalileoCdkLib extends AwsCdkConstructLibrary {
  constructor(monorepo: MonorepoTsProject) {
    super({
      ...PROJECT_AUTHOR,
      cdkVersion: VERSIONS.CDK,
      constructsVersion: VERSIONS.CONSTRUCTS,
      defaultReleaseBranch: DEFAULT_RELEASE_BRANCH,
      deps: [`@aws/pdk@^${VERSIONS.PDK}`],
      jsiiVersion: "5.x",
      packageManager: monorepo.package.packageManager,
      parent: monorepo,
      name: "@aws-galileo/galileo-cdk-lib",
      publishDryRun: true,
      outdir: "packages/galileo-cdk-lib",
      stability: Stability.EXPERIMENTAL,
    });

    // TODO: remove this once we start using this framework lib
    // for now just going to start dumping some snippets in here
    // and don't want to slow development of the demo as dep
    // @ts-ignore - private
    this.buildTask._locked = false;
    this.buildTask.reset('echo "disabling build until we use it"');

    // this.package.addPackageResolutions("jsii-rosetta@5.x");
  }
}
