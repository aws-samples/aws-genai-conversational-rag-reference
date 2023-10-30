/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { APPLICATION_COMPONENT_TAG } from "../../internals";
import { Tag } from "../types";

export const checkTagsArray = (
  tags: Tag[],
  searchTagValue: string
): boolean => {
  for (const tag of tags) {
    if (tag.key === APPLICATION_COMPONENT_TAG && tag.value === searchTagValue) {
      return true;
    }
  }
  return false;
};
