/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { HelpPanel, HelpPanelProps } from '@cloudscape-design/components';
import { managedContentFactory } from './base';

const {
  Context: HelpPanelContext,
  Provider: HelpPanelProvider,
  Hook: useHelpPanel,
  ManagedItemComponent: ManagedHelpPanel,
} = managedContentFactory<HelpPanelProps>(HelpPanel);

export { HelpPanelContext, HelpPanelProvider, useHelpPanel, ManagedHelpPanel };
