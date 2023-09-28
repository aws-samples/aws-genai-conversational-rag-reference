/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as path from "node:path";
import { run, flush, Errors } from "@oclif/core";

process.env.XDG_DATA_HOME = path.join(__dirname, "..");
process.env.XDG_CACHE_HOME = path.join(__dirname, "..", "bin", ".cache", "cli");

void (async () => {
  try {
    await run();
    await flush();
  } catch (err: any) {
    Errors.handle(err);
  }
})();
