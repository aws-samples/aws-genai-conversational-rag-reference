/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseCsv } from "./parser-common";
import { DocumentMetadata, IMetadataProvider } from "../../src";

export class MetadataProvider implements IMetadataProvider {
  async getMetadata(): Promise<string | DocumentMetadata> {
    // build the metadata
    const docMetadata = parseCsv();

    // save it as a metadata.json file
    const outputDir = path.join(__dirname, "generated");
    const outputFile = path.join(outputDir, "metadata.json");

    // create generated folder if doesn't exist
    fs.mkdirSync(outputDir, { recursive: true });

    // save into a file
    fs.writeFileSync(outputFile, JSON.stringify(docMetadata, null, 2), {
      encoding: "utf-8",
    });

    // return absolute path
    return outputFile;
  }
}
