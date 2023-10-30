/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { Flags } from "@oclif/core";
import { FlagInput } from "@oclif/core/lib/interfaces/parser";

export interface BaseDocumentCommandFlags {
  profile?: string;
  region?: string;
  skipConfirmations?: boolean;
}

export interface DocumentUploadCommandFlags extends BaseDocumentCommandFlags {
  bucketName?: string;
  uploadKeyPrefix?: string;
  metadataFile?: string;
}

const baseFlags: FlagInput<BaseDocumentCommandFlags> = {
  profile: Flags.string({
    aliases: ["p"],
    description:
      "The profile set up for you AWS CLI (associated with your AWS account)",
  }),
  region: Flags.string({
    aliases: ["r"],
    description: "The region you deployed your application",
  }),
};

export const documentUploadCommandFlags: FlagInput<DocumentUploadCommandFlags> =
  {
    ...baseFlags,
    bucketName: Flags.string({
      description: "The S3 Bucket you want to upload your documents",
    }),
    uploadKeyPrefix: Flags.string({
      description: "The S3 upload key prefix",
    }),
    metadataFile: Flags.string({
      description: "The file path pointing to your metadata.json",
    }),

    skipConfirmations: Flags.boolean({
      aliases: ["yes", "non-interactive"],
      description:
        "Non-interactive mode. (You need to supply all other flags).",
      relationships: [
        {
          type: "all",
          flags: [
            "profile",
            "region",
            "bucketName",
            "uploadKeyPrefix",
            "metadataFile",
          ],
        },
      ],
    }),
  };
