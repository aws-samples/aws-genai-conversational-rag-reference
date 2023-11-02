/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { FOUNDATION_MODEL_INVENTORY_SECRET } from '@aws/galileo-sdk/lib/models';

export interface IProcessEnv {
  SEARCH_URL: string;
  /** Stringified FoundationModelRecord mapping of deployed models for lookup */
  // @ts-ignore - duplicate key
  [FOUNDATION_MODEL_INVENTORY_SECRET]: string;
  /** DynamoDB table name used to chat persistence */
  CHAT_MESSAGE_TABLE_NAME: string;
  /** GSI index name for chat message table */
  CHAT_MESSAGE_TABLE_GSI_INDEX_NAME: string;
  /**
   * List of cognito group names to allow "Admin" access (as stringified JSON)
   */
  ADMIN_GROUPS: string;
  /**
   * Domain of chat agent used to provide context for its role
   * @example "Legal"
   */
  DOMAIN: string;
  /**
   * Role arn used for access foundation model inventory and invoking model endpoints.
   *
   * Used in developer accounts during development to support reusing the primary development account
   * model deployments.
   *
   * If defined, the related resource calls (inventory secret and model invocation) will assume this role.
   * Otherwise, the default lambda execution role will used.
   */
  FOUNDATION_MODEL_CROSS_ACCOUNT_ROLE_ARN?: string;
}

export type ILambdaEnvironment = IProcessEnv & { [key: string]: string };

export const ENV: IProcessEnv = {
  SEARCH_URL: process.env.SEARCH_URL!,
  [FOUNDATION_MODEL_INVENTORY_SECRET]: process.env[FOUNDATION_MODEL_INVENTORY_SECRET]!,
  CHAT_MESSAGE_TABLE_NAME: process.env.CHAT_MESSAGE_TABLE_NAME!,
  CHAT_MESSAGE_TABLE_GSI_INDEX_NAME: process.env.CHAT_MESSAGE_TABLE_GSI_INDEX_NAME!,
  ADMIN_GROUPS: process.env.ADMIN_GROUPS!,
  DOMAIN: process.env.DOMAIN!,
  FOUNDATION_MODEL_CROSS_ACCOUNT_ROLE_ARN: process.env.FOUNDATION_MODEL_CROSS_ACCOUNT_ROLE_ARN,
};
