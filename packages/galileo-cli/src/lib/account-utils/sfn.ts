/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  SFNClient,
  ListStateMachinesCommand,
  StartExecutionCommand,
} from "@aws-sdk/client-sfn";
import { fromIni } from "@aws-sdk/credential-providers";
import { CredentialsParams, NameArnTuple } from "../types";

export namespace stepfunctions {
  export const listStateMachines = async (
    credentials: CredentialsParams
  ): Promise<NameArnTuple[]> => {
    const client = new SFNClient({
      credentials: fromIni({
        profile: credentials.profile,
      }),
      region: credentials.region,
    });

    const response = await client.send(new ListStateMachinesCommand({}));
    // TODO: filter by tags
    return response.stateMachines!.map((sm) => {
      return { name: sm.name!, arn: sm.stateMachineArn! };
    });
  };

  export const triggerWorkflow = async (
    credentials: CredentialsParams,
    arn: string
  ) => {
    const client = new SFNClient({
      credentials: fromIni({
        profile: credentials.profile,
      }),
      region: credentials.region,
    });

    const result = await client.send(
      new StartExecutionCommand({
        stateMachineArn: arn,
      })
    );

    return result.executionArn;
  };
}
