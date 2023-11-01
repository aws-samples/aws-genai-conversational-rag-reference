/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as fs from "node:fs";
import * as path from "node:path";
import { validate } from "jsonschema";
import { IMetadataProvider } from "./metadata-provider";
import context from "../context";
import {
  DocumentMetadata,
  DocumentMetadataLoaderError,
  DocumentValidationError,
  LoadDocumentMetadataResult,
} from "../types";

const loadMetadataRaw = (filePath: string): any => {
  if (!fs.existsSync(filePath)) {
    throw new DocumentValidationError(`File doesn't exist - ${filePath}`);
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
    throw new DocumentValidationError(`Metadata file (${filePath}) not valid!`);
  }

  // return it as typed
  return metadataRaw as DocumentMetadata;
};

export const loadDocumentMetadata = async (
  loaderOrMetaFilePath: string
): Promise<LoadDocumentMetadataResult> => {
  const ext = path.extname(loaderOrMetaFilePath);

  let documentMetadata: DocumentMetadata;
  let metadataFile: string | undefined;

  if (ext === ".json") {
    metadataFile = loaderOrMetaFilePath;
    documentMetadata = loadMetadataAndValidate(loaderOrMetaFilePath);
    context.ui.spinner.succeed("Loading metadata: Validation OK");
  } else if (ext === ".ts" || ext === ".js") {
    context.ui.spinner.succeed("Loading metadata: Calling external module");
    try {
      const { MetadataProvider } = await import(loaderOrMetaFilePath);
      const metadataProvider: IMetadataProvider = new MetadataProvider();

      const metadataReturned = await metadataProvider.getMetadata();

      if (typeof metadataReturned === "string") {
        metadataFile = metadataReturned;
        documentMetadata = loadMetadataAndValidate(metadataReturned);
        context.ui.spinner.succeed("Loading metadata: Validation OK");
      } else if (metadataReturned as DocumentMetadata) {
        documentMetadata = metadataReturned;
        context.ui.spinner.succeed("Loading metadata: OK");
      }
    } catch (err) {
      throw new DocumentMetadataLoaderError(
        "Error loading metadata from external module",
        {
          cause: err,
        }
      );
    }
  }

  return { documentMetadata: documentMetadata!, metadataFile };
};
