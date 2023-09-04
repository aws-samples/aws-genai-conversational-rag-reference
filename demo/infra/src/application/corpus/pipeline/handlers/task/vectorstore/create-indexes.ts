/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Logger, injectLambdaContext } from "@aws-lambda-powertools/logger";
import middy from "@middy/core";
import errorLogger from "@middy/error-logger";
import inputOutputLogger from "@middy/input-output-logger";
import { ENV } from "corpus-logic/lib/env";
import { indexVectorStore } from "corpus-logic/lib/vectorstore/management";
import { State } from "../../../types";

const logger = new Logger();

async function lambdaHandler(state: State): Promise<State> {
  logger.info({ message: "corpus-logic env", env: ENV });

  logger.info("Indexing vector store...");
  await indexVectorStore(
    state.VectorStoreManagement?.IndexesToCreate as any,
    state.VectorStoreManagement?.DropOtherIndexes
  );
  logger.info("Vector store successfully indexed");

  // pass-through payload
  return state;
}

export const handler = middy<State, {}, Error, any>(lambdaHandler)
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(inputOutputLogger())
  .use(
    errorLogger({
      logger(error) {
        logger.error("Task failed with error:", error as Error);
      },
    })
  );

export default handler;
