/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import fs from "node:fs";
import path from "node:path";
import { parse as csvParse } from "csv-parse/sync";
import {
  cognito,
  CreateCognitoUserRequest,
  DeleteCognitoUserRequest,
  CognitoUserInfo,
} from "./cognito";
import { getAWSAccountId } from "./get-aws-account-id";
import {
  CdkBootstrapInfo,
  CdkBootstrapInfoRequestOptions,
  getCdkBootstrapInfo,
} from "./get-bootstrap-info";
import { UploadDocumentsRequest, s3 } from "./s3";
import { stepfunctions } from "./sfn";
import context from "../context";
import { CredentialsParams } from "../types";

const CACHE_KEYS = {
  ACCOUNTID: "awsAccountId",
};

export namespace accountUtils {
  /**
   * Retrieves the AWS Account ID.
   * @param profile The AWS profile setup for AWS CLI.
   * @returns The 10-digit AWS Account ID.
   */
  export const retrieveAccount = async (profile: string) => {
    if (profile !== "default") {
      const accountId = context.cache.getItem(CACHE_KEYS.ACCOUNTID) as string;
      if (accountId != null) {
        return accountId;
      }
    }

    const accountId = await getAWSAccountId({ profile });
    context.cache.setItem(CACHE_KEYS.ACCOUNTID, accountId);

    return accountId;
  };

  export const retrieveCdkBootstrapInfo = async (
    options: CdkBootstrapInfoRequestOptions
  ) => {
    const CACHE_KEY = `bootstrapinfo-${options.region}`;
    // if profile is default --> always check
    // otherwise - cache
    if (options.profile !== "default") {
      const regionBootstrapCached = context.cache.getItem(
        CACHE_KEY
      ) as CdkBootstrapInfo;
      if (regionBootstrapCached != null) {
        return regionBootstrapCached;
      }
    }

    const cdkBootstrapInfo = await getCdkBootstrapInfo(options);
    if (cdkBootstrapInfo != null) {
      context.cache.setItem(CACHE_KEY, cdkBootstrapInfo);
    }

    return cdkBootstrapInfo;
  };

  export const listCognitoUserPools = async (
    profile: string,
    region: string
  ) => {
    return cognito.listUserPools(profile, region);
  };

  export const createCognitoUser = async (
    options: CreateCognitoUserRequest
  ) => {
    return cognito.createCognitoUser(options);
  };

  export const bulkCreateCognitoUsers = async (
    options: CredentialsParams & {
      csvFile: string;
      userPoolId: string;
      group?: string;
    }
  ) => {
    const { profile, region, userPoolId, csvFile, group } = options;

    // check if file exists
    let csvFilePath = csvFile;
    if (!path.isAbsolute(csvFilePath)) {
      // if it's relative, get the path relative to CWD
      csvFilePath = path.join(process.cwd(), csvFile);
    }

    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`Passed CSV file "${csvFile} doesn't exist!`);
    }

    const csvFileContent = fs.readFileSync(csvFilePath, { encoding: "utf-8" });

    let records = csvParse(csvFileContent, {
      columns: ["username", "email", "group"],
      skipEmptyLines: true,
      from_line: 2, // skip header
      delimiter: ",",
    }) as CognitoUserInfo[];

    if (group != null) {
      records = records.map((user) => {
        // if user group is supplied from the caller (prompt/flag), override group
        return { ...user, group: group };
      });
    }

    await cognito.bulkCreateCognitoUsers({
      profile,
      region,
      userPoolId,
      users: records,
    });
  };

  export const deleteCognitoUser = async (
    options: DeleteCognitoUserRequest
  ) => {
    return cognito.deleteCognitoUser(options);
  };

  export const listBuckets = async (credentials: CredentialsParams) => {
    return s3.listBuckets(credentials);
  };

  export const uploadDocuments = async (options: UploadDocumentsRequest) => {
    return s3.uploadDocuments(options);
  };

  export const listStepfunctions = async (credentials: CredentialsParams) => {
    return stepfunctions.listStateMachines(credentials);
  };

  export const triggerWorkflow = async (
    credentials: CredentialsParams,
    arn: string
  ) => {
    return stepfunctions.triggerWorkflow(credentials, arn);
  };
}

export default accountUtils;

export {
  CdkBootstrapInfo,
  CdkBootstrapInfoRequestOptions,
} from "./get-bootstrap-info";
