/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { omit } from 'lodash';
import { Dict } from '../models/types.js';

/**
 * Omit bedrock model kwargs that are managed by the bedrock langchain integration.
 * @param kwargs
 * @returns
 */
export function omitManagedBedrockKwargs(kwargs: Dict): Dict {
  // https://github.com/langchain-ai/langchainjs/blob/005707e2e838c046227946f359e6c62ed2b3484b/langchain/src/util/bedrock.ts#L67
  return omit(kwargs, ['maxTokens', 'temperature', 'stopSequences']);
}
