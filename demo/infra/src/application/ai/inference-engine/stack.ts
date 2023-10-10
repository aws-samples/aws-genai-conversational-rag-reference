/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Construct } from "constructs";
import { InferenceEngine, InferenceEngineProps } from "./engine";
import {
  MonitoredNestedStack,
  MonitoredNestedStackProps,
} from "../../monitoring";

export interface InferenceEngineStackProps
  extends InferenceEngineProps,
    MonitoredNestedStackProps {}

export class InferenceEngineStack extends MonitoredNestedStack {
  readonly engine: InferenceEngine;

  constructor(scope: Construct, id: string, props: InferenceEngineStackProps) {
    super(scope, id, props);

    this.engine = new InferenceEngine(this, "Engine", props);
  }
}
