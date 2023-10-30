/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Logger } from "@aws-lambda-powertools/logger";
import { ENV } from "corpus-logic/lib/env";
import { indexVectorStore } from "corpus-logic/lib/vectorstore/management";

const logger = new Logger();

async function main(): Promise<void> {
  logger.info({ message: "corpus-logic env", env: ENV });

  logger.info("Indexing vector store...");
  await indexVectorStore();
  logger.info("Vector store successfully indexed");
}

(async () => {
  await main();
})().catch(console.error);
