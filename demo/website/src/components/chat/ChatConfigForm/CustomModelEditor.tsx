/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { IPromptAdapter } from "@aws-galileo/galileo-sdk/lib/models/adapter";
import {
  IModelInfo,
  ISageMakerEndpointModelFramework,
  IBedrockFramework,
  isSageMakerEndpointFramework,
  isBedrockFramework,
  IModelFramework,
  ModelFramework,
} from "@aws-galileo/galileo-sdk/lib/models/types";
import {
  Container,
  Header,
  Link,
  TextContent,
} from "@cloudscape-design/components";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import SegmentedControl from "@cloudscape-design/components/segmented-control";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { WritableDraft } from "immer/dist/internal";
import { get, has, isEmpty, merge, set } from "lodash";
import { FC, useEffect } from "react";
import { Updater } from "use-immer";
import { ModelSelector } from "./ModelSelector";
import { useFoundationModelInventory } from "../../../hooks/llm-inventory";

type CustomModelEditorProps = {
  value?: Partial<IModelInfo>;
  updateValue: Updater<Partial<IModelInfo>>;
};

const PROMPT_TAGS: (keyof IPromptAdapter)[] = [
  "sequence",
  "instruction",
  "system",
  "context",
  "delimiter",
  "human",
  "ai",
];

