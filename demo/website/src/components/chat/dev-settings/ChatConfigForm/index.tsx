/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import Tabs, { TabsProps } from '@cloudscape-design/components/tabs';
import { FC, useMemo } from 'react';
import { InferenceSettings, PromptSettings, SearchSettings, HistorySettings } from './sections';

export const ChatConfigForm: FC = () => {
  const tabs = useMemo<TabsProps.Tab[]>(
    () => [
      {
        id: 'inference',
        label: 'Inference',
        content: <InferenceSettings />,
      },
      {
        id: 'prompts',
        label: 'Prompt Engineering',
        content: <PromptSettings />,
      },
      {
        id: 'search',
        label: 'Semantic Search',
        content: <SearchSettings />,
      },
      {
        id: 'history',
        label: 'History',
        content: <HistorySettings />,
      },
    ],
    [],
  );

  return <Tabs tabs={tabs} variant="default" />;
};
