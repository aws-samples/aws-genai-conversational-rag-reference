/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import type { IFoundationModelInventory } from "@aws/galileo-sdk/lib/models/inventory";
import { useLLMInventory } from "api-typescript-react-query-hooks";

export const useFoundationModelInventory = ():
  | IFoundationModelInventory
  | undefined => {
  return useLLMInventory().data?.inventory;
};
