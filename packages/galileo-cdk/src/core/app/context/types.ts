/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { IEmbeddingModelInfo } from '@aws/galileo-sdk/lib/models';
import { FoundationModelIds } from '../../../ai/predefined/ids';

/** Default path for config file for application */
export const APPLICATION_CONFIG_JSON = 'config.json';

export interface IApplicationContext {
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
   * Relative path to the config file
   * @required
   */
  readonly configPath?: string;

  /**
   * Enables support for SSM config.
   * @development
   * @experimental
   * @default false
   */
  readonly enableSsmConfigSupport?: boolean;
  /**
   * Development helper to automatically wire up cross-account role used for utilizing
   * foundation model stack deployment from another account. Useful for developer sandbox account
   * that do not deploy the foundation model stack to utilize the cross-account trust from the
   * primary development account deployment.
   * @development
   * @experimental
   */
  readonly foundationModelCrossAccountRoleArn?: string;
}

export type IApplicationContextKey = keyof IApplicationContext;

export type ModelProvider = 'sagemaker' | 'bedrock';

export enum SampleDataSets {
  SUPREME_COURT_CASES = 'SUPREME_COURT_CASES',
}

export interface ApplicationConfig {
  app: {
    /**
     * Custom name of the application, which derives the stacks names, explicit resource names, and other resource like naming.
     *
     * **WARNING:** Changing with after initial deployment will replace all resourced.
     */
    name: string;
  };
  identity: {
    /**
     * If provided, will automatically create admin user in cognito
     * - If undefined, no admin user will be created by default
     */
    admin?: {
      /**
       * Username of the admin user to create. If undefined, no admin user will be automatically created.
       */
      username: string;
      /**
       * Email of administrator user, which if supplied will auto create the admin user.
       */
      email: string;
    };
  };
  bedrock?: {
    enabled?: boolean;
    region?: string;
    endpointUrl?: string;
    roleArn?: string;
    // TODO: later make this all runtime based? do we need default model at least?
    // adding this here for now to support incremental refactoring
    models?: string[];
  };
  llms: {
    /**
     * Get the default foundation model id.
     * @default undefined will use the first model from the inventory
     * @experimental
     */
    defaultModel?: string;
    /**
     * Region to deploy the foundation model stack to. Useful for regions with limited service
     * and/or instance capacity.
     * @default string Default application region
     * @experimental
     */
    region?: string;
    predefined?: {
      /**
       * List of predefined sagemaker models to deploy
       * @experimental
       */
      sagemaker: FoundationModelIds[];
    };
  };
  rag: {
    samples?: {
      datasets: SampleDataSets[];
    };
    // TODO: support additional embedding models, currently just the default ManagedEmbedding model to match current
    embeddingsModels: IEmbeddingModelInfo[];
    // TODO: enable this one we support multiple rag engines
    // engines: {
    //   aurora: {
    //     enabled: true;
    //   };
    // };
  };
  chat: {
    /**
     * Domain uses for inference engine - this tells the agent what domain/field it is it to help improve interaction
     * @required
     * @experimental
     */
    domain: string;
  };
  website?: {
    /**
     * Geo restriction for CloudFront website distribution allow list.
     * @default undefined - No geo restrictions applied
     */
    geoRestriction?: string | string[];
  };

  tooling?: {
    sagemakerStudio?: boolean;
    pgadmin?: boolean;
  };
}
