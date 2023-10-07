/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { isEmpty } from 'lodash';
import { CLAUDE_V2_ADAPTER } from './anthropic/claude.js';
import { ModelAdapter } from '../adapter.js';
import { IModelInfo, isBedrockFramework } from '../types.js';

/**
 * Get the default model adapter based on framework and model info.
 * @param modelInfo
 * @returns
 */
export function resolveModelAdapter(modelInfo: IModelInfo): ModelAdapter {
  if (modelInfo.adapter == null || isEmpty(modelInfo.adapter)) {
    if (isBedrockFramework(modelInfo.framework)) {
      return resolveBedrockModelAdapter(modelInfo.framework.modelId);
    }
  }

  return new ModelAdapter(modelInfo.adapter);
}

export function resolveBedrockModelAdapter(modelId: string): ModelAdapter {
  const [provider, _modelName] = modelId.split('.', 2);

  if (provider === 'anthropic') {
    return new ModelAdapter(CLAUDE_V2_ADAPTER);
  }

  return new ModelAdapter();
}
