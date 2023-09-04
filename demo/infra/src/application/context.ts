/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as path from "node:path";
import { Annotations, RemovalPolicy, Stack, Stage } from "aws-cdk-lib";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { IConstruct } from "constructs";
import shorthash from "shorthash2";
import { FoundationModelIds } from "./ai/foundation-models/ids";

export interface IApplicationContext {
  /**
   * Name of the application, which derives the stacks names, explicit resource names, and other resource like naming
   * @required
   */
  readonly ApplicationName: string;
  /**
   * Username of the admin user to create. If undefined, no admin user will be automatically created.
   * @required If AdminEmail is defined
   */
  readonly AdminUsername?: string;
  /**
   * Email of administrator user, which if supplied will auto create the admin user.
   * - If undefined, no admin user will be created by default
   * @required If AdminUsername is defined
   */
  readonly AdminEmail?: string;
  /**
   * Relative directory path from infra to where the website build output is located
   * @required
   */
  readonly WebsiteContentPath: string;
  /**
   * Relative path to the relative directory path from infra to where corpus Dockerfile is located
   * @required
   */
  readonly CorpusDockerImagePath: string;
  /**
   * Indicates if sample dataset is synthesized and deployed with the application.
   * @default false
   * @experimental
   */
  readonly IncludeSampleDataset?: boolean;
  /**
   * Geo restriction for CloudFront website distribution allow list.
   * @default undefined - No geo restrictions applied
   */
  readonly GeoRestriction?: string | string[];
  /**
   * Domain uses for inference engine - this tells the agent what domain/field it is it to help improve interaction
   * @required
   * @experimental
   */
  readonly ChatDomain: string;
  /**
   * Region to deploy the foundation model stack to. Useful for regions with limited service
   * and/or instance capacity.
   * @default string Default application region
   * @experimental
   */
  readonly FoundationModelRegion?: string;
  /**
   * List of predefined foundation models to deploy
   * @default undefined Will deploy the default set of predefined models
   * @experimental
   */
  readonly FoundationModels?: FoundationModelIds[];
  /**
   * Get the default foundation model id.
   * @default undefined will use the default defined in code
   * @experimental
   */
  readonly DefaultModelId?: string;
  /**
   * Development helper to automatically wire up cross-account role used for utilizing
   * foundation model stack deployment from another account. Useful for developer sandbox account
   * that do not deploy the foundation model stack to utilize the cross-account trust from the
   * primary development account deployment.
   * @development
   * @experimental
   */
  readonly FoundationModelCrossAccountRoleArn?: string;
  /**
   * Development helper to decouple the root stacks for sandbox deployment of the
   * application stack without deploying the foundation model stack.
   * @development
   * @experimental
   */
  readonly DecoupleStacks?: boolean;

  /**
   * Disables support for SSM config.
   * @development
   * @experimental
   */
  readonly DisableSsmConfigSupport?: boolean;
}

export type IApplicationContextKey = keyof IApplicationContext;

