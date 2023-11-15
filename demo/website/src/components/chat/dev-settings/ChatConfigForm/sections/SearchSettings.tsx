/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Input } from '@cloudscape-design/components';
import FormField from '@cloudscape-design/components/form-field';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { isEmpty } from 'lodash';
import { FC } from 'react';
import { useIsAdmin } from '../../../../../Auth';
import { useChatEngineConfigState } from '../../../../../providers/ChatEngineConfig';
import CodeEditor from '../../../../code-editor';
import { toCodeEditorJson } from '../../utils';

export const SearchSettings: FC = () => {
  const isAdmin = useIsAdmin();
  const [search, setSearch] = useChatEngineConfigState('search');

  return (
    <SpaceBetween direction="vertical" size="s">
      <FormField label="Limit" description="Max number of messages to include in context">
        <Input
          type="number"
          value={String(search?.limit ?? 5)}
          onChange={({ detail }) => {
            setSearch((_draft) => ({
              ..._draft,
              limit: parseInt(detail.value),
            }));
          }}
        />
      </FormField>

      <FormField label="Filter" description="Mapping of metadata search criteria to apply." stretch>
        <CodeEditor
          language="json"
          value={toCodeEditorJson(search?.filter)}
          onChange={({ detail }) => {
            try {
              let filter = JSON.parse(detail.value);
              if (isEmpty(filter)) filter = undefined;
              setSearch((_draft) => ({
                ..._draft,
                filter,
              }));
            } catch (error) {
              console.warn('Failed to parse `Search config`', detail.value, error);
            }
          }}
        />
      </FormField>

      {/* Privileged properties */}
      {isAdmin && (
        <FormField label="URL" description="Search endpoint url to retrieve documents from." stretch>
          <Input
            value={String(search?.url || '')}
            onChange={({ detail }) => {
              let url: string | undefined = detail.value;
              if (isEmpty(url.trim())) {
                url = undefined;
              }
              setSearch((_draft) => ({
                ..._draft,
                url,
              }));
            }}
          />
        </FormField>
      )}
    </SpaceBetween>
  );
};
