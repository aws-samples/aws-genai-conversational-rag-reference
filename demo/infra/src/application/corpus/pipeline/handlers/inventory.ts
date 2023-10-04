/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { getLogger } from "@aws/galileo-sdk/lib/common";
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import prettyBytes from "pretty-bytes";

const logger = getLogger("inventory");

export interface BucketInventoryDetails {
  /** Bucket name */
  readonly bucket: string;
  /** Object prefix */
  readonly prefix?: string;
  /** Filters that were applied */
  readonly filter?: BucketInventoryFilter;
  /** Total number of contents returned (after any filtering) */
  readonly count: number;
  /** Sum of all object sizes (bytes) */
  readonly bytes: number;
  /** Pretty value of size (12 MB) */
  readonly size: string;
}

export interface BucketInventory extends BucketInventoryDetails {
  readonly contents: BucketInventoryObject[];
  readonly getDetails: () => BucketInventoryDetails;
}

export interface BucketInventoryObject {
  readonly Key: string;
  readonly LastModified: string;
  readonly ETag: string;
  readonly Size: number;
  readonly StorageClass: string;
}

export interface BucketInventoryFilter {
  /**
   * Filter objects modified since date.
   * @default undefined - No date filtering applied
   */
  readonly since?: Date | number | string;
  /**
   * Max number of files to return. Useful for debugging and testing purposes.
   * @development
   * @default undefined - No max
   */
  readonly maxFiles?: number;
}

export async function getBucketInventory(
  bucket: string,
  prefix?: string,
  filter?: BucketInventoryFilter
): Promise<BucketInventory> {
  const client = new S3Client();

  let allContents: BucketInventoryObject[] = [];
  let nextToken: string | undefined = undefined;

  let { since, maxFiles } = filter || {};
  if (since && since instanceof Date !== true) {
    since = new Date(since);
  }

  logger.info("Get bucket inventory", { bucket, prefix, filter, since });

  do {
    const { Contents, NextContinuationToken } = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: nextToken,
      })
    );

    nextToken = NextContinuationToken;
    Contents && allContents.push(...(Contents as any));
  } while (nextToken != null);

  let totalBytes: number = 0;
  const doFilter = since != null || maxFiles != null;
  const filteredContent: BucketInventoryObject[] | null = doFilter ? [] : null;

  const total = allContents.length;

  for (let i = 0; i < total; i++) {
    const file = allContents[i];
    if (doFilter && filteredContent) {
      if (maxFiles && filteredContent.length >= maxFiles) {
        // reached max files
        break;
      }
      if (since && new Date(file.LastModified) <= since) {
        // Not modified since filter date
        continue;
      }
      filteredContent.push(file);
    }
    totalBytes += file.Size;
  }

  const contents = filteredContent || allContents;
  const count = contents.length;

  const details: BucketInventoryDetails = {
    bucket,
    prefix,
    count,
    filter,
    bytes: totalBytes,
    size: prettyBytes(totalBytes),
  };

  logger.info("Bucket Inventory successfully defined", { details });

  return {
    ...details,
    contents,
    getDetails: () => details,
  };
}

export type BucketInventoryManifestFile = [{ prefix: string }, ...string[]];

export function convertBucketInventoryToManifest(
  inventory: BucketInventory,
  include?: Set<string>
): BucketInventoryManifestFile {
  const prefix = (inventory.prefix ?? "").replace(/^\\/, "");

  const contents =
    include == null
      ? inventory.contents
      : inventory.contents.filter((v) => include.has(v.Key));

  return [
    { prefix: `s3://${inventory.bucket}/${prefix}` },
    ...contents.map((v) => v.Key),
  ];
}

export async function saveBucketInventoryManifest(
  inventory: BucketInventory,
  toBucket: string,
  toKey: string,
  include?: Set<string>
): Promise<string> {
  const manifest = convertBucketInventoryToManifest(inventory, include);

  toKey = toKey.replace(/^\/+/, ""); // remove head slash(s)

  const bodyContent = JSON.stringify(manifest, null, 2);

  const client = new S3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: toBucket,
      Key: toKey,
      Body: bodyContent,
      ContentType: "application/json",
    })
  );

  return `s3://${toBucket}/${toKey}`;
}
