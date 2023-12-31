/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { Flags } from '@oclif/core';
import { FlagInput } from '@oclif/core/lib/interfaces/parser';

export interface DeployCommandFlags {
  projen: boolean;
  config?: string;
  profile?: string;
  skipConfirmations: boolean;
  cdkCommand: string;
  cdkRequireApproval: string;
  build: boolean;
  saveExec: boolean;
  dryRun: boolean;
  replay: boolean;
}

export const deployCommandFlags: FlagInput<DeployCommandFlags> = {
  projen: Flags.boolean({
    description: 'Run projen to synth project',
    default: true,
    allowNo: true,
  }),
  profile: Flags.string({
    aliases: ['p'],
    description: 'The profile set up for your AWS CLI (associated with your AWS account)',
  }),
  config: Flags.string({
    aliases: ['c'],
    description: 'The config.json file to load/store configurations',
    required: false,
  }),
  skipConfirmations: Flags.boolean({
    aliases: ['yes'],
    description: 'Skip prompt confirmations (always yes)',
    default: false,
  }),
  cdkCommand: Flags.string({
    aliases: ['cdk-cmd'],
    description: 'CDK command to run',
    default: 'deploy',
  }),
  cdkRequireApproval: Flags.string({
    aliases: ['require-approval'],
    description: 'CDK approval level',
    default: 'never',
  }),
  build: Flags.boolean({
    description: 'Perform build',
    default: true,
    allowNo: true,
  }),
  saveExec: Flags.boolean({
    aliases: ['save'],
    description: 'Save successful task(s) execution to enable replay',
    default: true,
  }),
  dryRun: Flags.boolean({
    aliases: ['dry-run'],
    description: "Only log commands but don't execute them",
    default: false,
  }),
  replay: Flags.boolean({
    aliases: ['last'],
    description: 'Replay last successful task(s) execution',
    default: false,
  }),
};
