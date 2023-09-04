/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  ClientErrorResponseContent,
  NotFoundErrorResponseContent,
  OperationResponse,
  ServerErrorResponseContent,
  NotAuthorizedErrorResponseContent,
  ServerTemporaryErrorResponseContent,
} from "api-typescript-runtime";

/**
 * Helpers for constructing api responses
 */
export class ApiResponse {
  /**
   * A successful response
   */
  public static success = <T>(body: T): OperationResponse<200, T> => ({
    statusCode: 200,
    body,
  });

  /**
   * A response which indicates a client error
   */
  public static badRequest = (
    body: ClientErrorResponseContent
  ): OperationResponse<400, ClientErrorResponseContent> => ({
    statusCode: 400,
    body,
  });

  /**
   * A response which indicates the requested resource was not found
   */
  public static notFound = (
    body: NotFoundErrorResponseContent
  ): OperationResponse<404, NotFoundErrorResponseContent> => ({
    statusCode: 404,
    body,
  });

  /**
   * A response which indicates the caller is not authorised to perform the operation or access the resource
   */
  public static notAuthorized = (
    body: NotAuthorizedErrorResponseContent
  ): OperationResponse<403, NotFoundErrorResponseContent> => ({
    statusCode: 403,
    body,
  });

  /**
   * A response to indicate a server error
   */
  public static internalFailure = (
    body: ServerErrorResponseContent
  ): OperationResponse<500, ServerErrorResponseContent> => ({
    statusCode: 500,
    body,
  });

  /**
   * A response to indicate a temporary server error, for example failure to acquire a lock
   */
  public static temporaryFailure = (
    body: ServerTemporaryErrorResponseContent
  ): OperationResponse<503, ServerTemporaryErrorResponseContent> => ({
    statusCode: 503,
    body,
  });
}
