/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
// import * as fs from "node:fs";
// import * as path from "node:path";
import * as fs from "fs";
import * as path from "node:path";
import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";
import { Upload } from "@aws-sdk/lib-storage";
import chalk from "chalk";
import { kebabCase } from "lodash";
import context from "../context";
import { CredentialsParams, DocumentMetadata } from "../types";

export interface UploadDocumentsRequest extends CredentialsParams {
  readonly documentMetadata: DocumentMetadata;
  readonly metadataFilepath: string;
  readonly uploadBucket: string;
  readonly uploadKeyPrefix: string;
}

export namespace s3 {
  export const listBuckets = async (
    credentials: CredentialsParams
  ): Promise<string[]> => {
    const s3Client = new S3Client({
      credentials: fromIni({
        profile: credentials.profile,
      }),
      region: credentials.region,
    });

    const bucketsResponse = await s3Client.send(new ListBucketsCommand({}));
    // TODO: add tag checks to return only processedBuckets
    return bucketsResponse.Buckets!.map((b) => b.Name!);
  };

  export const uploadDocuments = async (options: UploadDocumentsRequest) => {
    const s3Client = new S3Client({
      credentials: fromIni({
        profile: options.profile,
      }),
      region: options.region,
    });

    // read metadata
    const { rootDir, metadata, documents } = options.documentMetadata;
    const docKeys = Object.keys(documents);

    let rootDirAbs: string;
    if (path.isAbsolute(rootDir)) {
      rootDirAbs = rootDir;
    } else {
      rootDirAbs = path.resolve(
        path.join(path.dirname(options.metadataFilepath), rootDir)
      );
    }

    for (let i = 0; i < docKeys.length; i++) {
      const docKey = docKeys[i];
      const docValue = documents[docKey];

      let pageContent: string;
      if (docValue.pageContent) {
        pageContent = docValue.pageContent;
      } else {
        const docFilepath = path.join(rootDirAbs, docKey);

        const fileExt = path.extname(docFilepath).substring(1);
        if (fileExt !== "txt") {
          console.warn(
            chalk.yellowBright(`File ${docKey} is not a txt file. Skipping...`)
          );
          continue;
        }

        if (!fs.existsSync(docFilepath)) {
          console.warn(
            chalk.yellowBright(`File ${docFilepath} doesn't exist. Skipping...`)
          );
          continue;
        }
        pageContent = fs.readFileSync(docFilepath, { encoding: "utf-8" });
      }

      const _fileMetadata = {
        ...metadata,
        ...docValue.metadata,
        source: docKey,
      };

      const fileMetadata: Record<string, string> = {};
      Object.keys(_fileMetadata).forEach((k) => {
        fileMetadata[kebabCase(k)] = (_fileMetadata as any)[k];
      });

      // upload file to S3 with metadata
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: options.uploadBucket,
          Key: `${options.uploadKeyPrefix}/${docKey}`,
          Metadata: fileMetadata,
          Body: pageContent,
        },
        queueSize: 4, // optional concurrency configuration
        partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
        leavePartsOnError: false, // optional manually handle dropped parts
      });
      upload.on("httpUploadProgress", (progress) => {
        context.ui.spinner.text = `\t[${i + 1}/${docKeys.length}] ${
          progress.Key
        }: ${progress.part}/${progress.total}`;
      });

      context.ui.spinner.text = `Uploading ${options.uploadBucket}/${options.uploadKeyPrefix}/${docKey}`;

      await upload.done();
      context.ui.spinner.text = `\t[${i + 1}/${docKeys.length}] ${docKey}`;
    }
    context.ui.spinner.succeed(`${docKeys.length} documents uploaded`);
  };
}
