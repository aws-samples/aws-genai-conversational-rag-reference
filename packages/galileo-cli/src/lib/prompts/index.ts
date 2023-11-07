/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

// import * as path from "node:path";
import chalk from 'chalk';
import { isEmpty, last, set, sortBy } from 'lodash';
import prompts, { PromptObject } from 'prompts';
import {
  APPLICATION_CONFIG_JSON,
  ApplicationConfig,
  BEDROCK_REGION,
  DEFAULT_APPLICATION_NAME,
  DEFAULT_PREDEFINED_FOUNDATION_MODEL_LIST,
  FoundationModelIds,
  IEmbeddingModelInfo,
  SampleDataSets,
  helpers,
  sortRagEmbeddingModels,
} from '../../internals';
import { listBedrockTextModels } from '../account-utils/bedrock';
import context from '../context';
import { NameArnTuple } from '../types';

namespace galileoPrompts {
  export const installDeps: PromptObject = {
    type: 'confirm',
    name: 'installDeps',
    message: chalk.yellowBright('Project dependencies not found. Install?'),
    initial: true,
  };

  export const confirmExec = (options: { ctx?: string; message: string }): PromptObject => {
    const { ctx, message } = options;

    return {
      type: 'confirm',
      name: 'confirmed',
      message: ctx ? helpers.contextMessage(ctx, message) : message,
      initial: true,
    };
  };

  export const confirmExecCommand = (options: { ctx: string; description: string; cmd: string }): PromptObject => {
    const { ctx, description, cmd } = options;

    return {
      type: 'confirm',
      name: 'confirmed',
      message: helpers.commandMessage(ctx, description, cmd),
      initial: true,
    };
  };

  export const profile = (initialVal?: string): PromptObject => ({
    type: 'text',
    name: 'profile',
    message: 'AWS Profile',
    initial: initialVal || context.cache.getItem('profile') || process.env.AWS_PROFILE || 'default',
    validate: async (value: string) => (value && value.length > 0) || 'Profile is required',
  });

  export async function applicationName(): Promise<string> {
    const { name } = await prompts({
      type: 'text',
      name: 'name',
      message: 'Application Name (stack/resource naming)',
      initial: context.appConfig.app.name || DEFAULT_APPLICATION_NAME,
    });
    return name;
  }

  export async function appConfigPath(initial?: string): Promise<string> {
    const { configPath: _value } = await prompts({
      type: 'text',
      name: 'configPath',
      message: 'Config file name?',
      initial: initial || context.cache.getItem('appConfigPath') || APPLICATION_CONFIG_JSON,
      validate: async (value: string) => value == null || value.endsWith('.json') || 'Profile is required',
    });
    context.cache.setItem('appConfigPath', _value);
    return _value;
  }

  export const awsRegion = (options: {
    regionType?: 'app' | 'foundationModel' | 'bedrock';
    message?: string;
    initialVal?: string;
  }): PromptObject => ({
    type: 'text',
    name: options.regionType ? `${options.regionType}Region` : 'region',
    message: options.regionType ? `AWS Region (${options.regionType})` : 'AWS Region',
    initial:
      options.initialVal || options.regionType
        ? context.cache.getItem(`${options.regionType}Region`)
        : context.cache.getItem('region') || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
    validate: async (value: string) => (value && value.length > 0) || `${options.regionType} region is required`,
  });

  export const email = (options?: { name?: string; message?: string; initialVal?: string }): PromptObject => {
    return {
      type: 'text',
      name: options?.name ?? 'email',
      message: options?.message ?? 'Email address',
      initial: options?.initialVal || context.cache.getItem(options?.name ?? 'email'),
    };
  };
  export const username = (options?: { name?: string; message?: string; initialVal?: string }): PromptObject => {
    return {
      type: 'text',
      name: options?.name ?? 'username',
      message: options?.message ?? 'User name',
      initial: options?.initialVal || context.cache.getItem(options?.name ?? 'username'),
    };
  };
  export const userGroupPicker = (options?: {
    name?: string;
    message?: string;
    initialVal?: string;
    groups: string[];
  }): PromptObject => {
    const _initial = options?.initialVal || context.cache.getItem(options?.name ?? 'group');
    return {
      type: 'select',
      name: options?.name ?? 'group',
      message: options?.message ?? 'User group',
      instructions: chalk.gray(
        '\n ↑/↓: Highlight option, ←/→/[space]: Toggle selection, a: Toggle all, enter/return: Complete answer',
      ),
      choices:
        options?.groups.map((_id) => ({
          title: _id,
          value: _id,
          selected: options?.groups.indexOf(_initial) > -1,
        })) || [],
      min: 0,
    };
  };

