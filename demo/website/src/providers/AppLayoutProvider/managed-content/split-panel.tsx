/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { SplitPanel, SplitPanelProps } from "@cloudscape-design/components";
import { managedContentFactory } from "./base";

const {
  Context: SplitPanelContext,
  Provider: SplitPanelProvider,
  Hook: useSplitPanel,
  ManagedItemComponent: ManagedSplitPanel,
} = managedContentFactory<SplitPanelProps>(SplitPanel);

export {
  SplitPanelContext,
  SplitPanelProvider,
  useSplitPanel,
  ManagedSplitPanel,
};
