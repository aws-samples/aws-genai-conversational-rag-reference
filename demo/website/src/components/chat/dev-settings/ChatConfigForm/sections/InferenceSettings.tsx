/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { ModelFramework, ISageMakerEndpointModelFramework } from '@aws/galileo-sdk/lib/models/types';
import { Icon } from '@cloudscape-design/components';
import FormField from '@cloudscape-design/components/form-field';
import SpaceBetween from '@cloudscape-design/components/space-between';
import produce from 'immer';
import { isEmpty } from 'lodash';
import { FC, useCallback } from 'react';
import { Updater } from 'use-immer';
import { useIsAdmin } from '../../../../../Auth';
import { useFoundationModelInventory } from '../../../../../hooks/llm-inventory';
import { useChatEngineConfigState } from '../../../../../providers/ChatEngineConfig';
import CodeEditor from '../../../../code-editor';
import { toCodeEditorJson } from '../../utils';
import { CustomModelEditor, ICustomModel } from '../components/CustomModelEditor';
import { CUSTOM_VALUE, ModelSelector } from '../components/ModelSelector';

export const InferenceSettings: FC = () => {
  const isAdmin = useIsAdmin();
  const inventory = useFoundationModelInventory();
  const [llm, setLlm] = useChatEngineConfigState('llm');

  // Only allow custom models for admins
  const isCustomLlmModel = isAdmin && (llm?.model as ICustomModel)?.isCustom === true;

  const onModelSelected = useCallback(
    (value: string) => {
      if (isAdmin && value === CUSTOM_VALUE) {
        setLlm((draft) => {
          return {
            ...draft,
            model: {
              isCustom: true,
              name: 'custom:custom',
              framework: {
                type: ModelFramework.SAGEMAKER_ENDPOINT,
              },
            } as ICustomModel,
          };
        });
      } else {
        setLlm((draft) => {
          return {
            ...draft,
            model: {
              uuid: value,
            },
          };
        });
      }
    },
    [isAdmin],
  );

  const predefinedModel = llm?.model?.uuid && inventory?.models ? inventory.models[llm.model.uuid] : undefined;
  const modelKwargs = llm?.modelKwargs ?? predefinedModel?.framework.modelKwargs;
  const endpointKwargs =
    llm?.endpointKwargs ?? (predefinedModel?.framework as ISageMakerEndpointModelFramework)?.endpointKwargs;

  const updateCustomModel = useCallback<Updater<ICustomModel>>(
    (x) => {
      if (isAdmin) {
        return;
      }
      setLlm((draft) => {
        let nextModel;
        if (typeof x === 'function') {
          nextModel = produce(draft?.model || {}, x);
        } else if (isEmpty(x)) {
          nextModel = undefined;
        } else {
          nextModel = x;
        }

        return {
          ...draft,
          model: nextModel,
        };
      });
    },
    [setLlm],
  );

  return (
    <SpaceBetween direction="vertical" size="s">
      <FormField
        label="LLM model"
        stretch
        constraintText={
          <>
            <Icon name="status-warning" size="small" /> Settings will be overridden to selected model defaults (Kwargs /
            Prompts)
          </>
        }
      >
        <ModelSelector
          custom={isAdmin}
          value={isCustomLlmModel ? CUSTOM_VALUE : llm?.model?.uuid}
          onChange={onModelSelected}
        />
      </FormField>
      {isCustomLlmModel && <CustomModelEditor value={llm?.modelKwargs} updateValue={updateCustomModel} />}
      <FormField label="Model Kwargs" stretch>
        <CodeEditor
          language="json"
          value={toCodeEditorJson(modelKwargs)}
          onDelayedChange={({ detail }) => {
            try {
              if (detail.value.length) {
                const value = JSON.parse(detail.value);
                setLlm((draft) => {
                  return {
                    ...draft,
                    modelKwargs: value,
                  };
                });
              }
            } catch (error) {
              console.warn('Failed to parse `LLM Model Kwargs`', detail.value, error);
            }
          }}
        />
      </FormField>
      <FormField label="Model Endpoint Kwargs" stretch>
        <CodeEditor
          language="json"
          value={toCodeEditorJson(endpointKwargs)}
          onDelayedChange={({ detail }) => {
            try {
              if (detail.value.length) {
                const value = JSON.parse(detail.value);
                setLlm((draft) => {
                  return {
                    ...draft,
                    endpointKwargs: value,
                  };
                });
              }
            } catch (error) {
              console.warn('Failed to parse `LLM Endpoint Kwargs`', detail.value, error);
            }
          }}
        />
      </FormField>
    </SpaceBetween>
  );
};
