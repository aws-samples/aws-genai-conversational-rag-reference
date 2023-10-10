/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { NestedStack, NestedStackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { InferenceEngine, InferenceEngineProps } from "./engine";

export interface InferenceEngineStackProps
  extends InferenceEngineProps,
    NestedStackProps {}

export class InferenceEngineStack extends NestedStack {
  readonly engine: InferenceEngine;

  constructor(scope: Construct, id: string, props: InferenceEngineStackProps) {
    super(scope, id, props);

    this.engine = new InferenceEngine(this, "Engine", props);
  }
}
