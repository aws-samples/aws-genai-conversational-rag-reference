/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

export * from "./errors";

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

export interface DocumentMetadata {
  readonly rootDir: string;
  readonly metadata: {
    readonly domain: string;
    [k: string]: string;
  };
  readonly documents: {
    [k: string]: {
      pageContent?: string;
      metadata?: {
        [k: string]: string;
      };
    };
  };
}

export interface LoadDocumentMetadataResult {
  readonly documentMetadata: DocumentMetadata;
  readonly metadataFile?: string;
}

export interface NameArnTuple {
  readonly name: string;
  readonly arn: string;
}

export interface Tag {
  readonly key: string;
  readonly value: string;
}
