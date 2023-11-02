/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { corsInterceptor } from './cors';
import {
  IDENTITY_INTERCEPTOR_IAM_ACTIONS,
  IIdentityInterceptorContext,
  IdentityInterceptorEnvironment,
  identityInterceptor,
} from './identity';
import { ILoggerInterceptorContext, loggerInterceptor } from './logger';
import { ITracerInterceptorContext, tracerInterceptor } from './tracer';
import { tryCatchInterceptor } from './try-catch';

export * from './cors';
export * from './identity';
export * from './logger';
export * from './tracer';
export * from './try-catch';

export const interceptors = [
  corsInterceptor,
  tryCatchInterceptor,
  loggerInterceptor,
  tracerInterceptor,
  identityInterceptor,
] as const;

export interface IInterceptorContext
  extends ILoggerInterceptorContext,
    IIdentityInterceptorContext,
    ITracerInterceptorContext {}

export const INTERCEPTOR_IAM_ACTIONS = [...IDENTITY_INTERCEPTOR_IAM_ACTIONS] as const;

export interface IInterceptorEnvironment extends IdentityInterceptorEnvironment {}
