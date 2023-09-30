/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { fromIni } from "@aws-sdk/credential-providers";

export interface CdkBootstrapInfoRequestOptions {
  readonly profile: string;
  readonly region: string;

  /**
   * The CDK Boostrap qualifier.
   * Use this parameter if you bootstrapped CDK with a custom qualifier.
   * @default "hnb659fds"
   */
  readonly qualifier?: string;
}

export interface CdkBootstrapInfo {
  readonly version: string;
  readonly lastUpdated: Date;
}

const DEFAULT_QUALIFIER = "hnb659fds";

/**
 * Gets the CDK bootstrap info for an AWS account used by the passed profile
 * in the specified region.
 *
 * @returns The bootstrap info, or `undefined` if the account is not bootstrapped.
 */
export const getCdkBootstrapInfo = async (
  options: CdkBootstrapInfoRequestOptions
): Promise<CdkBootstrapInfo | undefined> => {
  const { profile, region } = options;
  const client = new SSMClient({
    credentials: fromIni({
      profile,
    }),
    region,
  });

  const ssmParamResp = await client.send(
    new GetParameterCommand({
      Name: `/cdk-bootstrap/${options.qualifier ?? DEFAULT_QUALIFIER}/version`,
    })
  );

  if (ssmParamResp.Parameter == null) {
    return;
  }

  return {
    version: ssmParamResp.Parameter!.Value!,
    lastUpdated: ssmParamResp.Parameter!.LastModifiedDate!,
  };
};
