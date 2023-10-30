/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

// import * as path from "node:path";
import chalk from "chalk";
import { PromptObject } from "prompts";
import {
  BEDROCK_DEFAULT_MODEL,
  BEDROCK_REGION,
  BedrockModelIds,
  DEFAULT_PREDEFINED_FOUNDATION_MODEL_LIST,
  FoundationModelIds,
  helpers,
} from "../../internals";
import context from "../context";
import { DeployModelOptions } from "../types";

namespace galileoPrompts {
  export const installDeps: PromptObject = {
    type: "confirm",
    name: "installDeps",
    message: chalk.yellowBright("Project dependencies not found. Install?"),
    initial: true,
  };

  export const confirmExec = (options: {
    ctx: string;
    message: string;
  }): PromptObject => {
    const { ctx, message } = options;

    return {
      type: "confirm",
      name: "confirmed",
      message: helpers.contextMessage(ctx, message),
      initial: true,
    };
  };

  export const confirmExecCommand = (options: {
    ctx: string;
    description: string;
    cmd: string;
  }): PromptObject => {
    const { ctx, description, cmd } = options;

    return {
      type: "confirm",
      name: "confirmed",
      message: helpers.commandMessage(ctx, description, cmd),
      initial: true,
    };
  };

  export const profile = (initialVal?: string): PromptObject => ({
    type: "text",
    name: "profile",
    message: "AWS Profile",
    initial:
      initialVal ||
      context.cache.getItem("profile") ||
      process.env.AWS_PROFILE ||
      "default",
    validate: async (value: string) =>
      (value && value.length > 0) || "Profile is required",
  });

  export const awsRegion = (options: {
    regionType?: "app" | "foundationModel" | "bedrock";
    message?: string;
    initialVal?: string;
  }): PromptObject => ({
    type: "text",
    name: options.regionType ? `${options.regionType}Region` : "region",
    message: options.regionType
      ? `AWS Region (${options.regionType})`
      : "AWS Region",
    initial:
      options.initialVal || options.regionType
        ? context.cache.getItem(`${options.regionType}Region`)
        : context.cache.getItem("region") ||
          process.env.AWS_REGION ||
          process.env.AWS_DEFAULT_REGION,
    validate: async (value: string) =>
      (value && value.length > 0) || `${options.regionType} region is required`,
  });

  export const email = (options?: {
    name?: string;
    message?: string;
    initialVal?: string;
  }): PromptObject => {
    return {
      type: "text",
      name: options?.name ?? "email",
      message: options?.message ?? "Email address",
      initial:
        options?.initialVal || context.cache.getItem(options?.name ?? "email"),
    };
  };
  export const username = (options?: {
    name?: string;
    message?: string;
    initialVal?: string;
  }): PromptObject => {
    return {
      type: "text",
      name: options?.name ?? "username",
      message: options?.message ?? "User name",
      initial:
        options?.initialVal ||
        context.cache.getItem(options?.name ?? "username"),
    };
  };
  export const group = (options?: {
    name?: string;
    message?: string;
    initialVal?: string;
    required?: boolean;
  }): PromptObject => {
    return {
      type: "text",
      name: options?.name ?? "group",
      message: options?.message ?? "User group",
      initial:
        options?.initialVal || context.cache.getItem(options?.name ?? "group"),
    };
  };

  export const adminEmailAndUsername: PromptObject[] = [
    email({
      message:
        "Administrator email address" +
        chalk.reset.grey(
          " Enter email address to automatically create Cognito admin user, otherwise leave blank\n"
        ),
    }),
    {
      type: (prev) => (prev == null ? false : "text"),
      name: "username",
      message: "Administrator username",
      initial: context.cache.getItem("username") ?? "admin",
    },
  ];

  export const confirmDeployApp: PromptObject = {
    type: "confirm",
    name: "deployApp",
    message: "Deploy main application stack?",
    initial: context.cache.getItem("deployApp") ?? true,
  };

  // TODO: remove this and move sample deployment to upload data command
  export const confirmDeploySample: PromptObject = {
    type: "confirm",
    name: "deploySample",
    message: "Deploy sample dataset?",
    initial: context.cache.getItem("deploySample") ?? true,
  };

  export const confirmTooling: PromptObject<"tooling"> = {
    type: "confirm",
    name: "tooling",
    message: "Enable tooling in dev stage (SageMaker Studio, PgAdmin)?",
    initial: context.cache.getItem("tooling") ?? false,
  };

  export const foundationModels = (): PromptObject => {
    const selectedFoundationModels = new Set<FoundationModelIds>(
      context.cache.getItem("foundationModels") ||
        DEFAULT_PREDEFINED_FOUNDATION_MODEL_LIST
    );

    const q: PromptObject = {
      type: "multiselect",
      name: "foundationModels",
      message: "Choose the foundation models to support",
      instructions: chalk.gray(
        "\n ↑/↓: Highlight option, ←/→/[space]: Toggle selection, a: Toggle all, enter/return: Complete answer"
      ),
      choices: Object.values(FoundationModelIds).map((_id) => ({
        title: _id,
        value: _id,
        selected: selectedFoundationModels.has(_id),
      })),
      min: 1,
    };

    return q;
  };

