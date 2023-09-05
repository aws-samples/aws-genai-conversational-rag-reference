/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Tracer } from "@aws-lambda-powertools/tracer";
import {
  ChainedRequestInput,
  OperationResponse,
  ServerErrorResponseContent,
} from "api-typescript-runtime";

const tracer = new Tracer();

export interface ITracerInterceptorContext {
  readonly tracer: Tracer;
}

/**
 * Interceptor that add tracing use `@aws-lambda-powertools/tracer`
 *
 * @see https://awslabs.github.io/aws-lambda-powertools-typescript/latest/core/tracer/#lambda-handler
 */
export const tracerInterceptor = async <
  RequestParameters,
  RequestBody,
  Response extends OperationResponse<number, any>
>(
  request: ChainedRequestInput<RequestParameters, RequestBody, Response>
): Promise<Response | OperationResponse<500, ServerErrorResponseContent>> => {
  const segment = tracer.getSegment(); // This is the facade segment (the one that is created by AWS Lambda)
  let subsegment;
  if (segment) {
    // Create subsegment for the function & set it as active
    subsegment = segment.addNewSubsegment(`## ${process.env._HANDLER}`);
    tracer.setSegment(subsegment);
  }

  try {
    // Add the response as metadata
    tracer.addResponseAsMetadata({}, process.env._HANDLER);
    request.interceptorContext.tracer = tracer;

    return await request.chain.next(request);
  } catch (error: any) {
    // Add the error as metadata
    tracer.addErrorAsMetadata(error as Error);
    throw error;
  } finally {
    if (segment && subsegment) {
      // Close subsegment (the AWS Lambda one is closed automatically)
      subsegment.close();
      // Set back the facade segment as active again
      tracer.setSegment(segment);
    }
  }
};
