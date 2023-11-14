/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

export const Logger = console.Console;

export const logger = console;

export function getLogger(..._args: any[]): Logger {
  return console as any;
}
