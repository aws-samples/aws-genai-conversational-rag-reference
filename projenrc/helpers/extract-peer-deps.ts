import { DependencyType } from 'projen';
import { NodeProject } from 'projen/lib/javascript';

export function extractPeerDeps(project: NodeProject): string[] {
  return project.deps.all
  .filter((dep) => dep.type === DependencyType.PEER)
  .map((dep) =>
    dep.version ? `${dep.name}@${dep.version}` : dep.name
  )
}
