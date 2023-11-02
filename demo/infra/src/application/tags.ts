/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { TagProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Tags used to identify core components in the application.
 * Used for filtering resource lists of dynamically name resourced.
 */
export enum GalileoComponentTags {
  CORPUS_INDEXING_BUCKET = 'CorpusIndexingBucket',
  CORPUS_INDEXING_STATEMACHINE = 'CorpusIndexingStateMachine',
}

export const APPLICATION_COMPONENT_TAG = 'ApplicationComponent';

export function tagAsComponent(component: GalileoComponentTags, resource: Construct, props?: TagProps): void {
  Tags.of(resource).add(APPLICATION_COMPONENT_TAG, component, props);
}
