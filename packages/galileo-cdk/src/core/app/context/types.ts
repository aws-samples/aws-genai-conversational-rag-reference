/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
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

  /**
   * Indicates if tooling stack is deployed in the dev stage
   * - SageMaker Studio pre-configured in vpc with permissions on most resources
   * @default false
   */
  readonly tooling?: boolean;
}

export type IApplicationContextKey = keyof IApplicationContext;
