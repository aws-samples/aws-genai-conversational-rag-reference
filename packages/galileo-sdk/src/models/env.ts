/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /** Stringified FoundationModelRecord mapping of deployed models for lookup */
      FOUNDATION_MODEL_INVENTORY_SECRET: string;

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
  }
}

export const FOUNDATION_MODEL_INVENTORY_SECRET = 'FOUNDATION_MODEL_INVENTORY_SECRET';
export const FOUNDATION_MODEL_CROSS_ACCOUNT_ROLE_ARN = 'FOUNDATION_MODEL_CROSS_ACCOUNT_ROLE_ARN';
