/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { Command } from "@oclif/core";
import chalk from "chalk";
import prompts from "prompts";
import accountUtils from "../../../lib/account-utils";
import context from "../../../lib/context";
import { loadMetadataAndValidate } from "../../../lib/document";
import galileoPrompts from "../../../lib/prompts";
import { DocumentMetadata } from "../../../lib/types";
import { documentUploadCommandFlags } from "../flags";

export default class DocumentUploadCommand extends Command {
  static summary =
    "Uploads documents based on passed metadata to the application's S3 bucket";
  static description = "Upload documents";

  static exmaples = [
    "galileo-cli document upload --profile=myProfile --region=ap-southeast-1 --metadata=/path/to/metadata.json",
  ];

  static flags = documentUploadCommandFlags;

  private onPromptCancel() {
    this.exit();
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(DocumentUploadCommand);

    //
    const { profile, region } = context.cachedAnswers(
      await prompts(
        [
          galileoPrompts.profile(flags.profile),
          galileoPrompts.awsRegion({
            initialVal: flags.region,
          }),
        ],
        { onCancel: this.onPromptCancel }
      )
    );

    const { filePath: metadataFile } = context.cachedAnswers(
      await prompts(
        [
          galileoPrompts.filePathPrompt({
            initialVal: flags.metadataFile,
            what: "metadata file",
          }),
        ],
        { onCancel: this.onPromptCancel }
      )
    );

    // make sure that passed metadata conforms with the expected format
    context.ui.newSpinner().start("Validating metadata");
    let documentMetadata: DocumentMetadata | undefined;
    try {
      documentMetadata = loadMetadataAndValidate(metadataFile);
      context.ui.spinner.succeed("Validating metadata: OK");
    } catch (err) {
      if (err instanceof Error) {
        context.ui.spinner.fail(
          `Error validating metadata: ${chalk.redBright(
            err.message
          )}. Quitting...`
        );
      } else {
        context.ui.spinner.fail("Error validating metadata. Quitting...");
      }
      this.exit(1);
    }

    context.ui.newSpinner().start("Loading buckets");
    const bucketNames = await accountUtils.listBuckets({ profile, region });
    context.ui.spinner.succeed();

    // collect info on target (bucket, key prefix)
    const { uploadBucket, uploadKeyPrefix } = context.cachedAnswers(
      await prompts(
        [
          galileoPrompts.bucketPicker(
            bucketNames.map((b) => ({
              bucketName: b,
            })),
            flags.bucketName
          ),
          galileoPrompts.uploadKeyPrefix(flags.uploadKeyPrefix),
        ],
        { onCancel: this.onPromptCancel }
      )
    );

    // confirm upload
    if (!flags.skipConfirmations) {
      const { confirmed } = context.cachedAnswers(
        await prompts(
          galileoPrompts.confirmExec({
            message: `Confirm to upload ${
              Object.keys(documentMetadata!.documents).length
            } documents?`,
          })
        )
      );

      if (!confirmed) {
        console.log(chalk.cyanBright("Quitting..."));
        this.exit();
      }
    }

    await accountUtils.uploadDocuments({
      documentMetadata: documentMetadata!,
      metadataFilepath: metadataFile,
      profile,
      region,
      uploadBucket,
      uploadKeyPrefix,
    });

    context.ui.newSpinner().start("Loading step functions");
    const stepFunctions = await accountUtils.listStepfunctions({
      profile,
      region,
    });
    context.ui.spinner.succeed();

    const { sfn } = context.cachedAnswers(
      await prompts(galileoPrompts.sfnPicker(stepFunctions))
    );

    context.ui.newSpinner().start("Triggering embedding workflow");
    await accountUtils.triggerWorkflow({ profile, region }, sfn);
    context.ui.spinner.succeed();
  }
}
