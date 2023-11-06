/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import fs from 'node:fs';
import path from 'node:path';
import { Command } from '@oclif/core';
import chalk from 'chalk';
import prompts from 'prompts';
import { deployCommandFlags } from './flags';
import { helpers } from '../../internals';
import { accountUtils } from '../../lib/account-utils';
import context from '../../lib/context';
import galileoPrompts from '../../lib/prompts';
import { ExecaTask } from '../../lib/types';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

export default class DeployCommand extends Command {
  static description = 'Deploy Galileo into your AWS account';
  static examples = [
    'galileo-cli deploy --profile=myProfile --appRegion=ap-southeast-1 --llmRegion=us-west-2 --build --saveExec --skipConfirmations',
    'galileo-cli deploy --dryRun',
    'galileo-cli deploy --replay --skipConfirmations',
  ];
  static flags = deployCommandFlags;

  private onPromptCancel() {
    this.exit();
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(DeployCommand);

    // this.log("deploy start", flags);

    if (flags.dryRun) {
      context.dryRun = true;
    }

    // check if replay requested
    if (flags.replay) {
      await this.executeReplay(flags.skipConfirmations);
    }

    // check all prerequisities for the successful run
    await this.ensurePrerequisites({ build: flags.build });

    // app config path, where we fetch previous/defaults, and later save config
    const appConfigPath = await galileoPrompts.appConfigPath(flags.config);
    context.appConfig = helpers.resolveAppConfig(appConfigPath);
    const applicationName = await galileoPrompts.applicationName();
    context.appConfig.app.name = applicationName;

    // basic info for the deployment
    const { profile, appRegion } = context.cachedAnswers(
      await prompts(
        [
          galileoPrompts.profile(flags.profile),
          galileoPrompts.awsRegion({
            regionType: 'app',
            initialVal: flags.appRegion,
          }),
        ],
        { onCancel: this.onPromptCancel },
      ),
    );

    // set process envs so all child processes will inherit them
    process.env.AWS_REGION = appRegion;
    process.env.AWS_PROFILE = profile;

    const account = await accountUtils.retrieveAccount(profile);

    context.appConfig.identity.admin = await galileoPrompts.adminEmailAndUsername();

    const { foundationModelIds, llmRegion } = await prompts(
      [galileoPrompts.foundationModelIds(), galileoPrompts.llmRegion()],
      { onCancel: this.onPromptCancel },
    );
    if (llmRegion !== appRegion) {
      context.appConfig.llms.region = llmRegion;
    }
    context.appConfig.llms.predefined = {
      sagemaker: foundationModelIds,
    };

    context.appConfig.bedrock = await galileoPrompts.bedrockConfig();

    // foundational models -related info
    const availableModelIds = helpers.availableModelIds(
      context.appConfig.llms.predefined.sagemaker,
      context.appConfig.bedrock.models,
    );
    const { defaultModelId } = await prompts([galileoPrompts.defaultModelId(availableModelIds)], {
      onCancel: this.onPromptCancel,
    });
    context.appConfig.llms.defaultModel = defaultModelId;

    context.appConfig.rag = await galileoPrompts.ragConfig();
    context.appConfig.rag.samples = await galileoPrompts.sampleConfig();

    context.appConfig.tooling = await galileoPrompts.toolingConfig();

    helpers.saveAppConfig(context.appConfig, appConfigPath);

    if (flags.projen) {
      console.log(chalk.gray('Synthesizing project repository...'));
      context.execCommand('pnpm projen', { cwd: ROOT });
    }

    const modelRegion = context.appConfig.llms.region || appRegion;

    const regionsToBootstrap = new Set<string>();
    for (const _region of new Set<string>([appRegion, modelRegion])) {
      const bootstapInfo = await accountUtils.retrieveCdkBootstrapInfo({
        profile,
        region: _region,
      });

      if (bootstapInfo == null) {
        regionsToBootstrap.add(_region);
      }
    }

    if (regionsToBootstrap.size > 0) {
      if (!flags.skipConfirmations) {
        const { bootstrapRegions } = context.cachedAnswers(
          await prompts(
            galileoPrompts.confirmBootstrapRegions({
              regions: Array.from(regionsToBootstrap),
              account,
            }),
          ),
        );

        if (!bootstrapRegions) {
          console.error(
            chalk.redBright('Account must be bootstrapped in all regions to be used, before deployment. Quitting...'),
          );
          this.exit();
        }
      }

      await this.executeCdkBootstrap({
        account,
        profile,
        regionsToBootstrap,
      });
    }

    context.deployStacks.push(`Dev/${context.appConfig.app.name}`);
    context.cdkContext.set('configPath', appConfigPath);

    const cmdDeploy = this.getDeploymentCommand({
      appRegion,
      profile,
      cdkCommand: flags.cdkCommand,
      cdkRequireApproval: flags.cdkRequireApproval,
    });

    if (
      flags.skipConfirmations ||
      (
        await prompts(
          galileoPrompts.confirmExecCommand({
            ctx: `CDK ${flags.cdkCommand.toUpperCase()}`,
            description: `Execute the following command in ${account}?`,
            cmd: cmdDeploy,
          }),
          { onCancel: this.onPromptCancel },
        )
      ).confirmed
    ) {
      this.executeBuild(flags.build);
      this.executeCdkDeploy(cmdDeploy, flags.skipConfirmations);
      if (flags.saveExec) {
        context.saveExecTasks();
      }

      console.info(chalk.bold.greenBright('Success!'));
    }
  }

