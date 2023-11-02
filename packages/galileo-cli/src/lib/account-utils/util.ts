/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { APPLICATION_COMPONENT_TAG } from '../../internals';
import { Tag } from '../types';

/**
 * Checks if `tags` contain a specific key with a value.
 * @param tags The list or set of tags retrieved for a resource.
 * @param searchKey The tag key to search for.
 * @param searchValue The tag value to match.
 * @returns If the tag is present with the passed key and value.
 */
export const containsTag = (tags: Tag[] | Set<Tag>, searchKey: string, searchValue: string): boolean => {
  for (const tag of tags) {
    if (tag.key === searchKey && tag.value === searchValue) {
      return true;
    }
  }
  return false;
};

/**
 * Checks if `tags` contain a specific `application component tag` with a value.
 * @param tags The list or set of tags retrieved for a resource.
 * @param searchValue The `application component tag` value to match.
 * @returns If the tag is present.
 */
export const containsAppComponentTag = (tags: Tag[] | Set<Tag>, searchValue: string): boolean => {
  return containsTag(tags, APPLICATION_COMPONENT_TAG, searchValue);
};
