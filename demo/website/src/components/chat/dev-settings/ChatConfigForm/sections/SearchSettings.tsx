/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Input, SegmentedControl } from "@cloudscape-design/components";
import FormField from "@cloudscape-design/components/form-field";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { FC } from "react";
import {
  ChatEngineConfigSearchType,
  useChatEngineConfigState,
} from "../../../../../providers/ChatEngineConfig";
import CodeEditor from "../../../../code-editor";
import { formatLabel, toCodeEditorJson } from "../../utils";

const SEARCH_TYPES: ChatEngineConfigSearchType[] = [
  "similarity",
  "similarity_score_threshold",
  "mmr",
];

export const SearchSettings: FC = () => {
  const [searchKwargs, setSearchKwargs] =
    useChatEngineConfigState("searchKwargs");
  const [searchType, setSearchType] = useChatEngineConfigState("searchType");
  const [searchUrl, setSearchUrl] = useChatEngineConfigState("searchUrl");

  return (
    <SpaceBetween direction="vertical" size="s">
      <FormField label="Search Kwargs" stretch>
        <CodeEditor
          language="javascript"
          value={toCodeEditorJson(searchKwargs)}
          onChange={({ detail }) => {
            try {
              setSearchKwargs(JSON.parse(detail.value));
            } catch (error) {
              console.warn("Failed to parse `Search Kwargs`", detail.value, error);
            }
          }}
        />
      </FormField>
      <FormField label="Search URL" stretch>
        <Input
          value={searchUrl || ""}
          onChange={({ detail }) => {
            setSearchUrl(detail.value);
          }}
        />
      </FormField>
      {/* TODO: enable once we support the other types of search in backend */}
      {false && (
        <FormField label="Search Type" stretch>
          <SegmentedControl
            selectedId={searchType || null}
            onChange={({ detail }) => setSearchType(detail.selectedId as any)}
            label="Search Type"
            options={SEARCH_TYPES.map((id) => ({
              id,
              text: formatLabel(id),
            }))}
          />
        </FormField>
      )}
    </SpaceBetween>
  );
};
