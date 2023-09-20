/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { FOUNDATION_MODEL_CROSS_ACCOUNT_ROLE_ARN } from './env.js';
import { getLogger } from '../common/index.js';

const logger = getLogger(__filename);

type AwsCredentialIdentityProvider = ReturnType<typeof fromTemporaryCredentials>

export function crossAccountCredentials(assumeRole: string): AwsCredentialIdentityProvider {
  return fromTemporaryCredentials({
    params: {
      RoleArn: assumeRole,
    },
  });
}

/**
 *
 * @returns {AwsCredentialIdentityProvider | undefined} If FOUNDATION_MODEL_CROSS_ACCOUNT_ROLE_ARN env is defined, it will
 * assume the role defined with temporary credentials to perform sdk calls, otherwise will return undefined to
 * use the default execution role credentials.
 */
export function resolveFoundationModelCredentials(assumeRole?: string): AwsCredentialIdentityProvider | undefined {
  const roleToAssume = assumeRole ?? process.env[FOUNDATION_MODEL_CROSS_ACCOUNT_ROLE_ARN];
  if (roleToAssume && roleToAssume !== '') {
    logger.info({ message: 'CrossAccount foundation model credentials', key: FOUNDATION_MODEL_CROSS_ACCOUNT_ROLE_ARN, assumeRole: roleToAssume });

    return crossAccountCredentials(roleToAssume);
  }

  // User default execution role credentials
  return undefined;
}
