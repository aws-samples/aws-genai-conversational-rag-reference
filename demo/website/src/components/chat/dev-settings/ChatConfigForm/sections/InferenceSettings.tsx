/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  ModelFramework,
  ISageMakerEndpointModelFramework,
} from "@aws/galileo-sdk/lib/models/types";
import { Icon } from "@cloudscape-design/components";
import FormField from "@cloudscape-design/components/form-field";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { isEmpty } from "lodash";
import { FC, useCallback, useEffect } from "react";
import { Updater } from "use-immer";
import { useFoundationModelInventory } from "../../../../../hooks/llm-inventory";
import { useChatEngineConfigState } from "../../../../../providers/ChatEngineConfig";
import CodeEditor from "../../../../code-editor";
import { toCodeEditorJson } from "../../utils";
import {
  CustomModelEditor,
  ICustomModel,
} from "../components/CustomModelEditor";
import { CUSTOM_VALUE, ModelSelector } from "../components/ModelSelector";

export const InferenceSettings: FC = () => {
  const inventory = useFoundationModelInventory();
  const [llmModel, setLlmModel] = useChatEngineConfigState("llmModel");
  const [llmModelKwargs, setLlmModelKwargs] =
    useChatEngineConfigState("llmModelKwargs");
  const [llmEndpointKwargs, setLlmEndpointKwargs] =
    useChatEngineConfigState("llmEndpointKwargs");

  const isCustomLlmModel = (llmModel as ICustomModel)?.isCustom === true;

  const onModelSelected = useCallback((value: string) => {
    if (value === CUSTOM_VALUE) {
      setLlmModel({
        isCustom: true,
        name: "custom:custom",
        framework: {
          type: ModelFramework.SAGEMAKER_ENDPOINT,
        },
      } as ICustomModel);
    } else {
      setLlmModel({
        uuid: value,
      });
    }
  }, []);

  // update default model/endpoint kwargs based on selected model
  useEffect(() => {
    const uuid = llmModel?.uuid as string | undefined;
    if (inventory && uuid) {
      const predefinedModel = inventory.models[uuid];
      if (predefinedModel) {
        setLlmModelKwargs(predefinedModel.framework.modelKwargs);
        setLlmEndpointKwargs(
          (predefinedModel.framework as ISageMakerEndpointModelFramework)
            .endpointKwargs
        );
      }
    }
  }, [inventory, llmModel?.uuid]);

  const updateCustomModel: Updater<ICustomModel> = useCallback(
    (x) => {
      setLlmModel((draft: any) => {
        if (typeof x === "function") {
          x(draft);
          return draft;
        } else if (isEmpty(x)) {
          return undefined;
        } else {
          return x;
        }
      });
    },
    [setLlmModel]
  );

  return (
    <SpaceBetween direction="vertical" size="s">
      <FormField
        label="LLM model"
        stretch
        constraintText={
          <>
            <Icon name="status-warning" size="small" /> Settings will be
            overridden to selected model defaults (Kwargs / Prompts)
          </>
        }
      >
        <ModelSelector
          custom
          value={isCustomLlmModel ? CUSTOM_VALUE : llmModel?.uuid}
          onChange={onModelSelected}
        />
      </FormField>
      {isCustomLlmModel && (
        <CustomModelEditor value={llmModel} updateValue={updateCustomModel} />
      )}
      <FormField label="Model Kwargs" stretch>
        <CodeEditor
          language="json"
          value={toCodeEditorJson(llmModelKwargs)}
          onChange={({ detail }) => {
            try {
              detail.value.length &&
                setLlmModelKwargs(JSON.parse(detail.value));
            } catch (error) {
              console.warn(
                "Failed to parse `LLM Model Kwargs`",
                detail.value,
                error
              );
            }
          }}
        />
      </FormField>
      <FormField label="Model Endpoint Kwargs" stretch>
        <CodeEditor
          language="json"
          value={toCodeEditorJson(llmEndpointKwargs)}
          onChange={({ detail }) => {
            try {
              detail.value.length &&
                setLlmEndpointKwargs(JSON.parse(detail.value));
            } catch (error) {
              console.warn(
                "Failed to parse `LLM Endpoint Kwargs`",
                detail.value,
                error
              );
            }
          }}
        />
      </FormField>
    </SpaceBetween>
  );
};
