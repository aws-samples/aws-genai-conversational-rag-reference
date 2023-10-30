/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { Command } from "@oclif/core";
import chalk from "chalk";
import prompts from "prompts";
import accountUtils from "../../../lib/account-utils";
import context from "../../../lib/context";
import { loadDocumentMetadata } from "../../../lib/document";
import galileoPrompts from "../../../lib/prompts";
import {
  DocumentMetadata,
  DocumentMetadataLoaderError,
  DocumentValidationError,
} from "../../../lib/types";
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

    const { filePath: loaderOrMetaFilePath } = context.cachedAnswers(
      await prompts(
        [
          galileoPrompts.filePathPrompt({
            initialVal: flags.metadataFile,
            what: `${chalk.yellowBright(
              "metadata file"
            )} or the ${chalk.yellowBright(
              "the module that loads metadata (js/ts)"
            )}`,
          }),
        ],
        { onCancel: this.onPromptCancel }
      )
    );

    context.ui.newSpinner().start("Loading metadata");
    let documentMetadata: DocumentMetadata | undefined;
    let metadataFile: string | undefined;
    try {
      const loadResult = await loadDocumentMetadata(loaderOrMetaFilePath);
      documentMetadata = loadResult.documentMetadata;
      metadataFile = loadResult.metadataFile;
    } catch (err) {
      if (err instanceof DocumentValidationError) {
        context.ui.spinner.fail(
          `Error validating metadata: ${chalk.redBright(
            err.message
          )}. Quitting...`
        );
      } else if (err instanceof DocumentMetadataLoaderError) {
        context.ui.spinner.fail(
          `Error while loading metadata with loader: ${chalk.redBright(
            err.message
          )}. Quitting...`
        );
      } else {
        context.ui.spinner.fail("Error loading metadata. Quitting...");
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
    const executionArn = await accountUtils.triggerWorkflow(
      { profile, region },
      sfn
    );
    context.ui.spinner.succeed();

    console.log(
      `\nIndexing workflow started. To monitor, \x1B]8;;https://${region}.console.aws.amazon.com/states/home?region=${region}#/v2/executions/details/${executionArn}\x1B\\click this link.\x1B]8;;\x1B\\`
    );
  }
}