export const CustomModelEditor: FC<CustomModelEditorProps> = ({
  value,
  updateValue,
}: CustomModelEditorProps) => {
  const inventory = useFoundationModelInventory();

  // pre-populate fields with predefined model
  useEffect(() => {
    if (value?.uuid && inventory?.models) {
      const _model = inventory.models[value.uuid];
      if (_model) {
        updateValue((draft) => {
          merge(draft, {
            ..._model,
            name: `Custom:${_model.name}`,
            modelId: `custom/${_model.modelId}`,
            framework: {
              ..._model.framework,
              // We don't have kwargs editable so don't display
              modelKwargs: undefined,
              endpointKwargs: undefined,
            },
          });
        });
      }
    }
  }, [inventory, value?.uuid]);

  return (
    <Container header={<Header variant="h3">Custom Model</Header>}>
      <SpaceBetween direction="vertical" size="s">
        <FormField
          label="Base Model"
          description="UUID of model predefined model to override, blank for bespoke model"
          stretch
        >
          <ModelSelector
            none
            value={value?.uuid}
            onChange={(_value) => {
              updateValue((x) => {
                if (isEmpty(_value)) {
                  x.uuid = undefined;
                } else {
                  x.uuid = _value;
                }
              });
            }}
          />
        </FormField>

        <FormField label="Framework" stretch>
          <SegmentedControl
            selectedId={
              value?.framework?.type || ModelFramework.SAGEMAKER_ENDPOINT
            }
            onChange={({ detail }) =>
              updateValue((x) => {
                const _framework = (x.framework ??
                  {}) as WritableDraft<IModelFramework>;
                _framework.type = detail.selectedId as any;
              })
            }
            label="Framework Type"
            options={Object.values(ModelFramework).map((v) => ({
              id: v,
              text: v,
            }))}
          />
        </FormField>

        {isSageMakerEndpointFramework(value?.framework) && (
          <>
            <FormField label="SageMaker Endpoint Name" stretch>
              <Input
                value={get(value?.framework, "endpointName", "")}
                onChange={({ detail }) => {
                  updateValue((x) => {
                    const _framework = (x.framework ??
                      {}) as WritableDraft<ISageMakerEndpointModelFramework>;
                    _framework.endpointName = detail.value;
                  });
                }}
              />
            </FormField>
            <FormField label="SageMaker Endpoint Region" stretch>
              <Input
                value={get(value?.framework, "endpointRegion", "")}
                onChange={({ detail }) => {
                  updateValue((x) => {
                    const _framework = (x.framework ??
                      {}) as WritableDraft<ISageMakerEndpointModelFramework>;
                    _framework.endpointRegion = detail.value;
                  });
                }}
              />
            </FormField>
          </>
        )}

        {isBedrockFramework(value?.framework) && (
          <>
            <FormField label="Bedrock Model" stretch>
              <Input
                value={get(value?.framework, "modelId", "")}
                onChange={({ detail }) => {
                  updateValue((x) => {
                    const _framework = (x.framework ??
                      {}) as WritableDraft<IBedrockFramework>;
                    _framework.modelId = detail.value;
                  });
                }}
              />
            </FormField>
            <FormField label="Bedrock Region" stretch>
              <Input
                value={get(value?.framework, "region", "")}
                onChange={({ detail }) => {
                  updateValue((x) => {
                    const _framework = (x.framework ??
                      {}) as WritableDraft<IBedrockFramework>;
                    _framework.region = detail.value;
                  });
                }}
              />
            </FormField>
            <FormField label="Bedrock Endpoint Url" stretch>
              <Input
                value={get(value?.framework, "endpointUrl", "")}
                onChange={({ detail }) => {
                  updateValue((x) => {
                    const _framework = (x.framework ??
                      {}) as WritableDraft<IBedrockFramework>;
                    if (isEmpty(detail.value)) {
                      _framework.endpointUrl = undefined;
                    } else {
                      _framework.endpointUrl = detail.value;
                    }
                  });
                }}
              />
            </FormField>
          </>
        )}

        <FormField
          label="Assume Role"
          description="Role Arn to assume for cross-account development"
          stretch
        >
          <Input
            value={value?.framework?.role || ""}
            onChange={({ detail }) => {
              updateValue((x) => {
                if (isEmpty(detail.value)) {
                  x.framework!.role = undefined;
                } else {
                  x.framework!.role = detail.value;
                }
              });
            }}
          />
        </FormField>

        {/* Model and Endpoint Kwargs are configurable in main form, so would be redundant here for development */}

        <FormField label="Constraint: Max Input Length" stretch>
          <Input
            type="number"
            value={String(value?.constraints?.maxInputLength || "")}
            onChange={({ detail }) => {
              updateValue((x) => {
                if (isEmpty(detail.value)) {
                  if (
                    has<Partial<IModelInfo>>(x, "constraints.maxInputLength")
                  ) {
                    set<Partial<IModelInfo>>(
                      x,
                      "constraints.maxInputLength",
                      undefined
                    );
                  }
                } else {
                  set<Partial<IModelInfo>>(
                    x,
                    "constraints.maxInputLength",
                    parseInt(detail.value)
                  );
                }
              });
            }}
          />
        </FormField>

        <FormField label="Constraint: Max Total Tokens" stretch>
          <Input
            type="number"
            value={String(value?.constraints?.maxTotalTokens || "")}
            onChange={({ detail }) => {
              updateValue((x) => {
                if (isEmpty(detail.value)) {
                  if (
                    has<Partial<IModelInfo>>(x, "constraints.maxTotalTokens")
                  ) {
                    set<Partial<IModelInfo>>(
                      x,
                      "constraints.maxTotalTokens",
                      undefined
                    );
                  }
                } else {
                  set<Partial<IModelInfo>>(
                    x,
                    "constraints.maxTotalTokens",
                    parseInt(detail.value)
                  );
                }
              });
            }}
          />
        </FormField>

        <ExpandableSection headerText="Adapter">
          <SpaceBetween direction="vertical" size="m">
            <Container
              header={
                <Header
                  variant="h3"
                  description={
                    <TextContent>
                      <h5>Specify how model requests I/O is handled</h5>
                      See{" "}
                      <Link
                        href="https://lodash.com/docs/4.17.15#set"
                        target="_blank"
                      >
                        path syntax
                      </Link>
                    </TextContent>
                  }
                >
                  Content Handler
                </Header>
              }
            >
              <SpaceBetween direction="vertical" size="s">
                <FormField
                  stretch
                  label="Input: Prompt Key"
                  description="Path in input object to define the prompt value."
                  constraintText="Default to `text_inputs`"
                >
                  <Input
                    value={
                      value?.adapter?.contentHandler?.input?.promptKey || ""
                    }
                    onChange={({ detail }) => {
                      updateValue((x) => {
                        if (isEmpty(detail.value)) {
                          if (
                            has<Partial<IModelInfo>>(
                              x,
                              "adapter.contentHandler.input.promptKey"
                            )
                          ) {
                            set<Partial<IModelInfo>>(
                              x,
                              "adapter.contentHandler.input.promptKey",
                              undefined
                            );
                          }
                        } else {
                          set<Partial<IModelInfo>>(
                            x,
                            "adapter.contentHandler.input.promptKey",
                            detail.value
                          );
                        }
                      });
                    }}
                  />
                </FormField>
                <FormField
                  stretch
                  label="Input: Model Kwargs Key"
                  description="Path in the input object to define the model kwargs."
                  constraintText="Defaults to spreading the model kwargs on input root."
                >
                  <Input
                    value={
                      value?.adapter?.contentHandler?.input?.modelKwargsKey ||
                      ""
                    }
                    onChange={({ detail }) => {
                      updateValue((x) => {
                        if (isEmpty(detail.value)) {
                          if (
                            has<Partial<IModelInfo>>(
                              x,
                              "adapter.contentHandler.input.modelKwargsKey"
                            )
                          ) {
                            set<Partial<IModelInfo>>(
                              x,
                              "adapter.contentHandler.input.modelKwargsKey",
                              undefined
                            );
                          }
                        } else {
                          set<Partial<IModelInfo>>(
                            x,
                            "adapter.contentHandler.input.modelKwargsKey",
                            detail.value
                          );
                        }
                      });
                    }}
                  />
                </FormField>
                <FormField
                  stretch
                  label="Output: Json Path"
                  description="Path of response object to extract as output."
                  constraintText="Defaults to `[0].generated_text`"
                >
                  <Input
                    value={
                      value?.adapter?.contentHandler?.output?.jsonpath || ""
                    }
                    onChange={({ detail }) => {
                      updateValue((x) => {
                        if (isEmpty(detail.value)) {
                          if (
                            has<Partial<IModelInfo>>(
                              x,
                              "adapter.contentHandler.output.jsonpath"
                            )
                          ) {
                            set<Partial<IModelInfo>>(
                              x,
                              "adapter.contentHandler.output.jsonpath",
                              undefined
                            );
                          }
                        } else {
                          set<Partial<IModelInfo>>(
                            x,
                            "adapter.contentHandler.output.jsonpath",
                            detail.value
                          );
                        }
                      });
                    }}
                  />
                </FormField>
              </SpaceBetween>
            </Container>

            <Container
              header={
                <Header
                  variant="h3"
                  description="Specify the specific prompt markup for the model for each replacement tag"
                >
                  Prompt Tags
                </Header>
              }
            >
              <SpaceBetween direction="vertical" size="s">
                {PROMPT_TAGS.map((tag, i) => (
                  <FormField
                    key={i}
                    label={`Tag: ${tag}`}
                    description={`String replacement for <${tag}> and </${tag}> in template`}
                    stretch
                  >
                    <SpaceBetween direction="horizontal" size="s">
                      <span>Open</span>
                      <Input
                        ariaLabel="Open"
                        value={tagValueToText(
                          get(value, `adapter.prompt.${tag}.open`, "")
                        )}
                        onChange={({ detail }) => {
                          updateValue((x) => {
                            if (isEmpty(detail.value)) {
                              if (
                                has<Partial<IModelInfo>>(
                                  x,
                                  `adapter.prompt.${tag}.open`
                                )
                              ) {
                                set<Partial<IModelInfo>>(
                                  x,
                                  `adapter.prompt.${tag}.open`,
                                  undefined
                                );
                              }
                            } else {
                              set<Partial<IModelInfo>>(
                                x,
                                `adapter.prompt.${tag}.open`,
                                tagTextToValue(detail.value)
                              );
                            }
                          });
                        }}
                      />

                      <span>Close</span>
                      <Input
                        ariaLabel="Close"
                        value={tagValueToText(
                          get(value, `adapter.prompt.${tag}.close`, "")
                        )}
                        onChange={({ detail }) => {
                          updateValue((x) => {
                            if (isEmpty(detail.value)) {
                              if (
                                has<Partial<IModelInfo>>(
                                  x,
                                  `adapter.prompt.${tag}.close`
                                )
                              ) {
                                set<Partial<IModelInfo>>(
                                  x,
                                  `adapter.prompt.${tag}.close`,
                                  undefined
                                );
                              }
                            } else {
                              set<Partial<IModelInfo>>(
                                x,
                                `adapter.prompt.${tag}.close`,
                                tagTextToValue(detail.value)
                              );
                            }
                          });
                        }}
                      />
                    </SpaceBetween>
                  </FormField>
                ))}
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </ExpandableSection>
      </SpaceBetween>
    </Container>
  );
};

function tagValueToText(value: string): string {
  return value.replaceAll("\n", "\\n");
}

function tagTextToValue(value: string): string {
  return value.replaceAll("\\n", "\n");
}
