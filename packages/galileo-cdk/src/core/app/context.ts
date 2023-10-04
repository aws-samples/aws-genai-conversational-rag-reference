/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as path from 'node:path';
import { Annotations, Stack, Stage } from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { IConstruct } from 'constructs';
import {
  getStageName,
  getRootStack,
  safeResourceName as _safeResourceName,
  getPowerToolsEnv as _getPowerToolsEnv,
} from '../../common/utils';

export interface IApplicationContext {
  /**
   * Name of the application, which derives the stacks names, explicit resource names, and other resource like naming
   * @required
   */
  readonly applicationName: string;
  /**
   * Username of the admin user to create. If undefined, no admin user will be automatically created.
   * @required If AdminEmail is defined
   */
  readonly adminUsername?: string;
  /**
   * Email of administrator user, which if supplied will auto create the admin user.
   * - If undefined, no admin user will be created by default
   * @required If AdminUsername is defined
   */
  readonly adminEmail?: string;
  /**
   * Relative directory path from infra to where the website build output is located
   * @required
   */
  readonly websiteContentPath: string;
  /**
   * Relative path to the relative directory path from infra to where corpus Dockerfile is located
   * @required
   */
  readonly corpusDockerImagePath: string;
  /**
   * Indicates if sample dataset is synthesized and deployed with the application.
   * @default false
   * @experimental
   */
  readonly includeSampleDataset?: boolean;
  /**
   * Geo restriction for CloudFront website distribution allow list.
   * @default undefined - No geo restrictions applied
   */
  readonly geoRestriction?: string | string[];
  /**
   * Domain uses for inference engine - this tells the agent what domain/field it is it to help improve interaction
   * @required
   * @experimental
   */
  readonly chatDomain: string;
  /**
   * Region to deploy the foundation model stack to. Useful for regions with limited service
   * and/or instance capacity.
   * @default string Default application region
   * @experimental
   */
  readonly foundationModelRegion?: string;
  /**
   * List of predefined foundation models to deploy
   * @default undefined Will deploy the default set of predefined models
   * @experimental
   */
  readonly foundationModels?: string[];
  /**
   * List of bedrock model ids to integrate with.
   * @example ["amazon.titan-tg1-large", "anthropic.claude-v1"]
   * @default ["amazon.titan-tg1-large"]
   * @experimental
   */
  readonly bedrockModelIds?: string[];
  /**
   * Bedrock region to invoke
   * @example "us-west-2"
   * @default undefined - Defaults to FoundationModelRegion
   * @experimental
   */
  readonly bedrockRegion?: string;
  /**
   * Override Bedrock service endpoint url
   * @example "custom.endpoint.awsamazon.com"
   * @experimental
   * @development
   */
  readonly bedrockEndpointUrl?: string;
  /**
   * Get the default foundation model id.
   * @default undefined will use the default defined in code
   * @experimental
   */
  readonly defaultModelId?: string;
  /**
   * Development helper to automatically wire up cross-account role used for utilizing
   * foundation model stack deployment from another account. Useful for developer sandbox account
   * that do not deploy the foundation model stack to utilize the cross-account trust from the
   * primary development account deployment.
   * @development
   * @experimental
   */
  readonly foundationModelCrossAccountRoleArn?: string;
  /**
   * Development helper to decouple the root stacks for sandbox deployment of the
   * application stack without deploying the foundation model stack.
   * @development
   * @experimental
   */
  readonly decoupleStacks?: boolean;

  /**
   * Disables support for SSM config.
   * @development
   * @experimental
   */
  readonly disableSsmConfigSupport?: boolean;
}

export type IApplicationContextKey = keyof IApplicationContext;

function resolveList(
  value?: string | string[],
  defaultValue: string[] | undefined = undefined,
): string[] | undefined {
  if (value === '') {
    return defaultValue;
  }
  if (value == null) {
    return defaultValue;
  }

  if (Array.isArray(value)) {
    return value;
  }

  return value.split(/[,;]/g).map((v) => v.trim());
}

function resolveBoolean(
  value?: string | boolean,
  defaultValue: boolean = false,
): boolean {
  if (value == null) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return /^(1|y(es)|t(rue)$)/i.test(value);
}

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
