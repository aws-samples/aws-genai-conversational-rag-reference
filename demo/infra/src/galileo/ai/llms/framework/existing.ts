/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  IModelInfo,
  IModelInfoProvider,
} from "@aws-galileo/galileo-sdk/lib/models";
import { Construct, IConstruct } from "constructs";

export class ExistingLLM extends Construct implements IModelInfoProvider {
  readonly modelInfo: IModelInfo;

  constructor(scope: IConstruct, id: string, modelInfo: IModelInfo) {
    super(scope, id);

    this.modelInfo = modelInfo;
  }
}
