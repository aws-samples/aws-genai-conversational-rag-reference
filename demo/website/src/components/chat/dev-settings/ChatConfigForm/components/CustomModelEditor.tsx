/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  IModelInfo,
  ISageMakerEndpointModelFramework,
  IBedrockFramework,
  isSageMakerEndpointFramework,
  isBedrockFramework,
  IModelFramework,
  ModelFramework,
} from "@aws/galileo-sdk/lib/models/types";
import { Container, Header, Link } from "@cloudscape-design/components";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import SegmentedControl from "@cloudscape-design/components/segmented-control";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { WritableDraft } from "immer/dist/internal";
import { get, has, isEmpty, merge, set } from "lodash";
import { FC, useEffect } from "react";
import { Updater } from "use-immer";
import { FormFieldSet } from "./FormFieldSet";
import { ModelSelector } from "./ModelSelector";
import { useFoundationModelInventory } from "../../../../../hooks/llm-inventory";
import { DeepPartial } from "../../../../../types/utils";

export interface ICustomModel extends DeepPartial<IModelInfo> {
  isCustom: true;
  name: `custom:${string}`;
}

export type CustomModelEditorProps = {
  value: ICustomModel;
  updateValue: Updater<ICustomModel>;
};

export const CustomModelEditor: FC<CustomModelEditorProps> = ({
  value,
  updateValue,
}: CustomModelEditorProps) => {
  const inventory = useFoundationModelInventory();

  // pre-populate fields with predefined model
  useEffect(() => {
    if (value.uuid && inventory?.models) {
      const _model = inventory.models[value.uuid];
      if (_model) {
        updateValue((draft) => {
          merge(draft, _model, {
            name: `custom:${_model.name}`,
            framework: {
              // We don't have kwargs editable so need to drop so we only use main form values
              modelKwargs: null,
              endpointKwargs: null,
            },
          });
        });
      }
    }
  }, [inventory, value.uuid]);

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
            value={value.uuid}
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
              value.framework?.type || ModelFramework.SAGEMAKER_ENDPOINT
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

        {isSageMakerEndpointFramework(value.framework as any) && (
          <FormFieldSet
            label="SageMaker"
            description="Settings specific to Amazon SageMaker model integration"
          >
            <FormField label="SageMaker Endpoint Name" stretch>
              <Input
                value={get(value.framework, "endpointName", "")}
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
                value={get(value.framework, "endpointRegion", "")}
                onChange={({ detail }) => {
                  updateValue((x) => {
                    const _framework = (x.framework ??
                      {}) as WritableDraft<ISageMakerEndpointModelFramework>;
                    _framework.endpointRegion = detail.value;
                  });
                }}
              />
            </FormField>
          </FormFieldSet>
        )}

        {isBedrockFramework(value.framework as any) && (
          <FormFieldSet
            label="Bedrock"
            description="Settings specific to Amazon Bedrock model integration"
          >
            <FormField label="Bedrock Model" stretch>
              <Input
                value={get(value.framework, "modelId", "")}
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
                value={get(value.framework, "region", "")}
                onChange={({ detail }) => {
                  updateValue((x) => {
                    const _framework = (x.framework ??
                      {}) as WritableDraft<IBedrockFramework>;
                    _framework.region = detail.value;
                  });
                }}
              />
            </FormField>
            <FormField
              label="Bedrock Endpoint Url"
              stretch
              constraintText="Only the domain, do not include https://"
            >
              <Input
                value={get(value.framework, "endpointUrl", "")}
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
          </FormFieldSet>
        )}

        <FormFieldSet
          label="Cross-Account"
          description="Settings to support cross-account models"
        >
          <FormField
            label="Assume Role"
            description="Role Arn to assume for cross-account development"
            stretch
          >
            <Input
              value={value.framework?.role || ""}
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
        </FormFieldSet>

        {/* Model and Endpoint Kwargs are configurable in main form, so would be redundant here for development */}

        <FormFieldSet
          label="Constraints"
          description="Specify the token constraints for this particular model"
        >
          <FormField label="Constraint: Max Input Length" stretch>
            <Input
              type="number"
              value={String(value.constraints?.maxInputLength || "")}
              onChange={({ detail }) => {
                updateValue((x) => {
                  if (isEmpty(detail.value)) {
                    if (has<ICustomModel>(x, "constraints.maxInputLength")) {
                      set<ICustomModel>(
                        x,
                        "constraints.maxInputLength",
                        undefined
                      );
                    }
                  } else {
                    set<ICustomModel>(
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
              value={String(value.constraints?.maxTotalTokens || "")}
              onChange={({ detail }) => {
                updateValue((x) => {
                  if (isEmpty(detail.value)) {
                    if (has<ICustomModel>(x, "constraints.maxTotalTokens")) {
                      set<ICustomModel>(
                        x,
                        "constraints.maxTotalTokens",
                        undefined
                      );
                    }
                  } else {
                    set<ICustomModel>(
                      x,
                      "constraints.maxTotalTokens",
                      parseInt(detail.value)
                    );
                  }
                });
              }}
            />
          </FormField>
        </FormFieldSet>

        <FormFieldSet
          label="Content Handler"
          description={
            <>
              Specify how model requests I/O is handled (
              <Link href="https://lodash.com/docs/4.17.15#set" target="_blank">
                path syntax
              </Link>
              )
            </>
          }
        >
          <FormField
            stretch
            label="Input: Prompt Key"
            description="Path in input object to define the prompt value."
            constraintText="Default to `text_inputs`"
          >
            <Input
              value={value.adapter?.contentHandler?.input?.promptKey || ""}
              onChange={({ detail }) => {
                updateValue((x) => {
                  if (isEmpty(detail.value)) {
                    if (
                      has<ICustomModel>(
                        x,
                        "adapter.contentHandler.input.promptKey"
                      )
                    ) {
                      set<ICustomModel>(
                        x,
                        "adapter.contentHandler.input.promptKey",
                        undefined
                      );
                    }
                  } else {
                    set<ICustomModel>(
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
              value={value.adapter?.contentHandler?.input?.modelKwargsKey || ""}
              onChange={({ detail }) => {
                updateValue((x) => {
                  if (isEmpty(detail.value)) {
                    if (
                      has<ICustomModel>(
                        x,
                        "adapter.contentHandler.input.modelKwargsKey"
                      )
                    ) {
                      set<ICustomModel>(
                        x,
                        "adapter.contentHandler.input.modelKwargsKey",
                        undefined
                      );
                    }
                  } else {
                    set<ICustomModel>(
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
              value={value.adapter?.contentHandler?.output?.jsonpath || ""}
              onChange={({ detail }) => {
                updateValue((x) => {
                  if (isEmpty(detail.value)) {
                    if (
                      has<ICustomModel>(
                        x,
                        "adapter.contentHandler.output.jsonpath"
                      )
                    ) {
                      set<ICustomModel>(
                        x,
                        "adapter.contentHandler.output.jsonpath",
                        undefined
                      );
                    }
                  } else {
                    set<ICustomModel>(
                      x,
                      "adapter.contentHandler.output.jsonpath",
                      detail.value
                    );
                  }
                });
              }}
            />
          </FormField>
        </FormFieldSet>
      </SpaceBetween>
    </Container>
  );
};