  export async function adminEmailAndUsername(): Promise<undefined | { username: string; email: string }> {
    const result = await prompts([
      email({
        message:
          'Administrator email address' +
          chalk.reset.grey(' Enter email address to automatically create Cognito admin user, otherwise leave blank\n'),
        initialVal: context.appConfig.identity.admin?.email,
      }),
      {
        type: (prev) => (prev == null ? false : 'text'),
        name: 'username',
        message: 'Administrator username',
        initial: context.appConfig.identity.admin?.username ?? 'admin',
      },
    ]);

    if (helpers.ifNotEmpty(result.email)) {
      return {
        email: result.email,
        username: result.username,
      };
    }
    return undefined;
  }

  // TODO: remove this and move sample deployment to upload data command
  export async function sampleConfig(): Promise<ApplicationConfig['rag']['samples']> {
    const sampleDatasets = (
      await prompts({
        name: 'sampleDatasets',
        message: 'Deploy sample dataset?',
        type: 'multiselect',
        instructions: chalk.gray(
          '\n ↑/↓: Highlight option, ←/→/[space]: Toggle selection, a: Toggle all, enter/return: Complete answer',
        ),
        choices: Object.values(SampleDataSets).map((value) => ({
          title: value,
          value: value,
          selected: context.appConfig.rag.samples?.datasets.includes(value),
        })),
        min: 0,
      })
    ).sampleDatasets as SampleDataSets[];

    if (isEmpty(sampleDatasets)) {
      return undefined;
    }

    if (sampleDatasets.includes(SampleDataSets.SUPREME_COURT_CASES)) {
      const maxInstanceCount = context.appConfig.rag.indexing?.pipeline?.maxInstanceCount ?? 0;
      const maxCapacity = context.appConfig.rag.managedEmbeddings.autoscaling?.maxCapacity ?? 0;
      if (maxInstanceCount < 10 || maxCapacity < 5) {
        if (
          (
            await prompts({
              type: 'confirm',
              message: helpers.textPromptMessage(
                'Indexing of the sample dataset might take several hours based on your config, do you want to apply recommended settings?',
                {
                  description:
                    'Recommended: embedding model autoscaling max capacity of 5, and indexing container max instances of 10',
                  instructions: 'This might results in higher cost',
                },
              ),
              name: 'confirm',
            })
          ).confirm
        ) {
          set(context.appConfig, 'rag.indexing.pipeline.maxInstanceCount', 10);
          set(context.appConfig, 'rag.managedEmbeddings.autoscaling.maxCapacity', 5);
        }
      }
    }

    return {
      datasets: sampleDatasets,
    };
  }

  export async function toolingConfig(): Promise<ApplicationConfig['tooling']> {
    const { tooling } = await prompts({
      name: 'tooling',
      message: 'Enable tooling in dev stage (SageMaker Studio, PgAdmin)?',
      type: 'multiselect',
      instructions: chalk.gray(
        '\n ↑/↓: Highlight option, ←/→/[space]: Toggle selection, a: Toggle all, enter/return: Complete answer',
      ),
      choices: [
        {
          title: 'sagemakerStudio',
          value: 'sagemakerStudio',
          selected: context.appConfig.tooling?.sagemakerStudio ?? false,
        },
        {
          title: 'pgadmin',
          value: 'pgadmin',
          selected: context.appConfig.tooling?.pgadmin ?? false,
        },
      ],
      min: 0,
    });

    return {
      sagemakerStudio: tooling.includes('sagemakerStudio'),
      pgadmin: tooling.includes('pgadmin'),
    };
  }

  export const llmRegion = (): PromptObject => {
    return {
      type: 'text',
      name: 'llmRegion',
      message: 'Foundation model region?',
      initial: context.appConfig.llms.region ?? context.cache.getItem('appRegion'),
    };
  };

  export const foundationModelIds = (): PromptObject => {
    const selectedFoundationModels = new Set<FoundationModelIds>(
      context.appConfig.llms.predefined?.sagemaker || DEFAULT_PREDEFINED_FOUNDATION_MODEL_LIST,
    );

    const q: PromptObject = {
      type: 'multiselect',
      name: 'foundationModelIds',
      message: 'Choose the foundation models to support',
      instructions: chalk.gray(
        '\n ↑/↓: Highlight option, ←/→/[space]: Toggle selection, a: Toggle all, enter/return: Complete answer',
      ),
      choices: Object.values(FoundationModelIds).map((_id) => ({
        title: _id,
        value: _id,
        selected: selectedFoundationModels.has(_id),
      })),
      min: 0,
    };

    return q;
  };

