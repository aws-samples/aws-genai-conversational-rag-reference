/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as fs from "node:fs";
import * as path from "node:path";
import { IModelInfo } from "@aws/galileo-sdk/lib/models";
import { Annotations } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as readlineSync from "readline-sync";
import { EULA_ACKNOWLEDGED_CONTEXT, EULA_ENABLED_CONTEXT } from "./context";

export * from "./context";

const DISCLAIMER = `By using this script, you agree that you will be deploying {models}, each a third-party model (“Third-Party Model”) into your specified user account. AWS does not own and does not exercise any control over these Third-Party Models. You should perform your own independent assessment, and take measures to ensure that you comply with your own specific quality control practices and standards, and the local rules, laws, regulations, licenses and terms of use that apply to you, your content, and the Third-Party Models, and any outputs from the Third-Party Models. AWS does not make any representations or warranties regarding the Third-Party Models.`;

let PROCESS_ACK: string | undefined = undefined;

function normalize(models: string[]): string[] {
  return Array.from(new Set([...models].sort()));
}

export function getEULAContext(scope: Construct): undefined | string[] {
  return scope.node.tryGetContext(EULA_ACKNOWLEDGED_CONTEXT);
}

export function setEULAContext(scope: Construct, models: string[]): void {
  scope.node.setContext(EULA_ACKNOWLEDGED_CONTEXT, normalize(models));
}

export function isEULAEnabled(scope: Construct): boolean {
  return scope.node.tryGetContext(EULA_ENABLED_CONTEXT) === true;
}

export class ModelEULA extends Construct {
  constructor(scope: Construct, id: string, modelInfos: IModelInfo[]) {
    super(scope, id);

    const models = normalize(modelInfos.map((v) => v.modelId));

    if (models.length === 0 || !isEULAEnabled(this)) {
      return;
    }

    const acknowledged = getEULAContext(this) || [];

    const unacknowledged = models.filter(
      (_model) => !acknowledged.includes(_model)
    );

    const serializedModels = JSON.stringify(models);
    if (unacknowledged.length && serializedModels !== PROCESS_ACK) {
      const modelString = models.join(", ").replace(/, ([^,]+)$/, " and $1");

      [
        "\n\n",
        "\x1b[36m",
        "*".repeat(100),
        DISCLAIMER.replace("{models}", modelString),
        "*".repeat(100),
        "\x1b[0m",
        "\n \n",
      ].forEach((line) => console.info(line));

      const ack = Boolean(readlineSync.keyInYN("Proceed"));

      console.log("\n\n");

      if (!ack) {
        process.exit(1);
      }

      // prevent calling again on different stage if same models
      PROCESS_ACK = serializedModels;

      storeEULAContext(this, models);
    }

    Annotations.of(this).addInfo(
      `[Model EULA] Acknowledged: ${acknowledged.join(", ")}`
    );
  }
}

const CONTEXT_JSON_FILE = path.join(process.cwd(), "cdk.context.json");

export function storeEULAContext(scope: Construct, models: string[]): void {
  setEULAContext(scope, models);

  const contextJson = getContextJson();
  contextJson[EULA_ACKNOWLEDGED_CONTEXT] = models;

  fs.writeFileSync(CONTEXT_JSON_FILE, JSON.stringify(contextJson, null, 2), {
    encoding: "utf-8",
  });
}

function getContextJson(): Record<string, unknown> {
  let contextJson: Record<string, unknown> = {};
  if (fs.existsSync(CONTEXT_JSON_FILE)) {
    contextJson = JSON.parse(
      fs.readFileSync(CONTEXT_JSON_FILE, { encoding: "utf-8" })
    );
  }

  return contextJson;
}
