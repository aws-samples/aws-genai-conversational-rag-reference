/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

/**
 * NOTE: this utility is defined separately from other BedrockModel
 *       types so that it can be used by our galileo-cli script without
 *       depending on the base types defined in galileo-sdk; it should
 *       be moved back into index.ts when it is migrated into galileo-sdk
 */

/**
 * Generates a forrmated UUID string of given Bedrock model id
 */
export function formatBedrockModelUUID(modelId: string): string {
  return `bedrock::${modelId}`;
}
