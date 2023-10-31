/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as path from "node:path";
import { run, flush, Errors } from "@oclif/core";
import { CredentialsProviderError } from "@smithy/property-provider";
import chalk from "chalk";

// https://oclif.io/docs/config
process.env.XDG_DATA_HOME = path.join(__dirname, "..");
process.env.XDG_CACHE_HOME = path.join(__dirname, "..", "bin", ".cache", "cli");

void (async () => {
  try {
    await run();
    await flush();
  } catch (err: any) {
    // handle error when aws creds are outdated
    if (err instanceof CredentialsProviderError) {
      console.error(
        chalk.redBright(
          "\n\nSeems your AWS credentials are outdated. Please update them and try again.\n\n"
        )
      );
    }

    Errors.handle(err);
  }
})();