  export const bedrockModelIds = (): PromptObject => {
    const selectedBedrockModels = new Set<BedrockModelIds>(
      context.cache.getItem("bedrockModelIds") || [BEDROCK_DEFAULT_MODEL]
    );
    return {
      type: "autocompleteMultiselect",
      name: "bedrockModelIds",
      message: "Bedrock model ids",
      min: 1,
      instructions: chalk.gray(
        "↑/↓: Highlight option, ←/→/[space]: Toggle selection, Return to submit"
      ),
      choices: Object.values(BedrockModelIds)
        .sort()
        .map((_id) => ({
          title: _id,
          value: _id,
          selected: selectedBedrockModels.has(_id),
        })),
    };
  };

  export const bedrockRegion: PromptObject = {
    type: "text",
    name: "bedrockRegion",
    message: "Bedrock region",
    initial: context.cache.getItem("bedrockRegion") ?? BEDROCK_REGION,
  };

  export const bedrockEndpointUrl: PromptObject = {
    type: "text",
    name: "bedrockEndpointUrl",
    message: `Bedrock endpoint url ${chalk.gray("(optional)")}`,
    initial: context.cache.getItem("bedrockEndpointUrl") ?? undefined,
  };

  export const defaultModelId = (availableModelIds: string[]): PromptObject => {
    return {
      type: "select",
      name: "defaultModelId",
      message: "Choose the default foundation model",
      hint: "This will be the default model used in inference engine.",
      choices: availableModelIds.map((x) => ({
        title: x,
        value: x,
      })),
      initial: () => {
        const _initial = context.cache.getItem("defaultModelId");
        if (_initial && availableModelIds.includes(_initial)) {
          return availableModelIds.indexOf(_initial);
        }

        return 0;
      },
    };
  };

  export const deployModels: PromptObject = {
    type: "select",
    name: "deployModels",
    message: "Foundation Models Region / Account",
    initial:
      context.cache.getItem("deployModels") ?? DeployModelOptions.SAME_REGION,
    choices: [
      {
        title: "Same region as application",
        value: DeployModelOptions.SAME_REGION,
      },
      {
        title: "Different region",
        value: DeployModelOptions.DIFFERENT_REGION,
      },
      {
        title: "Cross-account (advanced)",
        value: DeployModelOptions.CROSS_ACCOUNT,
      },
    ],
  };

  export const crossRegionRoleArn = (applicationName: string): PromptObject => {
    const crossAccountRegex = new RegExp(
      `arn:aws:iam::\\d{10,12}:role\\/${applicationName}-FoundationModel-CrossAccount-\\w+`
    );

    return {
      type: "text",
      name: "crossRegionRoleArn",
      message: "What is the cross-account role arn for Foundation Model stack?",
      initial: context.cache.getItem("crossRegionRoleArn"),
      validate: async (value: string) =>
        (value && crossAccountRegex.test(value)) ||
        `Invalid cross-account arn - expected "${crossAccountRegex.source}"`,
    };
  };

  export const confirmBootstrapRegions = (options: {
    regions: string[];
    account: string;
  }): PromptObject => {
    const { regions, account } = options;
    return {
      type: "confirm",
      name: "bootstrapRegions",
      message: `Region${regions.length > 1 ? "s" : ""} ${regions
        .map((r) => `"${r}"`)
        .join(", ")} ${
        regions.length > 1 ? "are" : "is"
      } not bootstrapped in account "${account}". Do you want to bootstrap ${
        regions.length > 1 ? "them" : "it"
      }?`,
      initial: true,
    };
  };

  export const cloudformationExecutionPolicies: PromptObject = {
    type: "text",
    name: "cloudformationExecutionPolicies",
    message:
      "What managed polices should be attached to bootstrap deployment role?",
    hint: "https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html#bootstrapping-customizing",
    initial:
      context.cache.getItem("cloudformationExecutionPolicies") ??
      "arn:aws:iam::aws:policy/PowerUserAccess,arn:aws:iam::aws:policy/IAMFullAccess",
  };

  export const userPoolPicker = (
    userPools: { id: string; name: string }[]
  ): PromptObject => {
    return {
      type: "select",
      name: "userPoolId",
      message: "Cognito user pools",
      min: 1,
      choices: Object.values(userPools).map((up) => ({
        title: `${up.name} (${up.id})`,
        value: up.id,
        selected: context.cache.getItem("userPoolId"),
      })),
    };
  };

  export const filePathPrompt = (options?: {
    what?: string;
    initialVal?: string;
  }): PromptObject => {
    return {
      type: "text",
      name: "filePath",
      message: `Enter the path to the ${options?.what ?? "file"}:`,
      initial: options?.initialVal || context.cache.getItem("filePath"),
    };
  };
}

export default galileoPrompts;