  export async function bedrockConfig() {
    const { enabled } = await prompts({
      type: 'confirm',
      name: 'enabled',
      message: 'Enable Bedrock?',
      initial: context.appConfig.bedrock?.enabled ?? true,
    });

    if (!enabled) {
      return {
        enabled: false,
      };
    }

    const selectedBedrockModels = new Set<string>((context.appConfig.bedrock?.models as any) || []);

    const { region } = await prompts([
      {
        type: 'text',
        name: 'region',
        message: 'Bedrock region',
        initial: context.appConfig.bedrock?.region ?? BEDROCK_REGION,
      },
    ]);

    const availableTextModels = sortBy(
      await listBedrockTextModels({
        region,
        profile: process.env.AWS_PROFILE!,
      }),
      ['modelId'],
    );

    const { models } = await prompts([
      {
        type: 'autocompleteMultiselect',
        name: 'models',
        message: 'Bedrock model ids',
        hint: chalk.yellow(
          '\nEnsure you have requested access for the selected models, see https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html to request access\n',
        ),
        min: 1,
        instructions: chalk.gray('↑/↓: Highlight option, ←/→/[space]: Toggle selection, Return to submit'),
        choices: availableTextModels.map((v) => ({
          value: v.modelId,
          title: `${v.providerName} ${v.modelName} (${v.modelId})`,
          selected: selectedBedrockModels.has(v.modelId),
        })),
      },
    ]);

    const { endpointUrl } = await prompts([
      {
        type: 'text',
        name: 'endpointUrl',
        message: `Bedrock endpoint url ${chalk.gray('(optional)')}`,
        initial: context.appConfig.bedrock?.endpointUrl ?? undefined,
      },
    ]);

    return {
      enabled: true,
      region,
      models,
      endpointUrl: helpers.ifNotEmpty(endpointUrl),
    };
  }

  export async function ragEmbeddingModel(
    initial?: IEmbeddingModelInfo,
    isDefault: boolean = false,
  ): Promise<IEmbeddingModelInfo> {
    const { modelId, dimensions } = await prompts([
      {
        type: 'text',
        name: 'modelId',
        message: helpers.textPromptMessage('Embedding model', {
          description: 'Enter the model id to use for embeddings, supports any AutoML model',
          instructions:
            'Example: sentence-transformers/all-mpnet-base-v2, intfloat/multilingual-e5-large, sentence-transformers/all-MiniLM-L6-v2',
        }),
        initial: initial?.modelId,
        min: 3,
      },
      {
        type: 'number',
        name: 'dimensions',
        message: helpers.textPromptMessage('Embedding Vector Size', {
          description: 'Enter the vector size for the chosen embedding model',
        }),
        initial: initial?.dimensions,
      },
    ]);

    return {
      uuid: last((modelId as String).split('/'))!,
      modelId,
      dimensions,
      default: isDefault === true ? true : undefined,
    };
  }

  export async function ragManagedEmbeddings(): Promise<ApplicationConfig['rag']['managedEmbeddings']> {
    const embeddingModel = await ragEmbeddingModel(
      sortRagEmbeddingModels(context.appConfig.rag.managedEmbeddings.embeddingsModels)[0],
      true,
    );

    let { instanceType } = await prompts([
      {
        type: 'text',
        name: 'instanceType',
        message: helpers.textPromptMessage('Embedding model instance type', {
          description: 'Enable autoscaling the embedding instance capacity based',
          instructions: `Recommend "ml.g4dn.xlarge" for smaller datasets, and "ml.g4dn.2xlarge" for larger datasets`,
        }),
        initial: context.appConfig.rag.managedEmbeddings.instanceType ?? 'ml.g4dn.xlarge',
      },
    ]);

    let { maxCapacity } = await prompts([
      {
        type: 'number',
        name: 'maxCapacity',
        message: helpers.textPromptMessage('Embedding model max capacity (autoscaling)', {
          description: 'Enable autoscaling the embedding instance capacity based',
          instructions: `Ensure adequate Service Quota limit for SageMaker > "${instanceType} for endpoint usage"`,
        }),
        initial: context.appConfig.rag.managedEmbeddings.autoscaling?.maxCapacity ?? 1,
      },
    ]);

    maxCapacity = parseInt(maxCapacity ?? 1, 10);

    return {
      instanceType,
      embeddingsModels: [embeddingModel],
      ...(maxCapacity > 1
        ? {
            autoscaling: {
              maxCapacity,
            },
          }
        : {}),
    };
  }

