/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { DependencyType } from 'projen';
import { NodeProject } from 'projen/lib/javascript';

export function extractPeerDeps(project: NodeProject): string[] {
  return project.deps.all
    .filter((dep) => dep.type === DependencyType.PEER)
    .map((dep) => (dep.version ? `${dep.name}@${dep.version}` : dep.name));
}
