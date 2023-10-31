/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  FoundationModelRecord,
  IFoundationModelInventory,
  IModelInfoProvider,
  isModelInfoProvider,
} from '@aws/galileo-sdk/lib/models';
import { Duration } from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { pascal } from 'case';
import { Construct } from 'constructs';
import { startCase } from 'lodash';
import {
  FoundationModelIds,
} from './ids';
import { ApplicationConfig } from '../../core/app/context/types';
import {
  BedrockModel,
} from '../llms/framework/bedrock';
import {
  FalconLite,
  FalconLiteInstances,
} from '../llms/models/falcon/lite';
import {
  HuggingFaceFalcon,
  HuggingFaceFalconInstances,
} from '../llms/models/falcon/tgi';
import { Llama2Base13BSageMaker } from '../llms/models/meta';

export { IFoundationModelInventory };

export interface PredefinedFoundationModelsProps extends ApplicationConfig {
  readonly vpc: IVpc;
}

export interface IFoundationModelManager {
  readonly deployedModelIds: string[];
  readonly defaultModelId: string;
  readonly inventory: IFoundationModelInventory;
}

export class PredefinedFoundationModels extends Construct implements IFoundationModelManager {
  protected _defaultModelId?: string;

  get deployedModelIds(): string[] {
    return Object.keys(this.inventory.models);
  }

  get defaultModelId(): string {
    return this.inventory.defaultModelId;
  }

  get modelProviders(): IModelInfoProvider[] {
    // find all models defined
    return this.node.children.filter(
      isModelInfoProvider,
    ) as unknown[] as IModelInfoProvider[];
  }

  get inventory(): IFoundationModelInventory {
    const modelProviders = this.modelProviders;

    // mapping of available foundation models
    // this can include externally managed endpoints and other services later
    // acts as inventory

    const models: FoundationModelRecord = Object.fromEntries(
      modelProviders.map((v) => [v.modelInfo.uuid, v.modelInfo]),
    );

    const defaultModelId = this._defaultModelId ?? modelProviders[0].modelInfo.uuid;

    return {
      defaultModelId,
      models,
    };
  }

  constructor(scope: Construct, id: string, props: PredefinedFoundationModelsProps) {
    super(scope, id);

    this._defaultModelId = props.llms.defaultModel;

    const modelsToDeploy = new Set(props.llms.predefined?.sagemaker);

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
      new HuggingFaceFalcon(this, 'Falcon40b', {
        modelUUID: FoundationModelIds.FALCON_OA_40B,
        modelId: 'OpenAssistant/falcon-40b-sft-top1-560',
        instanceType: HuggingFaceFalconInstances.G5_48XLARGE,
        displayName: 'Falcon OA 40B',
      });
    }

    if (modelsToDeploy.has(FoundationModelIds.FALCON_OA_7B)) {
      new HuggingFaceFalcon(this, 'Falcon7b', {
        modelUUID: FoundationModelIds.FALCON_OA_7B,
        modelId: 'OpenAssistant/falcon-7b-sft-mix-2000',
        instanceType: HuggingFaceFalconInstances.G5_16XLARGE,
        quantize: false,
        numGpus: 1,
        containerStartupHealthCheckTimeout: Duration.minutes(10),
        displayName: 'Falcon OA 7B',
      });
    }

    if (modelsToDeploy.has(FoundationModelIds.FALCON_LITE)) {
      new FalconLite(this, 'FalconLite', {
        modelUUID: FoundationModelIds.FALCON_LITE,
        instanceType: FalconLiteInstances.G5_12XLARGE,
        displayName: 'Falcon Lite',
      });
    }

    //////////////////////////////////////////////////////////
    // Meta: Llama2
    //////////////////////////////////////////////////////////
    if (modelsToDeploy.has(FoundationModelIds.META_LLAMA2_BASE_13B)) {
      new Llama2Base13BSageMaker(this, 'Llama2_13B', {
        modelUUID: FoundationModelIds.META_LLAMA2_BASE_13B,
        modelId: 'meta-llama/Llama-2-13b',
      });
    }

    //////////////////////////////////////////////////////////
    // Bedrock - not actual deployments but wire up to the inventory for integration
    //////////////////////////////////////////////////////////
    if (props.bedrock?.enabled) {
      if (props.bedrock.models == null || props.bedrock.models.length < 1) {
        // TODO: temporary until we refactor bedrock model handling to be more runtime baseds
        throw new Error('Must specific at least 1 bedrock model to enable');
      }

      (props.bedrock.models).forEach(
        (_bedrockModelId) => {
          const _id = `Bedrock-${pascal(_bedrockModelId)}`;
          new BedrockModel(this, _id, {
            modelUUID: BedrockModel.formatUUID(_bedrockModelId),
            modelId: _bedrockModelId,
            displayName: startCase(_id),
            region: props.bedrock?.region,
            endpointUrl: props.bedrock?.endpointUrl,
          });
        },
      );
    }

    // NB: add additional LLM/FoundationModels here to deploy
  }
}
