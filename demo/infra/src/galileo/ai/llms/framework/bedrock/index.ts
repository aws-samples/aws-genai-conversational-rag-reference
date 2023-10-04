/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import {
  IModelAdapter,
  IModelInfo,
  IModelInfoProvider,
  Kwargs,
  ModelFramework,
} from "@aws/galileo-sdk/lib/models";
import { Construct, IConstruct } from "constructs";
import { BEDROCK_REGION } from "./ids";
import { formatBedrockModelUUID } from "./utils";

export * from "./ids";

export interface BedrockModelProps {
  /**
   * UUID of the model within the application. If multiple variants of the same
   * modelId are deployed, this will be necessary to discern between them.
   * > This is the id used throughout galileo to identify the model
   * @default `modelId` - will default to the model id
   */
  readonly modelUUID?: string;
  /**
   * Bedrock model id
   */
  readonly modelId: string;
  /**
   * Display name of the model
   */
  readonly displayName?: string;
  /**
   * Bedrock endpoint region
   * @default undefined - Will use parent stack region
   */
  readonly region?: string;
  /**
   * Role to assume when invoking the bedrock service.
   * - Used for cross-account development only
   * @development
   * @experimental
   * @default undefined - Use the execution role of the invoker
   */
  readonly roleArn?: string;

  /** Default model kwargs to invoke model */
  readonly modelKwargs?: Kwargs;

  /** Override the endpoint url for variant preview access */
  readonly endpointUrl?: string;

  /**
   * Adapter for model to customize prompt/content handling.
   * - Since Bedrock supports multiple models, each might be trained and optimized
   * with different configurations. Use this to adjust based on the model.
   * @default undefined - Will just use default handling
   * TODO: default bedrock adapter based on model id
   */
  readonly adapter?: IModelAdapter;
}

/**
 * Bedrock service model integration, which does not actually deploy anything
 * but it wires up the model configuration into the inventory to integrate
 * with the rest of the application at runtime.
 */
export class BedrockModel extends Construct implements IModelInfoProvider {
  static formatUUID = formatBedrockModelUUID;

  readonly modelInfo: IModelInfo;

  constructor(scope: IConstruct, id: string, props: BedrockModelProps) {
    super(scope, id);

    this.modelInfo = {
      uuid: props.modelUUID ?? props.modelId,
      modelId: props.modelId,
      framework: {
        type: ModelFramework.BEDROCK,
        modelId: props.modelId,
        region: props.region ?? BEDROCK_REGION,
        modelKwargs: props.modelKwargs,
        endpointUrl: props.endpointUrl,
      },
      adapter: props.adapter,
    };
  }
}
