/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  SFNClient,
  ListStateMachinesCommand,
  ListTagsForResourceCommand,
  StartExecutionCommand,
} from "@aws-sdk/client-sfn";
import { fromIni } from "@aws-sdk/credential-providers";
import { containsAppComponentTag } from "./util";
import { GalileoComponentTags } from "../../internals";
import { CredentialsParams, NameArnTuple, Tag } from "../types";

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

    const smResponse = await client.send(new ListStateMachinesCommand({}));

    const sfns: NameArnTuple[] = [];
    for (const sm of smResponse.stateMachines!) {
      const tagsResp = await client.send(
        new ListTagsForResourceCommand({
          resourceArn: sm.stateMachineArn,
        })
      );

      if (
        containsAppComponentTag(
          tagsResp.tags?.map((t) => <Tag>{ key: t.key!, value: t.value! }) ??
            [],
          GalileoComponentTags.CORPUS_INDEXING_STATEMACHINE
        )
      ) {
        sfns.push({ name: sm.name!, arn: sm.stateMachineArn! });
      }
    }
    return sfns;
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
