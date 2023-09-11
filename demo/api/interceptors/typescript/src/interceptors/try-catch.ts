/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  ChainedRequestInput,
  OperationResponse,
  ServerErrorResponseContent,
} from "api-typescript-runtime";
import { ApiResponse } from "../utils/api-response";

/**
 * Interceptor to wrap invocations in a try/catch, returning a 500 error for any unhandled exceptions.
 */
export const tryCatchInterceptor = async <
  RequestParameters,
  RequestBody,
  Response extends OperationResponse<number, any>
>(
  request: ChainedRequestInput<RequestParameters, RequestBody, Response>
): Promise<Response | OperationResponse<500, ServerErrorResponseContent>> => {
  try {
    return await request.chain.next(request);
  } catch (e: any) {
    console.error(e);

    if ("statusCode" in e) {
      return e;
    }
    const errorMessage = e.message ?? `${e}`;
    return ApiResponse.internalFailure({ errorMessage });
  }
};
