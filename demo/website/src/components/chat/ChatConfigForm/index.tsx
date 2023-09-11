/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  CONDENSE_QUESTION_TEMPLATE,
  QA_TEMPLATE,
} from "@aws-galileo/galileo-sdk/lib/models/prompts";
import type { IModelInfo } from "@aws-galileo/galileo-sdk/lib/models/types";
import {
  Container,
  Popover,
  StatusIndicator,
} from "@cloudscape-design/components";
import Button from "@cloudscape-design/components/button";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import SegmentedControl from "@cloudscape-design/components/segmented-control";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import { isEmpty } from "lodash";
import startCase from "lodash/startCase";
import { FC, useCallback } from "react";
import { Updater } from "use-immer";
import { CustomModelEditor } from "./CustomModelEditor";
import { CUSTOM_VALUE, ModelSelector } from "./ModelSelector";
import {
  ChatEngineConfigSearchType,
  useChatEngineConfig,
  useChatEngineConfigState,
} from "../../../providers/ChatEngineConfig";
import CodeEditor from "../../code-editor";

type ChatConfigProps = {
  onClose?: any;
};

function formatLabel(value: string): string {
  return startCase(value);
}

export const ChatConfigForm: FC<ChatConfigProps> = (props: ChatConfigProps) => {
  const [, updateConfig, actions] = useChatEngineConfig();
  const [llmModel, setLlmModel] = useChatEngineConfigState("llmModel");
  const [llmModelKwargs, setLlmModelKwargs] =
    useChatEngineConfigState("llmModelKwargs");
  const [llmEndpointKwargs, setLlmEndpointKwargs] =
    useChatEngineConfigState("llmEndpointKwargs");
  const [qaPrompt, setQaPrompt] = useChatEngineConfigState("qaPrompt");
  const [condenseQuestionPrompt, setCondenseQuestionPrompt] =
    useChatEngineConfigState("condenseQuestionPrompt");
  const [searchKwargs, setSearchKwargs] =
    useChatEngineConfigState("searchKwargs");
  const [searchType, setSearchType] = useChatEngineConfigState("searchType");
  const [searchUrl, setSearchUrl] = useChatEngineConfigState("searchUrl");
  const [memoryKwargs, setMemoryKwargs] =
    useChatEngineConfigState("memoryKwargs");

  const isCustomLlmModel = typeof llmModel === "object";

  const updateCustomModel: Updater<Partial<IModelInfo>> = useCallback(
    (x) => {
      updateConfig((draft) => {
        if (typeof x === "function") {
          x(draft.llmModel);
        } else if (isEmpty(x)) {
          draft.llmModel = undefined;
        } else {
          draft.llmModel = x;
        }
      });
    },
    [updateConfig]
  );

  const onReset = useCallback(() => {
    actions?.reset();
    setLlmModel(undefined);
  }, [actions?.reset, setLlmModel]);

  return (
    <Container>
      <Form
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="normal" onClick={onReset}>
              Reset
            </Button>
            <Button variant="primary" onClick={props.onClose}>
              Let's Go!
            </Button>
          </SpaceBetween>
        }
        secondaryActions={
          <SpaceBetween direction="horizontal" size="xs">
            <Popover
              size="small"
              position="left"
              triggerType="custom"
              dismissButton={false}
              content={
                <StatusIndicator type="success">Copied!</StatusIndicator>
              }
            >
              <Button
                variant="link"
                ariaLabel="Copy config to clipboard"
                onClick={actions?.copy}
              >
                Copy
              </Button>
            </Popover>

            <Popover
              size="small"
              position="left"
              triggerType="custom"
              dismissButton={false}
              content={
                <StatusIndicator type="success">Pasted!</StatusIndicator>
              }
            >
              <Button
                variant="link"
                ariaLabel="Paste config from clipboard"
                onClick={actions?.paste}
              >
                Paste
              </Button>
            </Popover>
          </SpaceBetween>
        }
      >
        <SpaceBetween direction="vertical" size="l">
          <ExpandableSection headerText="Inference">
            <SpaceBetween direction="vertical" size="s">
              <FormField label="LLM model" stretch>
                <ModelSelector
                  custom
                  value={llmModel}
                  onChange={(value) => {
                    if (value === CUSTOM_VALUE) {
                      setLlmModel({
                        framework: {
                          type: "SageMakerEndpoint",
                        },
                      });
                    } else {
                      setLlmModel(value);
                    }
                  }}
                />
              </FormField>
              {isCustomLlmModel && (
                <CustomModelEditor
                  value={llmModel}
                  updateValue={updateCustomModel}
                />
              )}
              <FormField label="Model Kwargs" stretch>
                <CodeEditor
                  language="javascript"
                  value={toCodeEditorJson(llmModelKwargs)}
                  onChange={({ detail }) => {
                    try {
                      setLlmModelKwargs(JSON.parse(detail.value));
                    } catch (error) {
                      console.warn("Failed to parse `LLM Model Kwargs`", error);
                    }
                  }}
                />
              </FormField>
              <FormField label="Model Endpoint Kwargs" stretch>
                <CodeEditor
                  language="javascript"
                  value={toCodeEditorJson(llmEndpointKwargs)}
                  onChange={({ detail }) => {
                    try {
                      setLlmEndpointKwargs(JSON.parse(detail.value));
                    } catch (error) {
                      console.warn(
                        "Failed to parse `LLM Endpoint Kwargs`",
                        error
                      );
                    }
                  }}
                />
              </FormField>
            </SpaceBetween>
          </ExpandableSection>

          <ExpandableSection headerText="Prompt Engineering">
            <SpaceBetween direction="vertical" size="s">
              <FormField
                label="QA Prompt"
                description="Prompt that contains standalone question to send to inference model"
                stretch
              >
                <Textarea
                  onChange={({ detail }) => setQaPrompt(detail.value)}
                  value={qaPrompt || QA_TEMPLATE}
                />
              </FormField>
              <FormField
                label="Condense Question Prompt"
                description="Prompt that generates the standalone question from context"
                stretch
              >
                <Textarea
                  onChange={({ detail }) =>
                    setCondenseQuestionPrompt(detail.value)
                  }
                  value={condenseQuestionPrompt || CONDENSE_QUESTION_TEMPLATE}
                />
              </FormField>
            </SpaceBetween>
          </ExpandableSection>

          <ExpandableSection headerText="Semantic Search">
            <SpaceBetween direction="vertical" size="s">
              <FormField label="Search Kwargs" stretch>
                <CodeEditor
                  language="javascript"
                  value={toCodeEditorJson(searchKwargs)}
                  onChange={({ detail }) => {
                    try {
                      setSearchKwargs(JSON.parse(detail.value));
                    } catch (error) {
                      console.warn("Failed to parse `Search Kwargs`", error);
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
                    onChange={({ detail }) =>
                      setSearchType(detail.selectedId as any)
                    }
                    label="Search Type"
                    options={SEARCH_TYPES.map((id) => ({
                      id,
                      text: formatLabel(id),
                    }))}
                  />
                </FormField>
              )}
            </SpaceBetween>
          </ExpandableSection>

          <ExpandableSection headerText="History">
            <SpaceBetween direction="vertical" size="s">
              <FormField label="Memory Kwargs">
                <CodeEditor
                  language="javascript"
                  value={toCodeEditorJson(memoryKwargs)}
                  onChange={({ detail }) => {
                    try {
                      setMemoryKwargs(JSON.parse(detail.value));
                    } catch (error) {
                      console.warn("Failed to parse `Memory Kwargs`", error);
                    }
                  }}
                />
              </FormField>
            </SpaceBetween>
          </ExpandableSection>
        </SpaceBetween>
      </Form>
    </Container>
  );
};

const SEARCH_TYPES: ChatEngineConfigSearchType[] = [
  "similarity",
  "similarity_score_threshold",
  "mmr",
];

function toCodeEditorJson(value: any, defaultValue: string = "{}"): string {
  if (value == null) return defaultValue;
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}
