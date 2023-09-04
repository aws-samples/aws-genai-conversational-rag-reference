/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  IFoundationModelInventory,
  IModelInfoProvider,
  isModelInfoProvider,
} from "@aws-galileo/galileo-sdk/lib/models";
import { Duration } from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import {
  DEFAULT_FOUNDATION_MODEL_ID,
  DEFAULT_PREDEFINED_FOUNDATION_MODEL_LIST,
  FoundationModelIds,
} from "./ids";
import { HFModelTarProvider } from "../../../galileo/ai/llms/framework";
import { ModelEULA } from "../../../galileo/ai/llms/framework/eula";
import {
  FalconLite,
  FalconLiteInstances,
} from "../../../galileo/ai/llms/models/falcon/lite";
import {
  HuggingFaceFalcon,
  HuggingFaceFalconInstances,
} from "../../../galileo/ai/llms/models/falcon/tgi";

export { IFoundationModelInventory };

export interface FoundationModelsProps {
  readonly vpc: IVpc;
  readonly foundationModels?: FoundationModelIds[];
  readonly defaultModelId?: string;
}

export class FoundationModels extends Construct {
  readonly inventory: IFoundationModelInventory;

  get deployedModelIds(): string[] {
    return Object.keys(this.inventory.models);
  }

  get defaultModelId(): string {
    return this.inventory.defaultModelId;
  }

  constructor(scope: Construct, id: string, props: FoundationModelsProps) {
    super(scope, id);

    // TODO: add endpoints to vpc, will need to setup VPC endpoints for cross-account development
    const { foundationModels, defaultModelId } = props;

    // HACK: DO NOT COMMIT
    HFModelTarProvider.of(this);

    const modelsToDeploy = new Set(
      foundationModels || DEFAULT_PREDEFINED_FOUNDATION_MODEL_LIST
    );

    // Pending legal approval on usage
    // const j2Ultra = new AI21Jurassic2Ultra(this, "AI21Jurassic2Ultra", {
    //   modelId: "j2-ultra",
    //   instanceType: AI21Jurassic2UltraInstanceType.MAX_CONTEXT_2048,
    // });
    // modelProviders.push(j2Ultra);

    //////////////////////////////////////////////////////////
    // Falcon (OpenAssistant)
    //////////////////////////////////////////////////////////
    if (modelsToDeploy.has(FoundationModelIds.FALCON_OA_40B)) {
      // https://github.com/aws/amazon-sagemaker-examples/blob/main/introduction_to_amazon_algorithms/jumpstart-foundation-models/text-generation-falcon.ipynb
      new HuggingFaceFalcon(this, "Falcon40b", {
        modelUUID: FoundationModelIds.FALCON_OA_40B,
        modelId: "OpenAssistant/falcon-40b-sft-top1-560",
        instanceType: HuggingFaceFalconInstances.G5_48XLARGE,
        displayName: "Falcon OA 40B",
      });
    }

    if (modelsToDeploy.has(FoundationModelIds.FALCON_OA_7B)) {
      new HuggingFaceFalcon(this, "Falcon7b", {
        modelUUID: FoundationModelIds.FALCON_OA_7B,
        modelId: "OpenAssistant/falcon-7b-sft-mix-2000",
        instanceType: HuggingFaceFalconInstances.G5_16XLARGE,
        quantize: false,
        numGpus: 1,
        containerStartupHealthCheckTimeout: Duration.minutes(10),
        displayName: "Falcon OA 7B",
      });
    }

    if (modelsToDeploy.has(FoundationModelIds.FALCON_LITE)) {
      new FalconLite(this, "FalconLite", {
        modelUUID: FoundationModelIds.FALCON_LITE,
        instanceType: FalconLiteInstances.G5_12XLARGE,
        displayName: "Falcon Lite",
      });
    }

    // ... add LLM/FoundationModels here to deploy

    ////////////////////////////////////////////////////////////
    // BUILD THE INVENTORY
    ////////////////////////////////////////////////////////////
    // find all models defined
    const modelProviders = this.node.children.filter(
      isModelInfoProvider
    ) as unknown[] as IModelInfoProvider[];
    // mapping of available foundation models
    // this can include externally managed endpoints and other services later
    // acts as inventory
    this.inventory = {
      defaultModelId: defaultModelId ?? DEFAULT_FOUNDATION_MODEL_ID,
      models: Object.fromEntries(
        modelProviders.map((v) => [v.modelInfo.uuid, v.modelInfo])
      ),
    };

    new ModelEULA(
      this,
      "EULA",
      modelProviders.map((v) => v.modelInfo)
    );
  }
}
