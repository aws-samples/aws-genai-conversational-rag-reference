#!/usr/bin/env tsx

/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import path from "node:path";
import fs from "node:fs/promises";
import { $ } from "execa";
import satisfies from "spdx-satisfies";
import correct from "spdx-correct";
import chalk from "chalk";

const ROOT_DIR = path.resolve(__dirname, "..");

const ALLOWLIST: string[] = [
  "0BSD",
  "Apache-2.0 AND MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "CC-BY-3.0+",
  "CC0-1.0+",
  "ISC",
  "MIT OR GPL-3.0-or-later",
  "MIT-0",
  "MIT",
  "MPL-2.0+",
  "Python-2.0+",
];

// List of packages that were manually checked for allowed licensing
const EXCEPTIONS = new Set<string>([
]);

interface Pkg {
  readonly name: string;
  readonly version: string;
  readonly path: string;
  readonly license: string;
  readonly licenseContents?: string;
  readonly author: string;
  readonly homepage?: string;
  readonly description?: string;
}

interface Counts {
  readonly licenseCount: number;
  readonly packageCount: number;
}

const UNKNOWN = "Unknown";
const Unlicense = "Unlicense";
const UNLICENSED = "UNLICENSED";

process.chdir(ROOT_DIR);

function notAllowed(license: string): boolean {
  if (license === Unlicense) return false;
  if (license === UNLICENSED) return true;
  if (license === UNKNOWN) return true;

  return ALLOWLIST.find((allowed) => {
    return satisfies(license, allowed);
  }) == null;
}

(async () => {
  console.info(chalk.cyanBright("Performing Open-Source Check"));
  console.info(chalk.gray("Checking licenses for all dependencies..."));
  const licenses = JSON.parse((await $`pnpm licenses ls --prod --json`).stdout);
  const totals = Object.values<Pkg[]>(licenses).reduce<Counts>((_totals, _pkgs): Counts => {
    return {
      licenseCount: _totals.licenseCount + 1,
      packageCount: _totals.packageCount + _pkgs.length,
    }
  }, { licenseCount: 0, packageCount: 0 } as Counts);
  const notAllowedLicenses = Object.keys(licenses).map((v) => correct(v, { upgrade: true }) || UNKNOWN).filter(notAllowed);
  console.info(chalk.gray(`Found ${totals.licenseCount} licenses across ${totals.packageCount} dependencies`));

  const attribution = (await $`pnpm licenses ls --prod --long`).stdout;
  await fs.writeFile(path.join(ROOT_DIR, "LICENSE-THIRD-PARTY"), attribution, { encoding: "utf-8" });
  console.info(chalk.cyan("Third-Party attribution notice written to LICENSE-THIRD-PARTY"));

  if (notAllowedLicenses.length) {
    const notAllowedPackages = new Set<string>();
    notAllowedLicenses.forEach((license) => {
      licenses[license].forEach((pkg: Pkg) => {
        if (pkg.licenseContents?.startsWith("Apache License")) {
          return;
        }
        if (!EXCEPTIONS.has(pkg.name)) {
          notAllowedPackages.add(pkg.name);
        }
      })
    })
    if (notAllowedPackages.size) {
      console.error(chalk.redBright("License checker has failed!"));
      console.error(chalk.red("Packages that did not pass license check:", [...notAllowedPackages.values()]));
      console.error(chalk.red("Licenses that are not supported:", notAllowedLicenses));
      throw new Error(`[License Check] The following licenses are not allowed: ${notAllowedLicenses.join(", ")}`);
    }
  }

  console.info(chalk.green("License checker has passed!"));

  // Run audit for high+ issues
  console.info(chalk.gray("Performing audit scan for vulnerability across all dependencies (high+)"));
  await $`pnpm audit --prod --audit-level high`;
  console.info(chalk.green("Audit checker has passed!"));

  console.info(chalk.bold.greenBright("Open-Source check completed successfully! 🤑"));
})()
.catch((error) => {
  console.error(chalk.bold.redBright("Open-Source check failed! 🥵"))
  console.error(chalk.red(error));
  process.exit(1);
})
