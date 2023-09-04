/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Logger } from "@aws-lambda-powertools/logger";
import { LogLevel } from "@aws-lambda-powertools/logger/lib/types";
import {
  ChainedRequestInput,
  OperationResponse,
  ServerErrorResponseContent,
} from "api-typescript-runtime";

const logger = new Logger({
  logLevel: (process.env.LOG_LEVEL || "INFO") as LogLevel,
});

export interface ILoggerInterceptorContext {
  readonly logger: Logger;
}

/**
 * Interceptor that add logging use `@aws-lambda-powertools/logger`
 *
 * @see https://awslabs.github.io/aws-lambda-powertools-typescript/latest/core/logger
 */
export const loggerInterceptor = async <
  RequestParameters,
  RequestArrayParameters,
  RequestBody,
  Response extends OperationResponse<number, any>
>(
  request: ChainedRequestInput<
    RequestParameters,
    RequestArrayParameters,
    RequestBody,
    Response
  >
): Promise<Response | OperationResponse<500, ServerErrorResponseContent>> => {
  try {
    logger.addContext(request.context);
    logger.debug("Event:", JSON.stringify(request.event));
    request.interceptorContext.logger = logger;

    const response = await request.chain.next(request);
    logger.debug("Success:", JSON.stringify(response));
    return response;
  } catch (error: any) {
    logger.error("Failed:", error);
    throw error;
  }
};
