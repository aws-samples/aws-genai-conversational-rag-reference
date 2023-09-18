#!/usr/bin/env tsx

/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */

import path from "node:path";
import { Command } from "commander";
import figlet from "figlet";
import prompts from "prompts";
import chalk from "chalk";
import * as execa from "execa";
import clear from "clear";
import { JSONStorage } from "node-localstorage";
import { IApplicationContextKey } from "../demo/infra/src/application/context";
import {
  DEFAULT_FOUNDATION_MODEL_ID,
  DEFAULT_PREDEFINED_FOUNDATION_MODEL_LIST,
  FoundationModelIds,
} from "../demo/infra/src/application/ai/foundation-models/ids";
import { BedrockModelIds, BEDROCK_DEFAULT_MODEL, BEDROCK_REGION } from '../demo/infra/src/galileo/ai/llms/framework/bedrock/ids';
import { formatBedrockModelUUID } from '../demo/infra/src/galileo/ai/llms/framework/bedrock/utils';

const ROOT = path.resolve(__dirname, "..");

type Task = Parameters<typeof execa.execaCommand>;

(async () => {
  const NAME = "Galileo CLI";
  const program = new Command(NAME);

  const lastTasks: Task[] = [];

  const execCommand = (
    ...args: Task
  ): ReturnType<typeof execa.execaCommand> => {
    lastTasks.push(args);

    return execa.execaCommand(...args);
  };

  const cache = new JSONStorage(path.join(__dirname, ".cache", "localstorage"));
  const cached = <T extends Record<string, any>>(
    answers: T,
    prefix?: string
  ): T => {
    Object.entries(answers).forEach(([key, value]) => {
      if (value != null) {
        if (prefix) key = prefix + key;
        cache.setItem(key, value);
      }
    });
    return answers;
  };

  clear();

  console.log(
    chalk.cyanBright(figlet.textSync(NAME, { horizontalLayout: "fitted" }))
  );

  console.log(
    chalk.magentaBright("Galileo companion cli for deploying the cdk infra")
  );

  interface InfraOptionValues {
    readonly name: string;
    readonly profile?: string;
    readonly region?: string;
    readonly yes: boolean;
    readonly last: boolean;
    readonly requireApproval: string;
    readonly stacks?: string;
    readonly build: boolean;
    readonly projen: boolean;
    readonly cdkCmd: string;
    readonly save: boolean;
  }

  enum DeployModelOptions {
    SAME_REGION = 0,
    DIFFERENT_REGION = 1,
    ALREADY_DEPLOYED = 2,
    CROSS_ACCOUNT = 3,
    NO = 4,
  }

  program.version("0.0.0").description("Galileo helpers for common tasks");

  program
    .option("--name <value>", "Application Name", "Galileo")
    .option("--profile <value>", "AWS Profile")
    .option("--region <value>", "AWS Region (primary)")
    .option("--require-approval <value>", "CDK approval level", "never")
    .option("--build", "Perform build", true)
    .option("--no-build", "Skip build")
    .option("--projen", "Run projen to synth project", true)
    .option(
      "--cdk-cmd <value>",
      "CDK command to run; defaults to deploy",
      "deploy"
    )
    .option("--no-projen", "Skip projen")
    .option("--yes", "Skip confirmations", false)
    .option("--last", "Replay last successful task(s) execution", false)
    .option(
      "--save",
      "Save successful task(s) execution to enable last replay",
      true
    )
    .option("--no-save", "Do not save this execution for last replay", false);

  program.parse();

  const options = program.opts<InfraOptionValues>();

  if (options.last) {
    const _lastTasks: Task[] | undefined = cache.getItem("lastTasks");
    if (_lastTasks == null) {
      throw new Error("No last tasks stored to execute");
    }

    console.info(
      commandMessage(
        "LAST",
        "Replay the last task(s):",
        _lastTasks
          .map((_task) => {
            return chalk.gray("→ ") + _task[0];
          })
          .join("\n")
      )
    );

    if (
      options.yes ||
      (
        await prompts({
          type: "confirm",
          name: "confirmed",
          message: "Execute?",
        })
      ).confirmed
    ) {
      for (const task of _lastTasks) {
        await execa.execaCommand(...task);
      }
    }
    process.exit(0);
  }

  const applicationName = options.name;

  const onCancel = () => {
    process.exit();
  };

  const selectedFoundationModels = new Set<FoundationModelIds>(
    cache.getItem("foundationModels") ||
      DEFAULT_PREDEFINED_FOUNDATION_MODEL_LIST
  );

  const {
    profile,
    region,
    adminEmail,
    adminUsername,
    deployApp,
    deploySample,
    foundationModels,
  } = cached(
    await prompts(
      [
        {
          type: "text",
          name: "profile",
          message: "AWS Profile",
          initial:
            options.profile ||
            cache.getItem("profile") ||
            process.env.AWS_PROFILE,
          validate: async (value: string) =>
            (value && value.length > 0) || "Profile is required",
        },
        {
          type: "text",
          name: "region",
          message: "AWS Region (primary)",
          initial:
            options.region ||
            cache.getItem("region") ||
            process.env.AWS_REGION ||
            process.env.AWS_DEFAULT_REGION,
          validate: async (value: string) =>
            (value && value.length > 0) || "Region is required",
        },
        {
          type: "text",
          name: "adminEmail",
          message:
            "Administrator email address" +
            chalk.reset.grey(
              " Enter email address to automatically create Cognito admin user, otherwise leave blank\n"
            ),
          initial: cache.getItem("adminEmail"),
        },
        {
          type: (prev) => (prev == null ? false : "text"),
          name: "adminUsername",
          message: "Administrator username",
          initial: cache.getItem("adminUsername") ?? "admin",
        },
        {
          type: "confirm",
          name: "deployApp",
          message: "Deploy main application stack?",
          initial: cache.getItem("deployApp") ?? true,
        },
        {
          type: "confirm",
          name: "deploySample",
          message: "Deploy sample dataset?",
          initial: cache.getItem("deploySample") ?? true,
        },
        {
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
        },
      ],
      { onCancel }
    )
  );

  const includesBedrock = (foundationModels as string[]).includes(FoundationModelIds.BEDROCK);

  const selectedBedrockModels = new Set<BedrockModelIds>(
    cache.getItem("bedrockModelIds") ||
    [BEDROCK_DEFAULT_MODEL],
  );

  const { bedrockModelIds, bedrockRegion, bedrockEndpointUrl } = includesBedrock ? cached(
    await prompts(
      [
        {
          type: "autocompleteMultiselect",
          name: "bedrockModelIds",
          message: "Bedrock model ids",
          min: 1,
          instructions: chalk.gray(
            "↑/↓: Highlight option, ←/→/[space]: Toggle selection, Return to submit"
          ),
          choices: Object.values(BedrockModelIds).sort().map((_id) => ({
            title: _id,
            value: _id,
            selected: selectedBedrockModels.has(_id),
          })),
        },
        {
          type: "text",
          name: "bedrockRegion",
          message: "Bedrock region",
          initial: cache.getItem("bedrockRegion") ?? BEDROCK_REGION,
        },
        {
          type: "text",
          name: "bedrockEndpointUrl",
          message: `Bedrock endpoint url ${chalk.gray("(optional)")}`,
          initial: cache.getItem("bedrockEndpointUrl") ?? undefined,
        },
      ],
      { onCancel }
    )
  ) : {} as any;

  const availableModelIds = includesBedrock ? [
    ...(foundationModels as string[]).filter(v => v !== FoundationModelIds.BEDROCK),
    ...(bedrockModelIds as string[]).map(formatBedrockModelUUID),
  ] : (foundationModels as string[]);

  const { deployModels, defaultModelId } = cached(
    await prompts(
      [
        {
          type: "select",
          name: "defaultModelId",
          message: "Choose the default foundation model",
          hint: "This will be the default model used in inference engine.",
          choices: availableModelIds.map((x) => ({
            title: x,
            value: x,
          })),
          initial: () => {
            const _initial =
              cache.getItem("defaultModelId") ?? DEFAULT_FOUNDATION_MODEL_ID;
            if (availableModelIds.includes(_initial)) {
              return availableModelIds.indexOf(_initial);
            } else {
              return 0;
            }
          },
        },
        {
          type: "select",
          name: "deployModels",
          message: "Deploy Foundation Models?",
          initial:
            cache.getItem("deployModels") ?? DeployModelOptions.SAME_REGION,
          choices: [
            {
              title: "Yes, in same region as application",
              value: DeployModelOptions.SAME_REGION,
            },
            {
              title: "Yes, but in different region",
              value: DeployModelOptions.DIFFERENT_REGION,
            },
            {
              title: "No, already deployed",
              value: DeployModelOptions.ALREADY_DEPLOYED,
            },
            {
              title: "No, but link to cross-account stack",
              value: DeployModelOptions.CROSS_ACCOUNT,
            },
            { title: "No", value: DeployModelOptions.NO },
          ],
        },
      ],
      { onCancel }
    )
  );

  const account = (
    await execa.execaCommand(
      `aws --profile ${profile} sts get-caller-identity --query Account --output text`
    )
  ).stdout;

  const stacks: string[] = [];
  const context = new Map<IApplicationContextKey, string>();

  if (adminEmail?.length && adminUsername?.length) {
    context.set("AdminEmail", adminEmail);
    context.set("AdminUsername", adminUsername);
  }

  if (deployApp) {
    stacks.push(`Dev/${applicationName}`);
  }

  context.set("IncludeSampleDataset", deploySample ? "1" : "0");
  if (deploySample) {
    stacks.push(`Dev/${applicationName}-SampleDataset`);
  }

  context.set("FoundationModels", foundationModels.join(","));
  defaultModelId && context.set("DefaultModelId", defaultModelId);

  if (includesBedrock) {
    context.set("BedrockModelIds", bedrockModelIds.join(","));
    context.set("BedrockRegion", bedrockRegion);
    if (bedrockEndpointUrl && bedrockEndpointUrl.length) {
      context.set("BedrockEndpointUrl", bedrockEndpointUrl);
    }
  }

  const crossAccountRegex = new RegExp(
    `arn:aws:iam::\\d{10,12}:role\\/${applicationName}-FoundationModel-CrossAccount-\\w+`
  );

  switch (deployModels) {
    case DeployModelOptions.SAME_REGION: {
      context.set("FoundationModelRegion", region);
      stacks.push(`Dev/${applicationName}/FoundationModelStack`);
      break;
    }
    case DeployModelOptions.DIFFERENT_REGION: {
      const { modelRegion } = cached(
        await prompts(
          {
            type: "text",
            name: "modelRegion",
            message: "What region do you want to deploy Foundation Models to?",
            initial: cache.getItem("modelRegion") ?? region,
            validate: async (value: string) =>
              (value && value.length > 0) || "Model region is required",
          },
          { onCancel }
        )
      );
      context.set("FoundationModelRegion", modelRegion);
      stacks.push(`Dev/${applicationName}/FoundationModelStack`);
      break;
    }
    case DeployModelOptions.ALREADY_DEPLOYED: {
      const { modelRegion } = cached(
        await prompts(
          [
            {
              type: "text",
              name: "modelRegion",
              message:
                "What region was the Foundation Model stack deployed to?",
              initial: cache.getItem("modelRegion"),
              validate: async (value: string) =>
                (value && value.length > 0) || "Model region is required",
            },
          ],
          { onCancel }
        )
      );
      context.set("DecoupleStacks", "1");
      context.set("FoundationModelRegion", modelRegion);
      break;
    }
    case DeployModelOptions.CROSS_ACCOUNT: {
      const { modelRegion, crossRegionRoleArn } = cached(
        await prompts(
          [
            {
              type: "text",
              name: "modelRegion",
              message:
                "What region was the Foundation Model stack deployed to in other account?",
              initial: cache.getItem("modelRegion") ?? "us-east-1",
              validate: async (value: string) =>
                (value && value.length > 0) || "Model region is required",
            },
            {
              type: "text",
              name: "crossRegionRoleArn",
              message:
                "What is the cross-account role arn for Foundation Model stack?",
              initial: cache.getItem("crossRegionRoleArn"),
              validate: async (value: string) =>
                (value && crossAccountRegex.test(value)) ||
                `Invalid cross-account arn - expected "${crossAccountRegex.source}"`,
            },
          ],
          { onCancel }
        )
      );
      context.set("DecoupleStacks", "1");
      context.set("FoundationModelRegion", modelRegion);
      context.set("FoundationModelCrossAccountRoleArn", crossRegionRoleArn);
      break;
    }
    case DeployModelOptions.NO: {
      context.set("FoundationModelRegion", region);
      context.set("DecoupleStacks", "1");
      break;
    }
  }

  if (options.projen) {
    console.log(chalk.gray("Synthesizing project repository..."));
    await execCommand("pnpm projen", { cwd: ROOT });
  }

  const modelRegion = context.get("FoundationModelRegion") || region;

  const regionsToBootstrap = new Set<string>();
  cached(
    await prompts<any>(
      [...new Set<string>([region, modelRegion]).values()].map(
        (_region) => ({
          type: "confirm",
          name: `bootstrapped_${_region}`,
          message: `Is "${_region}" region already bootstrapped in ${account} account?`,
          initial: cache.getItem(`bootstrapped_${_region}`) ?? false,
          onState(state) {
            if (!state.value) {
              regionsToBootstrap.add(_region);
            }
          },
        }),
        { onCancel }
      )
    )
  );

  if (regionsToBootstrap.size > 0) {
    const { cloudformationExecutionPolicies } = cached(
      await prompts(
        {
          type: "text",
          name: "cloudformationExecutionPolicies",
          message:
            "What managed polices should be attached to bootstrap deployment role?",
          hint: "https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html#bootstrapping-customizing",
          initial:
            cache.getItem("cloudformationExecutionPolicies") ??
            "arn:aws:iam::aws:policy/PowerUserAccess,arn:aws:iam::aws:policy/IAMFullAccess",
        },
        { onCancel }
      )
    );

    const bootstrapCmd = `cdk bootstrap --profile ${profile} ${[
      ...regionsToBootstrap,
    ]
      .map((r) => `aws://${account}/${r}`)
      .join(
        " "
      )} --cloudformation-execution-policies "${cloudformationExecutionPolicies}"`;
    const confirmed =
      options.yes ||
      (
        await prompts(
          {
            type: "confirm",
            name: "confirmed",
            message: commandMessage(
              "[CDK BOOTSTRAP]",
              `Execute the following command in ${account}?`,
              bootstrapCmd
            ),
            initial: true,
          },
          { onCancel }
        )
      ).confirmed;
    if (confirmed) {
      await execCommand(`pnpm exec ${bootstrapCmd} --app cdk.out`, {
        cwd: path.join(ROOT, "demo/infra"),
        stdio: "inherit",
      });
    } else {
      process.exit(1);
    }
  }

  let cmd = `cdk ${options.cdkCmd} --require-approval ${options.requireApproval} --region ${region} --profile ${profile}`;
  // TODO: causing intermittent deploy inconsistencies, until resolve consistency just re-synth
  // if (options.build) {
  //   // No need to synth cdk if build is run, which already runs synth
  //   cmd += " --app cdk.out";
  // }
  for (const [key, value] of context.entries()) {
    cmd += ` -c "${key}=${value}"`;
  }
  cmd += " " + stacks.join(" ");

  if (
    options.yes ||
    (
      await prompts(
        {
          type: "confirm",
          name: "confirmed",
          message: commandMessage(
            `CDK ${options.cdkCmd.toUpperCase()}`,
            `Execute the following command in ${account}?`,
            cmd
          ),
          initial: true,
        },
        { onCancel }
      )
    ).confirmed
  ) {
    // make sure docker is running
    try {
      await execa.execaCommand("docker info");
    } catch (error) {
      throw new Error("Docker must be running - please start docker and retry");
    }

    options.build &&
      (await execCommand("pnpm build", {
        cwd: path.join(ROOT),
        stdio: "inherit",
      }));

    options.yes && console.info(`Executing \`${cmd}\``);

    await execCommand(`pnpm exec ${cmd}`, {
      cwd: path.join(ROOT, "demo/infra"),
      stdio: "inherit",
    });

    options.save && cache.setItem("lastTasks", lastTasks);
  }
})()
  .then(() => console.info(chalk.bold.greenBright("Success!")))
  .catch((error) => console.error(error));

function commandMessage(
  context: string,
  description: string,
  cmd: string
): string {
  return (
    chalk.cyanBright(`[${context}]`) +
    " " +
    description +
    "\n" +
    chalk.magentaBright(cmd) +
    "\n"
  );
}
