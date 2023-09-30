/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

export const PredefinedModels = [
  "bedrock::amazon.titan-tg1-large",
  "bedrock::amazon.titan-tg1-xlarge",
  "bedrock::anthropic.claude-v2",
  "bedrock::anthropic.claude-v2-100k",
];

export * from "../../../../demo/infra/src/application/ai/foundation-models/ids";
export * from "../../../../demo/infra/src/galileo/ai/llms/framework/bedrock/ids";
export * from "../../../../demo/infra/src/galileo/ai/llms/framework/bedrock/utils";
export * from "../../../../demo/infra/src/application/context";

import chalk from "chalk";
import { formatBedrockModelUUID, FoundationModelIds } from ".";

// helpers
export namespace helpers {
  export const includesBedrock = (foundationModels: string[]): boolean => {
    return foundationModels.includes(FoundationModelIds.BEDROCK);
  };

  export const availableModelIds = (
    foundationModels: string[],
    bedrockModelIds: string[]
  ) => {
    const _includesBedrock = helpers.includesBedrock(foundationModels);

    return _includesBedrock
      ? [
          ...(foundationModels as string[]).filter(
            (v) => v !== FoundationModelIds.BEDROCK
          ),
          ...(bedrockModelIds as string[]).map(formatBedrockModelUUID),
        ]
      : (foundationModels as string[]);
  };

  export const contextMessage = (_context: string, message: string): string => {
    return `${chalk.cyanBright(`[${_context}]`)} ${message}`;
  };

  export const commandMessage = (
    _context: string,
    description: string,
    cmd?: string
  ): string => {
    return contextMessage(
      _context,
      `${description}\n${chalk.magentaBright(cmd)}\n`
    );
  };
}
