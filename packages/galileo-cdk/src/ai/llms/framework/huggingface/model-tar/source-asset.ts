// ~~ Generated by projen. To modify, edit .projenrc.js and run "npx projen".
/* eslint-disable */
import * as path from 'path';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { IConstruct } from 'constructs';

/**
 * Asset path for src/ai/llms/framework/huggingface/model-tar/source.asset
 */
export const SOURCE_ASSET_PATH = path.join(__dirname, '../../../../../../assets/ai/llms/framework/huggingface/model-tar/source');

/**
 * Asset construct for src/ai/llms/framework/huggingface/model-tar/source.asset
 */
export class SourceAsset extends Asset {
  constructor(scope: IConstruct, id: string) {
    super(scope, id, {
      "path": SOURCE_ASSET_PATH,
    })
  }
}