/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import execa from "execa";

export type ExecaTask = Parameters<typeof execa.commandSync>;
export type ExecaCommandReturn = ReturnType<typeof execa.commandSync>;
export type CdkContextValue = string | string[] | number | boolean;

export interface CredentialsParams {
  readonly profile: string;
  readonly region?: string;
}

export enum DeployModelOptions {
  SAME_REGION = 0,
  DIFFERENT_REGION = 1,
  ALREADY_DEPLOYED = 2,
  CROSS_ACCOUNT = 3,
  NO = 4,
}