function resolveList(
  value?: string | string[],
  defaultValue: string[] | undefined = undefined
): string[] | undefined {
  if (value === "") {
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
  defaultValue: boolean = false
): boolean {
  if (value == null) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return /^(1|y(es)|t(rue)$)/i.test(value);
}

export interface IApplicationConfig {
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
   * Absolute directory path from infra to where the website build output is located
   * @required
   */
  readonly websiteContentPath: string;
  /**
   * Absolute path to the relative directory path from infra to where corpus Dockerfile is located
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
  readonly geoRestriction?: string[];
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
  readonly foundationModels?: FoundationModelIds[];
  /**
   * Get the default foundation model id
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
}

export class ApplicationConfig implements IApplicationConfig {
  static readonly SSM_PARAMETER_NAME: string = "Galileo-ApplicationConfig";

  static of(scope: IConstruct): ApplicationConfig {
    const root = Stage.of(scope) || getRootStack(scope);

    if (!this._lookup.has(root)) {
      this._lookup.set(root, new ApplicationConfig(root));
    }

    return this._lookup.get(root)!;
  }

  private static readonly _lookup = new Map<Stack | Stage, ApplicationConfig>();

  readonly applicationName: string;
  readonly adminEmail?: string;
  readonly adminUsername?: string;
  readonly websiteContentPath: string;
  readonly corpusDockerImagePath: string;
  readonly includeSampleDataset?: boolean;
  readonly geoRestriction?: string[];
  readonly chatDomain: string;
  readonly foundationModelRegion?: string;
  readonly foundationModels?: FoundationModelIds[];
  readonly defaultModelId?: string;
  readonly foundationModelCrossAccountRoleArn?: string;
  readonly decoupleStacks?: boolean;

  private constructor(scope: Stage | Stack) {
    const stageName = getStageName(scope) ?? "Dev";

    const ssmContext: Partial<IApplicationContext> = {};
    const ssmSupport = !resolveBoolean(
      this.tryGetContext<boolean>(scope, "DisableSsmConfigSupport"),
      false
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
            ApplicationConfig.SSM_PARAMETER_NAME
          );
          Object.assign(ssmContext, JSON.parse(paramValue));
        } catch (error) {
          // ignore - expected to failed unless the parameter was created
        }

        // stage ssm
        try {
          const paramValue = StringParameter.valueFromLookup(
            scope,
            `${stageName}-${ApplicationConfig.SSM_PARAMETER_NAME}`
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
      ssmContext.ApplicationName ??
      this.getContext<string>(scope, "ApplicationName");

    this.adminUsername =
      ssmContext.AdminUsername ??
      this.tryGetContext<string>(scope, "AdminUsername");
    this.adminEmail =
      ssmContext.AdminEmail ?? this.tryGetContext<string>(scope, "AdminEmail");

    this.websiteContentPath = this.resolvePath(
      ssmContext.WebsiteContentPath ??
        this.getContext<string>(scope, "WebsiteContentPath")
    );
    this.corpusDockerImagePath = this.resolvePath(
      ssmContext.CorpusDockerImagePath ??
        this.getContext<string>(scope, "CorpusDockerImagePath")
    );
    this.chatDomain =
      ssmContext.ChatDomain ?? this.getContext<string>(scope, "ChatDomain");
    this.defaultModelId =
      ssmContext.DefaultModelId ??
      this.tryGetContext<string>(scope, "DefaultModelId");
    this.decoupleStacks =
      ssmContext.DecoupleStacks ??
      resolveBoolean(
        this.tryGetContext<boolean>(scope, "DecoupleStacks"),
        false
      );
    this.foundationModelCrossAccountRoleArn =
      ssmContext.FoundationModelCrossAccountRoleArn ??
      this.tryGetContext<string>(scope, "FoundationModelCrossAccountRoleArn");
    this.foundationModelRegion =
      ssmContext.FoundationModelRegion ??
      this.tryGetContext<string>(scope, "FoundationModelRegion");
    // TODO: adding this temp env for cicd in dev account to set models, later will improve this
    this.foundationModels = (
      process.env.GALILEO_FOUNDATION_MODELS
        ? process.env.GALILEO_FOUNDATION_MODELS.split(",")
        : resolveList(
            ssmContext.FoundationModels ??
              this.tryGetContext(scope, "FoundationModels")
          )
    ) as FoundationModelIds[] | undefined;
    this.geoRestriction = resolveList(
      ssmContext.GeoRestriction ?? this.tryGetContext(scope, "GeoRestriction")
    );
    this.includeSampleDataset =
      ssmContext.IncludeSampleDataset ??
      resolveBoolean(this.tryGetContext(scope, "IncludeSampleDataset"), false);
  }

  private getContext<T extends any>(
    scope: IConstruct,
    key: keyof IApplicationContext
  ): T {
    return scope.node.getContext(key);
  }

  private tryGetContext<T extends any>(
    scope: IConstruct,
    key: keyof IApplicationContext
  ): T | undefined {
    return scope.node.tryGetContext(key);
  }

  private resolvePath(value: string): string {
    return path.resolve(process.cwd(), value);
  }
}

export const APPLICATION_NAME = "@galileo/ApplicationName";

export function getStageName(
  scope: IConstruct,
  defaultValue?: string
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
  return stage == null || stage.startsWith("Dev");
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

export function getRootStack(scope: IConstruct): Stack {
  let stack = Stack.of(scope);
  while (stack.nestedStackParent) {
    stack = stack.nestedStackParent;
  }
  return stack;
}

export function getPowerToolsEnv(scope: IConstruct): Record<string, string> {
  const stageName = getStageName(scope, "Sandbox");
  const isDev = isDevStage(scope);
  const applicationName = ApplicationConfig.of(scope).applicationName;

  return {
    LOG_LEVEL: isDev ? "DEBUG" : "INFO",
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
 * @param name Name of the resource to append safe hash to
 * @returns Returned name with hash appendix.
 */
export function safeResourceName(scope: IConstruct, name: string): string {
  const stageName = getStageName(scope) || "";
  const applicationName = ApplicationConfig.of(scope).applicationName;
  const hash = shorthash(stageName + Stack.of(scope).region + scope.node.addr);
  return `${applicationName}-${name}-${hash}`;
}
