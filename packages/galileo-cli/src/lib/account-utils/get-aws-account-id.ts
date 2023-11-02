/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';
import { CredentialsParams } from '../types';

export const getAWSAccountId = async (options: CredentialsParams): Promise<string> => {
  const { profile } = options;

  const client = new STSClient({
    credentials: fromIni({ profile }),
  });

  const callerIdentity = await client.send(new GetCallerIdentityCommand({}));
  return callerIdentity.Account!;
};
