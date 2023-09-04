/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  BatchWriteCommand,
  BatchWriteCommandInput,
  BatchWriteCommandOutput,
  DynamoDBDocumentClient,
  QueryCommandInput,
  QueryCommandOutput,
  UpdateCommandOutput,
  paginateQuery,
} from '@aws-sdk/lib-dynamodb';

type DDBBaseEntity = Keys & {
  createdAt: number;
  entity: string;
};

type UserOwnedBaseEntity = DDBBaseEntity & {
  userId: string;
};

export type DDBChat = UserOwnedBaseEntity &
GSI1Keys & {
  chatId: string;
  title: string;
  createdAt: number;
  entity: 'CHAT';
};

export type DDBChatMessage = UserOwnedBaseEntity &
GSI1Keys & {
  messageId: string;
  chatId: string;
  createdAt: number;
  entity: 'MESSAGE';
  data: {
    content: string;
  };
  type: 'ai' | 'human';
};

export type DDBMessageSource = UserOwnedBaseEntity & {
  sourceId: string;
  chatId: string;
  messageId: string;
  createdAt: number;
  entity: 'SOURCE';
  pageContent: string;
  metadata: Record<string, any>;
};

export type DDBQueryOutput<EntityType, KeyType> = Omit<
QueryCommandOutput,
'Items' | 'LastEvaluatedKey'
> & {
  Items?: EntityType[] | undefined;
  LastEvaluatedKey?: KeyType | undefined;
};

export type DDBUpdateOutput<EntityType> = Omit<
UpdateCommandOutput,
'Attributes'
> & {
  Attributes?: EntityType | undefined;
};

export type Keys = {
  PK: string;
  SK: string;
};

export type GSI1Keys = {
  GSI1PK: string;
  GSI1SK?: string | number;
};

export type AllKeys = Keys & GSI1Keys;

export function generateNextToken(params: AllKeys): string {
  return `${params.PK}|${params.SK}|${params.GSI1PK}|${params.GSI1SK}`;
}

export function parseNextToken(nextToken: string): AllKeys {
  const [PK, SK, GSI1PK, GSI1SK] = nextToken.split('|');
  return {
    PK,
    SK,
    GSI1PK,
    GSI1SK,
  };
}

export function getChatKey(userId: string, chatId: string = ''): Keys {
  return {
    PK: userId,
    SK: `CHAT#${chatId}`,
  };
}

export function getChatsByTimeKey(
  userId: string,
  timestamp?: string | number,
): GSI1Keys {
  return {
    GSI1PK: `${userId}#CHAT`,
    ...(timestamp ? { GSI1SK: timestamp } : {}),
  };
}

export function getChatMessageKey(
  userId: string,
  messageId: string = '',
): Keys {
  return {
    PK: userId,
    SK: `MESSAGE#${messageId}`,
  };
}

export function getChatMessagesByTimeKey(
  userId: string,
  chatId: string,
  timestamp: string = '',
): GSI1Keys {
  return {
    GSI1PK: `${userId}#CHAT#${chatId}`,
    GSI1SK: `${timestamp}`,
  };
}

export function getMessageSourceKey(
  userId: string,
  messageId: string,
  sourceKey: string = '',
): Keys {
  return {
    PK: userId,
    SK: `SOURCE#${messageId}#${sourceKey}`,
  };
}

export async function bulkDelete(
  ddbClient: DynamoDBDocumentClient,
  tableName: string,
  keys: Keys[],
): Promise<void> {
  type DeleteRequestItem = Pick<
  Required<
  NonNullable<BatchWriteCommandOutput['UnprocessedItems']>
  >[string][number],
  'DeleteRequest'
  >;

  let unprocessed: DeleteRequestItem[] = keys.map((i) => ({
    DeleteRequest: {
      Key: i,
    },
  }));

  while (unprocessed.length > 0) {
    // take the first 25 from the unprocessed items
    const nextItemsToDelete = unprocessed.splice(0, 25);
    const input: BatchWriteCommandInput = {
      RequestItems: {
        [tableName]: nextItemsToDelete,
      },
    };
    const command = new BatchWriteCommand(input);
    const result = await ddbClient.send(command);

    if (
      result.UnprocessedItems &&
      result.UnprocessedItems[tableName] &&
      Array.isArray(result.UnprocessedItems[tableName]) &&
      result.UnprocessedItems[tableName].length > 0
    ) {
      // put the unprocessed items back at the front
      unprocessed = [...result.UnprocessedItems[tableName], ...unprocessed];
    }
  }
}

export async function getAllByPagination<Entity>(client: DynamoDBDocumentClient, commandInput: QueryCommandInput) {
  let entities: Entity[] = [];

  const paginationConfig = {
    client,
    pageSize: 100,
  };

  const paginator = paginateQuery(paginationConfig, commandInput);

  for await (const page of paginator) {
    if (
      page.Items !== undefined &&
      Array.isArray(page.Items) &&
      page.Items.length > 0
    ) {
      entities = [
        ...entities,
        ...(page.Items as Entity[]),
      ];
    }
  }

  return entities;
}