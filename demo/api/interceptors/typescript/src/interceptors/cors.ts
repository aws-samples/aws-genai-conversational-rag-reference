/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { ChainedRequestInput, OperationResponse } from "api-typescript-runtime";

export type ResponseHeaders = { [key: string]: string };

// Allow all origins for easy development (ie we permit localhost as well as the cloudfront distribution)
// TODO: Consider tightening to just the cloudfront distribution for production stages
export const CORS_HEADERS: ResponseHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

/**
 * Interceptor for adding cross origin resource sharing (CORS) headers to the response
 */
export const corsInterceptor = async <
  RequestParameters,
  RequestBody,
  Response extends OperationResponse<number, any>
>(
  request: ChainedRequestInput<RequestParameters, RequestBody, Response>
): Promise<Response> => {
  const result = await request.chain.next(request);
  return {
    ...result,
    headers: {
      ...result.headers,
      ...CORS_HEADERS,
    },
  };
};
