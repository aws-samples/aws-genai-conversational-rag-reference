/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { RemovalPolicy, Stack, Stage } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import shorthash = require('shorthash2');

/**
 * Get root stack based on scope
 * @param scope
 * @returns
 */
export function getRootStack(scope: IConstruct): Stack {
  let stack = Stack.of(scope);
  while (stack.nestedStackParent) {
    stack = stack.nestedStackParent;
  }
  return stack;
}

/**
 * Get name of stage based on scope
 * @param scope
 * @param defaultValue
 * @returns
 */
export function getStageName(
  scope: IConstruct,
  defaultValue?: string,
): string | undefined {
  return Stage.of(scope)?.stageName ?? defaultValue;
}

/**
 * Indicates if scope is within development stage.
 * - If resource is not within a stage, it is considered development (sandbox/developer deployment)
 * - If stage the resource belongs to starts with "Dev" then it is considered development
 */
export function isDevStage(scope: IConstruct): boolean {
  const stage = getStageName(scope);
  return stage == null || stage.startsWith('Dev');
}

/**
 * Gets default removal policy for a resources based on the stage the resource belongs to.
 * - If in development stage (`isDevStage(scope)`) is true, then `RemovalPolicy.DESTROY`
 * - Otherwise, `RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE`
 */
export function stageAwareRemovalPolicy(scope: IConstruct): RemovalPolicy {
  return isDevStage(scope)
    ? RemovalPolicy.DESTROY
    : RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE;
}


export function getPowerToolsEnv(scope: IConstruct, applicationName: string): Record<string, string> {
  const stageName = getStageName(scope, 'Sandbox');
  const isDev = isDevStage(scope);

  return {
    LOG_LEVEL: isDev ? 'DEBUG' : 'INFO',
    POWERTOOLS_SERVICE_NAME: `${stageName}-${applicationName}`,
    POWERTOOLS_METRICS_NAMESPACE: `${stageName}-${applicationName}`,
  };
}

/**
 * Creates explicit resource name that is both deterministic and allows for resource to
 * be updated my moving in cdk tree. When moving this will change the name appendix, but
 * it will not fail the build due to existing resource.
 *
 * This should be used sparingly, for resources such as secret name and cross-account roles where
 * we need a some generally consistent and human-readable name.
 *
 * The hash appendix is generated from the stage name, region, and scope.node.addr.
 * @param scope Scope to hash against
 * @param resourceName Name of the resource to append safe hash to
 * @param prefix Prefix of the resource name
 * @returns Returned name with hash appendix.
 */
export function safeResourceName(scope: IConstruct, resourceName: string, prefix?: string): string {
  const stageName = getStageName(scope) || '';
  const hash = shorthash(stageName + Stack.of(scope).region + scope.node.addr);
  return `${prefix}-${resourceName}-${hash}`;
}
