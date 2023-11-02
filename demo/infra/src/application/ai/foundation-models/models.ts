/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { ModelEULA } from '@aws/galileo-cdk/lib/ai/llms/framework/eula';
import { PredefinedFoundationModels, PredefinedFoundationModelsProps } from '@aws/galileo-cdk/lib/ai/predefined';
import { IFoundationModelInventory } from '@aws/galileo-sdk/lib/models';
import { Construct } from 'constructs';

export { IFoundationModelInventory };

export class FoundationModels extends PredefinedFoundationModels {
  constructor(scope: Construct, id: string, props: PredefinedFoundationModelsProps) {
    super(scope, id, props);

    // NB: add additional LLM/FoundationModels here to deploy
    // See PredefinedFoundationModels class in @aws/galileo-cdk package for examples

    //////////////////////////////////////////////////////////
    // Bedrock - not actual deployments but wire up to the inventory for integration
    //////////////////////////////////////////////////////////
    // new BedrockModel(this, _id, {
    //   modelId: "anthropic.claude-v2",
    //   region: bedrockRegion,
    // });

    //////////////////////////////////////////////////////////
    // Existing Models - provide the model info to integrate an existing model
    // The ExistingLLM construct simply exposes the model info to integrate with inventory
    //////////////////////////////////////////////////////////
    // NB: Here is example reference of how to integrate with existing model
    // new ExistingLLM(this, "MyExistingLLM", {
    //   modelId: "example",
    //   uuid: "existing.model",
    //   name: "Existing Model",
    //   framework: {
    //     type: ModelFramework.SAGEMAKER_ENDPOINT,
    //     endpointName: "endpointName",
    //     endpointRegion: "endpointRegion",
    //     endpointKwargs: {},
    //     modelKwargs: {},
    //   },
    //   constraints: {
    //     maxTotalTokens: 2048,
    //     maxInputLength: 2047,
    //   },
    //   adapter: {},
    // });

    // Automatically setup model EULA check - if enabled in context
    new ModelEULA(
      this,
      'EULA',
      this.modelProviders.map((v) => v.modelInfo),
    );
  }
}
