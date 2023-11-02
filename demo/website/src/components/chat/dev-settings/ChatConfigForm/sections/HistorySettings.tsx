/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import FormField from '@cloudscape-design/components/form-field';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { FC } from 'react';
import { useChatEngineConfigState } from '../../../../../providers/ChatEngineConfig';
import CodeEditor from '../../../../code-editor';
import { toCodeEditorJson } from '../../utils';

export const HistorySettings: FC = () => {
  const [memoryKwargs, setMemoryKwargs] = useChatEngineConfigState('memoryKwargs');

  return (
    <SpaceBetween direction="vertical" size="s">
      <FormField label="Memory Kwargs">
        <CodeEditor
          language="json"
          value={toCodeEditorJson(memoryKwargs)}
          onChange={({ detail }) => {
            try {
              setMemoryKwargs(JSON.parse(detail.value));
            } catch (error) {
              console.warn('Failed to parse `Memory Kwargs`', detail.value, error);
            }
          }}
        />
      </FormField>
    </SpaceBetween>
  );
};
