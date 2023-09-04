/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Signer } from '@aws-sdk/rds-signer';
import { envBool, getLogger } from '../../common';

const logger = getLogger(__filename);

export interface RDSConnConfig {
  readonly password: string;
  readonly engine: string;
  readonly port: number;
  readonly dbInstanceIdentifier: string;
  readonly host: string;
  readonly username: string;
}

export async function getRDSConnConfigFromSecret(secretId: string): Promise<RDSConnConfig> {
  const client = new SecretsManagerClient({});
  const secretJson =(await client.send(new GetSecretValueCommand({
    SecretId: secretId,
  }))).SecretString;

  if (secretJson == null) {
    throw new Error(`Failed to retrieve secret string value for ${secretId} - it was empty`);
  }

  const conn: RDSConnConfig = JSON.parse(secretJson);

  logger.debug({ message: 'getRDSConnConfigFromSecret:', config: { ...conn, password: '*****' } });

  return conn;
}

export interface GetRDSConnConfigInput {
  readonly secretId: string;
  readonly proxyEndpoint?: string;
  readonly iamAuthentication?: boolean;
}

export async function getRDSConnConfig(input: GetRDSConnConfigInput): Promise<RDSConnConfig> {
  logger.debug({ message: 'getRDSConnConfig:', input });
  let { host, password, ...rest } = await getRDSConnConfigFromSecret(input.secretId);

  // https://catalog.us-east-1.prod.workshops.aws/workshops/2a5fc82d-2b5f-4105-83c2-91a1b4d7abfe/en-US/3-intermediate/rds-proxy/task3
  if (input.proxyEndpoint) {
    host = input.proxyEndpoint;
  }

  if (input.iamAuthentication) {
    const signer = new Signer({
      hostname: host,
      port: rest.port,
      username: rest.username,
    });
    password = await signer.getAuthToken();
  }

  return {
    ...rest,
    host,
    password,
  };
}

export interface IRdsConnProcessEnv {
  /** Name or Arn of secret storing RDS pgvector connection config */
  RDS_PGVECTOR_STORE_SECRET: string;
  /** Proxy endpoint for RDS pgvector connection */
  RDS_PGVECTOR_PROXY_ENDPOINT?: string;
  /** Indicates if IAM authentication is required for RDS connection */
  RDS_PGVECTOR_IAM_AUTH?: string;
  /** Indicates if Transport Layer Security (TLS) is enabled */
  RDS_PGVECTOR_TLS_ENABLED?: string;
}

export function resolveRdsConnProcessEnvs () {
  return {
    RDS_PGVECTOR_STORE_SECRET: process.env.RDS_PGVECTOR_STORE_SECRET!,
    RDS_PGVECTOR_PROXY_ENDPOINT: process.env.RDS_PGVECTOR_PROXY_ENDPOINT,
    RDS_PGVECTOR_IAM_AUTH: envBool('RDS_PGVECTOR_IAM_AUTH', false),
    RDS_PGVECTOR_TLS_ENABLED: envBool('RDS_PGVECTOR_TLS_ENABLED', false),
  } as const;
}
