/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import Select, { SelectProps } from "@cloudscape-design/components/select";
import { startCase } from "lodash";
import { useMemo } from "react";
import { useFoundationModelInventory } from "../../../hooks/llm-inventory";

export const CUSTOM_VALUE = "::CUSTOM::";

export interface ModelSelectorProps {
  readonly value?: string | object;
  readonly onChange: (value: string) => void;
  readonly none?: boolean;
  readonly noneLabel?: string;
  readonly noneValue?: any;
  readonly custom?: boolean;
  readonly customLabel?: string;
  readonly customValue?: any;
}

export const ModelSelector = (props: ModelSelectorProps) => {
  const inventory = useFoundationModelInventory();
  const options = useMemo<SelectProps.Option[] | undefined>(() => {
    if (inventory) {
      const _options = Object.values(inventory.models).map((model) => ({
        label: model.name || startCase(model.uuid),
        value: model.uuid,
      }));

      if (props.none) {
        _options.unshift({
          label: props.noneLabel ?? "- None -",
          value: props.noneValue,
        });
      }

      if (props.custom) {
        _options.push({
          label: props.customLabel ?? "- Custom -",
          value: props.customValue ?? CUSTOM_VALUE,
        });
      }

      return _options;
    } else {
      return;
    }
  }, [
    inventory,
    props.none,
    props.noneLabel,
    props.noneValue,
    props.custom,
    props.customLabel,
    props.customValue,
  ]);
  const selection = useMemo<SelectProps.Option | null>(() => {
    if (options && props.value) {
      let _value: string | object | null | undefined = props.value;
      if (props.custom && typeof _value !== "string") {
        _value = props.customValue ?? CUSTOM_VALUE;
      }
      if (_value == null) {
        _value = props.none ? null : inventory?.defaultModelId;
      }
      return (
        options.find(
          (v) =>
            v.value === _value ||
            (_value &&
              typeof _value === "object" &&
              v.value === (_value as any).value)
        ) || null
      );
    } else {
      return null;
    }
  }, [
    options,
    props.value,
    props.none,
    props.custom,
    props.customValue,
    inventory?.defaultModelId,
  ]);

  return (
    <Select
      statusType={options ? "finished" : "loading"}
      selectedOption={selection}
      onChange={({ detail }) => props.onChange(detail.selectedOption.value!)}
      options={options}
    />
  );
};
