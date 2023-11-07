/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as path from 'node:path';
import { Stack, Stage } from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { IConstruct } from 'constructs';
import * as fs from 'fs-extra';
import { DEFAULT_APPLICATION_CONFIG } from './defaults';
import { APPLICATION_CONFIG_JSON, ApplicationConfig, IApplicationContext } from './types';
import { mergeApplicationConfigs, resolveBoolean } from './utils';
import {
  getRootStack,
  safeResourceName as _safeResourceName,
  getPowerToolsEnv as _getPowerToolsEnv,
  getMetricNamespace as _getMetricNamespace,
} from '../../../common/utils';

export * from './types';
export * from './defaults';

export class ApplicationContext implements IApplicationContext {
  /**
   * Version of config spec following semver.
   * - CLI will check this and only allow auto deploy for compatible version
   * - TODO: in future perhaps add migration and other stuff to support different versions.
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

  static getMetricNamespace(scope: IConstruct): string {
    return _getMetricNamespace(scope, ApplicationContext.of(scope).applicationName);
  }

  static safeResourceName(scope: IConstruct, resourceName: string): string {
    return _safeResourceName(scope, resourceName, ApplicationContext.of(scope).applicationName);
  }

  private static readonly _lookup = new Map<Stack | Stage, ApplicationContext>();

  static get MAJOR_VERSION(): Number {
    return parseInt(this.VERSION.split('.')[0]);
  }

  applicationName: string;
  websiteContentPath: string;
  corpusDockerImagePath: string;
  configPath: string;
  enableSsmConfigSupport?: boolean | undefined;

  config: ApplicationConfig;

  constructor(scope: Stage | Stack) {
    let ssmConfig: ApplicationConfig | undefined = undefined;
    const ssmSupport = resolveBoolean(this.tryGetContext<boolean>(scope, 'enableSsmConfigSupport'), false);
    if (ssmSupport) {
      try {
        const paramValue = StringParameter.valueFromLookup(
          scope,
          process.env.GALIELO_SSM_CONFIG || ApplicationContext.SSM_PARAMETER_NAME,
        );
        ssmConfig = JSON.parse(paramValue);
      } catch (error) {
        // ignore - expected to failed unless the parameter was created
      }
    }

    this.websiteContentPath = this.resolvePath(this.getContext<string>(scope, 'websiteContentPath'));
    this.corpusDockerImagePath = this.resolvePath(this.getContext<string>(scope, 'corpusDockerImagePath'));

    this.configPath = this.resolvePath(
      process.env.GALILEO_CONFIG || this.tryGetContext<string>(scope, 'configPath') || APPLICATION_CONFIG_JSON,
    );

    // merge the supplied application config with the defaults to ensure any new features/updates are applied
    // use default array merge of replace
    this.config = mergeApplicationConfigs(DEFAULT_APPLICATION_CONFIG, ssmConfig || this.readConfig(this.configPath));

    this.applicationName = this.config.app.name;
  }

  private getContext<T extends any>(scope: IConstruct, key: keyof IApplicationContext): T {
    return scope.node.getContext(key);
  }

  private tryGetContext<T extends any>(scope: IConstruct, key: keyof IApplicationContext): T | undefined {
    return scope.node.tryGetContext(key);
  }

  private resolvePath(value: string): string {
    if (path.isAbsolute(value)) return value;
    return path.resolve(process.cwd(), value);
  }

  private readConfig(file: string): ApplicationConfig {
    file = this.resolvePath(file);

    if (!fs.existsSync(file)) {
      // no config file, use defaults
      console.info('No application config found, using defaults:', file);
      return DEFAULT_APPLICATION_CONFIG;
    }

    try {
      return fs.readJsonSync(file, { encoding: 'utf-8' });
    } catch (error) {
      console.error('Failed to parse application config:', file);
      throw error;
    }
  }
}
