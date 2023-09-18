/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

/**
 * NOTE: these constants are stored separately from other BedrockModel
 *       types so that they can be used by our galileo-cli script without
 *       depending on the base types defined in galileo-sdk; they should
 *       be moved back into index.ts when they are migrated into galileo-sdk
 */
export enum BedrockModelIds {
  TITAN_TEXT_LARGE = "amazon.titan-tg1-large",
  TITAN_TEXT_XL = "amazon.titan-tg1-xlarge",
  // TITAN_TEXT_EMBEDDINGS = "amazon.titan-e1t-medium", // NB: Embedding model not supported with current I/O of inference flow

  ANTHROPIC_CLAUDE_V2 = "anthropic.claude-v2",
  ANTHROPIC_CLAUDE_V2_100k = "anthropic.claude-v2-100k",
  ANTHROPIC_CLAUDE_V1 = "anthropic.claude-v1",
  ANTHROPIC_CLAUDE_V1_INSTANT = "anthropic.claude-instant-v1",
  ANTHROPIC_CLAUDE_V1_100K = "anthropic.claude-v1-100k",

  AI21_JURASSIC_MID = "ai21.j2-mid",
  AI21_JURASSIC_ULTRA = "ai21.j2-ultra",
  AI21_JURASSIC_JUMBO_INSTRUCT = "ai21.j2-jumbo-instruct",
  AI21_JURASSIC_GRANDE_INSTRUCT = "ai21.j2-grande-instruct",
}

export const BEDROCK_REGION = "us-east-1";
export const BEDROCK_DEFAULT_MODEL = BedrockModelIds.TITAN_TEXT_LARGE;
