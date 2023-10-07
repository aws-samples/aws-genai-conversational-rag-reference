/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

/**
 * Pre-defined foundation model ids.
 */
export enum FoundationModelIds {
  // Falcon
  FALCON_OA_40B = 'falcon-oa-40b',
  FALCON_OA_7B = 'falcon-oa-7b',
  FALCON_LITE = 'falcon-lite',

  // Bedrock
  BEDROCK = 'bedrock',
}

/**
 * List of pre-defined foundation models to deploy automatically deploy.
 */
export const DEFAULT_PREDEFINED_FOUNDATION_MODEL_LIST: FoundationModelIds[] = [
  // FoundationModelIds.FALCON_7B,
  FoundationModelIds.FALCON_LITE,
];
