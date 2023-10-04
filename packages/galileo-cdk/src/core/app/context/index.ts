/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as path from 'node:path';
import { Annotations, Stack, Stage } from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { IConstruct } from 'constructs';
import { IApplicationContext } from './types';
import { resolveBoolean, resolveList } from './utils';
import {
  getStageName,
  getRootStack,
  safeResourceName as _safeResourceName,
  getPowerToolsEnv as _getPowerToolsEnv,
} from '../../../common/utils';

export { IApplicationContext, IApplicationContextKey } from './types';

export class ApplicationContext implements IApplicationContext {
  /**
   * Version of config spec following semver.
   * - CLI will check this and only allow auto deploy for compatible version
   * - TODO: in future will add migration and other stuff to support different versions.
   */
  static readonly VERSION: string = '0.0.0';
  static readonly SSM_PARAMETER_NAME: string = 'Galileo-ApplicationConfig';

  static of(scope: IConstruct): ApplicationContext {
    const root = Stage.of(scope) || getRootStack(scope);

    if (!this._lookup.has(root)) {
      this._lookup.set(root, new ApplicationContext(root));
    }

    return this._lookup.get(root)!;
  }

  static getPowerToolsEnv(scope: IConstruct): Record<string, string> {
    return _getPowerToolsEnv(scope, ApplicationContext.of(scope).applicationName);
  }

  static safeResourceName(
    scope: IConstruct,
    resourceName: string,
  ): string {
    return _safeResourceName(
      scope,
      resourceName,
      ApplicationContext.of(scope).applicationName,
    );
  }

  private static readonly _lookup = new Map<Stack | Stage, ApplicationContext>();

  static get MAJOR_VERSION(): Number {
    return parseInt(this.VERSION.split('.')[0]);
  }

  readonly applicationName: string;
  readonly adminEmail?: string;
  readonly adminUsername?: string;
  readonly websiteContentPath: string;
  readonly corpusDockerImagePath: string;
  readonly includeSampleDataset?: boolean;
  readonly geoRestriction?: string[];
  readonly chatDomain: string;
  readonly foundationModelRegion?: string;
  readonly foundationModels?: string[];
  readonly bedrockModelIds?: string[] | undefined;
  readonly bedrockRegion?: string | undefined;
  readonly bedrockEndpointUrl?: string | undefined;
  readonly defaultModelId?: string;
  readonly foundationModelCrossAccountRoleArn?: string;
  readonly decoupleStacks?: boolean;
  readonly tooling?: boolean | undefined;

  private constructor(scope: Stage | Stack) {
    const stageName = getStageName(scope) ?? 'Dev';

    const ssmContext: Partial<IApplicationContext> = {};
    const ssmSupport = !resolveBoolean(
      this.tryGetContext<boolean>(scope, 'disableSsmConfigSupport'),
      false,
    );
    if (ssmSupport) {
      let _stackOf = Stack.of,
        _annotationsOf = Annotations.of;
      try {
        // HACK: support Stage level SSM Context Provider
        if (scope instanceof Stage) {
          _stackOf = Stack.of;
          _annotationsOf = Annotations.of;
          Stack.of = (_scope: IConstruct) => {
            return {
              account: scope.account,
              region: scope.region,
              reportMissingContextKey: () => {},
            } as unknown as Stack;
          };
          Annotations.of = (_scope: IConstruct) => {
            return {
              addError: () => {},
            } as unknown as Annotations;
          };
        }

        // default ssm
        try {
          const paramValue = StringParameter.valueFromLookup(
            scope,
            ApplicationContext.SSM_PARAMETER_NAME,
          );
          Object.assign(ssmContext, JSON.parse(paramValue));
        } catch (error) {
          // ignore - expected to failed unless the parameter was created
        }

        // stage ssm
        try {
          const paramValue = StringParameter.valueFromLookup(
            scope,
            `${stageName}-${ApplicationContext.SSM_PARAMETER_NAME}`,
          );
          Object.assign(ssmContext, JSON.parse(paramValue));
        } catch (error) {
          // ignore - expected to failed unless the parameter was created
        }
      } finally {
        // Reset hacks
        Stack.of = _stackOf;
        Annotations.of = _annotationsOf;
      }
    }

    this.applicationName =
      ssmContext.applicationName ??
      this.getContext<string>(scope, 'applicationName');

    this.adminUsername =
      ssmContext.adminUsername ??
      this.tryGetContext<string>(scope, 'adminUsername');
    this.adminEmail =
      ssmContext.adminEmail ?? this.tryGetContext<string>(scope, 'adminEmail');

    this.websiteContentPath = this.resolvePath(
      ssmContext.websiteContentPath ??
        this.getContext<string>(scope, 'websiteContentPath'),
    );
    this.corpusDockerImagePath = this.resolvePath(
      ssmContext.corpusDockerImagePath ??
        this.getContext<string>(scope, 'corpusDockerImagePath'),
    );
    this.chatDomain =
      ssmContext.chatDomain ?? this.getContext<string>(scope, 'chatDomain');
    this.defaultModelId =
      ssmContext.defaultModelId ??
      this.tryGetContext<string>(scope, 'defaultModelId');
    this.decoupleStacks =
      ssmContext.decoupleStacks ??
      resolveBoolean(
        this.tryGetContext<boolean>(scope, 'decoupleStacks'),
        false,
      );
    this.foundationModelCrossAccountRoleArn =
      ssmContext.foundationModelCrossAccountRoleArn ??
      this.tryGetContext<string>(scope, 'foundationModelCrossAccountRoleArn');
    this.foundationModelRegion =
      ssmContext.foundationModelRegion ??
      this.tryGetContext<string>(scope, 'foundationModelRegion');
    // TODO: adding this temp env for cicd in dev account to set models, later will improve this
    this.foundationModels = (
      process.env.GALILEO_FOUNDATION_MODELS
        ? process.env.GALILEO_FOUNDATION_MODELS.split(',')
        : resolveList(
          ssmContext.foundationModels ??
              this.tryGetContext(scope, 'foundationModels'),
        )
    );
    this.bedrockModelIds = resolveList(
      ssmContext.bedrockModelIds ?? this.tryGetContext(scope, 'bedrockModelIds'),
    );
    this.bedrockRegion =
      process.env.GALILEO_BEDROCK_REGION ??
      ssmContext.bedrockRegion ??
      this.tryGetContext(scope, 'bedrockRegion');
    this.bedrockEndpointUrl =
      process.env.GALILEO_BEDROCK_ENDPOINT_URL ??
      ssmContext.bedrockEndpointUrl ??
      this.tryGetContext(scope, 'bedrockEndpointUrl');
    this.geoRestriction = resolveList(
      ssmContext.geoRestriction ?? this.tryGetContext(scope, 'geoRestriction'),
    );
    this.includeSampleDataset =
      ssmContext.includeSampleDataset ??
      resolveBoolean(this.tryGetContext(scope, 'includeSampleDataset'), false);
    this.tooling =
      ssmContext.tooling ??
      resolveBoolean(this.tryGetContext(scope, 'tooling'), false);
  }

  private getContext<T extends any>(
    scope: IConstruct,
    key: keyof IApplicationContext,
  ): T {
    return scope.node.getContext(key);
  }

  private tryGetContext<T extends any>(
    scope: IConstruct,
    key: keyof IApplicationContext,
  ): T | undefined {
    return scope.node.tryGetContext(key);
  }

  private resolvePath(value: string): string {
    return path.resolve(process.cwd(), value);
  }
}