  export async function ragIndexing(): Promise<ApplicationConfig['rag']['indexing']> {
    let { instanceType } = await prompts([
      {
        type: 'text',
        name: 'instanceType',
        message: helpers.textPromptMessage('Indexing Pipeline instance type', {
          description: 'Instance type used for processing dataset files and indexing to vector store',
        }),
        initial: context.appConfig.rag.indexing?.pipeline?.instanceType ?? 'ml.g4dn.xlarge',
      },
    ]);
    let { maxInstanceCount } = await prompts([
      {
        type: 'number',
        name: 'maxInstanceCount',
        message: helpers.textPromptMessage('Indexing Pipeline max containers', {
          description: 'Number of containers used for indexing files to vector store',
          instructions: `Ensure adequate Service Quota limit for SageMaker > "${instanceType} for processing job"`,
        }),
        initial: context.appConfig.rag.indexing?.pipeline?.maxInstanceCount ?? 5,
      },
    ]);

    maxInstanceCount = parseInt(maxInstanceCount ?? 1);

    return {
      pipeline: {
        instanceType,
        maxInstanceCount,
      },
    };
  }

  export async function ragConfig(): Promise<ApplicationConfig['rag']> {
    return {
      ...context.appConfig.rag,
      managedEmbeddings: await ragManagedEmbeddings(),
      indexing: await ragIndexing(),
    };
  }

  export const defaultModelId = (availableModelIds: string[]): PromptObject => {
    return {
      type: 'select',
      name: 'defaultModelId',
      message: 'Choose the default foundation model',
      hint: 'This will be the default model used in inference engine.',
      choices: availableModelIds.map((x) => ({
        title: x,
        value: x,
      })),
      initial: () => {
        const _initial = context.appConfig.llms.defaultModel;
        if (_initial && availableModelIds.includes(_initial)) {
          return availableModelIds.indexOf(_initial);
        }

        return 0;
      },
    };
  };

  export const confirmBootstrapRegions = (options: { regions: string[]; account: string }): PromptObject => {
    const { regions, account } = options;
    return {
      type: 'confirm',
      name: 'bootstrapRegions',
      message: `Region${regions.length > 1 ? 's' : ''} ${regions.map((r) => `"${r}"`).join(', ')} ${
        regions.length > 1 ? 'are' : 'is'
      } not bootstrapped in account "${account}". Do you want to bootstrap ${regions.length > 1 ? 'them' : 'it'}?`,
      initial: true,
    };
  };

  export const cloudformationExecutionPolicies: PromptObject = {
    type: 'text',
    name: 'cloudformationExecutionPolicies',
    message: 'What managed polices should be attached to bootstrap deployment role?',
    hint: 'https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html#bootstrapping-customizing',
    initial:
      context.cache.getItem('cloudformationExecutionPolicies') ??
      'arn:aws:iam::aws:policy/PowerUserAccess,arn:aws:iam::aws:policy/IAMFullAccess',
  };

  export const userPoolPicker = (userPools: { id: string; name: string }[]): PromptObject => {
    return {
      type: 'select',
      name: 'userPoolId',
      message: 'Cognito user pools',
      min: 1,
      choices: Object.values(userPools).map((up) => ({
        title: `${up.name} (${up.id})`,
        value: up.id,
        selected: context.cache.getItem('userPoolId'),
      })),
    };
  };

  export const filePathPrompt = (options?: { what?: string; initialVal?: string }): PromptObject => {
    return {
      type: 'text',
      name: 'filePath',
      message: `Enter the path to the ${options?.what ?? 'file'} (${chalk.grey(`CWD: ${process.cwd()}`)}):`,
      initial: options?.initialVal || context.cache.getItem('filePath'),
    };
  };

  export const bucketPicker = (buckets: { bucketName: string }[], initialVal?: string): PromptObject => {
    return {
      type: 'select',
      name: 'uploadBucket',
      message: 'Choose the S3 bucket to upload your content to',
      instructions: chalk.gray(
        '\n ↑/↓: Highlight option, ←/→/[space]: Toggle selection, a: Toggle all, enter/return: Complete answer',
      ),

      choices: Object.values(buckets).map((b) => ({
        title: b.bucketName,
        value: b.bucketName,
        selected: initialVal || context.cache.getItem('uploadBucket'),
      })),
    };
  };

  export const sfnPicker = (stepfunctions: NameArnTuple[], initialVal?: string): PromptObject => {
    return {
      type: 'select',
      name: 'sfn',
      message: 'Choose the workflow for vector store embedding',
      instructions: chalk.gray(
        '\n ↑/↓: Highlight option, ←/→/[space]: Toggle selection, a: Toggle all, enter/return: Complete answer',
      ),

      choices: Object.values(stepfunctions).map((sfn) => ({
        title: sfn.name,
        value: sfn.arn,
        selected: initialVal || context.cache.getItem('sfn'),
      })),
    };
  };

  export const uploadKeyPrefix = (initialVal?: string): PromptObject => {
    return {
      type: 'text',
      name: 'uploadKeyPrefix',
      message: 'Set the S3 upload key prefix',
      initial: initialVal || context.cache.getItem('uploadKeyPrefix'),
    };
  };
}

export default galileoPrompts;
