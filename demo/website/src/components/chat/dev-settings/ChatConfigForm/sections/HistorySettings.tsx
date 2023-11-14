/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Input, Toggle } from '@cloudscape-design/components';
import FormField from '@cloudscape-design/components/form-field';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { FC } from 'react';
import { useChatEngineConfigState } from '../../../../../providers/ChatEngineConfig';

// TODO: dynamic default, currently match source value in sdk code
const DEFAULT_LIMIT = 20;

export const HistorySettings: FC = () => {
  const [config, setConfig] = useChatEngineConfigState('memory');

  const value = config?.limit ?? DEFAULT_LIMIT;
  const enabled = value >= 1;

  return (
    <SpaceBetween direction="vertical" size="s">
      <FormField label="Enabled" description="Indicates if historical context is provided in followup questions">
        <Toggle
          checked={enabled}
          onChange={({ detail }) => {
            setConfig({
              limit: detail.checked ? DEFAULT_LIMIT : -1,
            });
          }}
        />
      </FormField>
      {enabled && (
        <FormField label="Limit" description="Max number of messages to include in context">
          <Input
            type="number"
            value={String(value)}
            onChange={({ detail }) => {
              setConfig({
                limit: parseInt(detail.value),
              });
            }}
          />
        </FormField>
      )}
    </SpaceBetween>
  );
};
