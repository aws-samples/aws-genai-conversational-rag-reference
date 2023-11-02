/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { FoundationModelInventory } from '@aws/galileo-sdk/lib/models/inventory';
import { interceptors } from 'api-typescript-interceptors';
import { lLMInventoryHandler } from 'api-typescript-runtime';

export const handler = lLMInventoryHandler(...interceptors, async () => {
  const inventory = await FoundationModelInventory.inventory();

  return {
    statusCode: 200,
    body: {
      inventory,
    },
  };
});
