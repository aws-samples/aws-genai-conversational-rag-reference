/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Hook } from '@oclif/core';
import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';

const initHook: Hook<'init'> = async function (options) {
  clear();

  console.log(chalk.cyanBright(figlet.textSync(options.config.name, { horizontalLayout: 'fitted' })));
};

export default initHook;
