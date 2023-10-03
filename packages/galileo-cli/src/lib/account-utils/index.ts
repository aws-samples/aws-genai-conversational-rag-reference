/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import {
  CreateCognitoUserRequest,
  listUserPools,
  createCognitoUser as _createCognitoUser,
  deleteCognitoUser as _deleteCognitoUser,
  DeleteCognitoUserRequest,
} from "./cognito";
import { getAWSAccountId } from "./get-aws-account-id";
import {
  CdkBootstrapInfo,
  CdkBootstrapInfoRequestOptions,
  getCdkBootstrapInfo,
} from "./get-bootstrap-info";
import context from "../context";

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
    return listUserPools(profile, region);
  };

  export const createCognitoUser = async (
    options: CreateCognitoUserRequest
  ) => {
    return _createCognitoUser(options);
  };

  export const deleteCognitoUser = async (
    options: DeleteCognitoUserRequest
  ) => {
    return _deleteCognitoUser(options);
  };
}

export default accountUtils;

export {
  CdkBootstrapInfo,
  CdkBootstrapInfoRequestOptions,
} from "./get-bootstrap-info";
