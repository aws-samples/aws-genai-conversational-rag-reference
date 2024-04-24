/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import Select, { SelectProps } from '@cloudscape-design/components/select';
import { useEmbeddingModelInventory } from 'api-typescript-react-query-hooks';
import { useMemo } from 'react';

export interface EmbeddingModelSelectorProps {
  readonly value?: string;
  readonly onChange: (value: SelectProps.ChangeDetail) => void;
}

export const EmbeddingModelSelector = (props: EmbeddingModelSelectorProps) => {
  const embeddingModelInventory = useEmbeddingModelInventory();

  const embeddingModels = useMemo<SelectProps.Option[] | undefined>(() => {
    if (embeddingModelInventory && embeddingModelInventory.data) {
      const options: SelectProps.Option[] = Object.values(embeddingModelInventory.data.models).map((model) => ({
        label: model.modelRefKey,
        value: model.modelRefKey,
        tags: [model.modelId],
        labelTag: model.uuid === embeddingModelInventory.data.models[0].uuid ? 'Default' : undefined,
      }));
      return options;
    }
    return;
  }, [embeddingModelInventory]);

  const selectedModel = useMemo<SelectProps.Option | null>(() => {
    if (embeddingModels) {
      const embeddingModel = embeddingModels.find((model) => model.value === props.value);
      return embeddingModel || null;
    }
    return null;
  }, [embeddingModels, props.value]);

  return (
    <Select
      statusType={embeddingModels ? 'finished' : 'loading'}
      selectedOption={selectedModel}
      onChange={({ detail }) => props.onChange(detail)}
      options={embeddingModels}
    />
  );
};