  /**
   * General pre-requisites check.
   * * check if dependecies have been installed
   * * check if docker is running for the build operation
   */
  async ensurePrerequisites(options: { build: boolean }) {
    const { build } = options;

    if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
      const { installDeps } = context.cachedAnswers(await prompts(galileoPrompts.installDeps));

      if (!installDeps) {
        console.error(chalk.redBright('Project dependencies must be installed. Quitting...'));
        this.exit();
      }

      context.execCommand('pnpm install --frozen-lockfile', {
        cwd: ROOT,
        stdio: 'inherit',
      });
    }

    if (build) {
      // make sure docker is running
      try {
        context.execCommand('docker info');
      } catch (error) {
        console.error(chalk.redBright('Docker must be running - please start docker and retry'));
        this.exit();
      }
    }
  }

  /**
   * Checks if there is any replay commands exist from the previous successful
   * run and executes those.
   * @param skipConfirmations whether to skip confirmation prompt
   */
  async executeReplay(skipConfirmations: boolean) {
    const replayTasks: ExecaTask[] | undefined = context.cache.getItem('replayTasks');

    if (replayTasks == null) {
      this.log(chalk.redBright('No last tasks stored to execute. Quitting...'));
      this.exit();
    }

    console.info(
      helpers.commandMessage(
        'LAST',
        'Replay the last task(s):',
        replayTasks
          .map((_task: ExecaTask) => {
            return chalk.gray('→ ') + _task[0];
          })
          .join('\n'),
      ),
    );

    if (
      skipConfirmations ||
      (
        await prompts(
          galileoPrompts.confirmExec({
            ctx: 'REPLAY',
            message: 'Execute?',
          }),
          { onCancel: this.onPromptCancel },
        )
      ).confirmed
    ) {
      for (const task of replayTasks) {
        context.execCommand(...task);
      }
    }
    this.exit(0);
  }

  /**
   * Run project build
   */
  executeBuild(build: boolean) {
    build &&
      context.execCommand('pnpm build', {
        cwd: path.join(ROOT),
        stdio: 'inherit',
      });
  }

  getDeploymentCommand(options: {
    appRegion: string;
    profile: string;
    cdkCommand: string;
    cdkRequireApproval: string;
  }): string {
    const { appRegion, profile, cdkCommand, cdkRequireApproval } = options;

    let cmd = `cdk ${cdkCommand} --require-approval ${cdkRequireApproval} --region ${appRegion} --profile ${profile}`;
    // TODO: causing intermittent deploy inconsistencies, until resolve consistency just re-synth
    // if (flags.build) {
    //   // No need to synth cdk if build is run, which already runs synth
    //   cmd += " --app cdk.out";
    // }
    for (const [key, value] of context.cdkContext.entries()) {
      cmd += ` -c "${key}=${value}"`;
    }
    cmd += ' ' + context.deployStacks.join(' ');

    return cmd;
  }

  executeCdkDeploy(cmd: string, skipConfirmations: boolean) {
    skipConfirmations && console.info(`Executing \`${cmd}\``);

    context.execCommand(`pnpm exec ${cmd}`, {
      cwd: path.join(ROOT, 'demo/infra'),
      stdio: 'inherit',
    });
  }

  async executeCdkBootstrap(options: { account: string; profile: string; regionsToBootstrap: Set<string> }) {
    const { account, profile, regionsToBootstrap } = options;
    const { cloudformationExecutionPolicies } = context.cachedAnswers(
      await prompts(galileoPrompts.cloudformationExecutionPolicies, {
        onCancel: this.onPromptCancel,
      }),
    );

    const bootstrapCmd = `cdk bootstrap --profile ${profile} ${[...regionsToBootstrap]
      .map((r) => `aws://${account}/${r}`)
      .join(' ')} --cloudformation-execution-policies "${cloudformationExecutionPolicies}"`;

    context.execCommand(`pnpm exec ${bootstrapCmd} --app cdk.out`, {
      cwd: path.join(ROOT, 'demo/infra'),
      stdio: 'inherit',
    });
  }
}
