/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as fs from "node:fs";
import * as path from "node:path";
import { validate } from "jsonschema";
import { DocumentMetadata } from "../types";

const loadMetadataRaw = (filePath: string): any => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File doesn't exist - ${filePath}`);
  }

  const metadataContent = fs.readFileSync(filePath, { encoding: "utf-8" });
  const metadataRaw = JSON.parse(metadataContent);

  return metadataRaw;
};

export const loadMetadataAndValidate = (filePath: string): DocumentMetadata => {
  // load schema
  const schemaContent = fs.readFileSync(
    path.join(__dirname, "metadata.schema.json"),
    { encoding: "utf-8" }
  );
  const schema = JSON.parse(schemaContent);

  // load metadata
  const metadataRaw = loadMetadataRaw(filePath);
  const result = validate(metadataRaw, schema);
  if (!result.valid) {
    throw new Error(`Metadata file (${filePath}) not valid!`);
  }

  // return it as typed
  return metadataRaw as DocumentMetadata;
};
