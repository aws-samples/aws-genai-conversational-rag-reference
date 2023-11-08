/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import chalk from 'chalk';
import prompts from 'prompts';

import { ExcelLoader } from './excel-loader';
import { DocumentMetadata, IMetadataProvider } from '../../src';

export class MetadataProvider implements IMetadataProvider {
  async getMetadata(): Promise<string | DocumentMetadata> {
    // build the metadata
    const { excelPath } = await prompts({
      type: 'text',
      name: 'excelPath',
      message: `Enter the path to the excel file (${chalk.grey(`CWD: ${process.cwd()}`)}):`,
    });

    const excelLoader = new ExcelLoader({
      execFilepath: excelPath,
      domain: 'aws-services',
      rootMetadata: {
        collection: 'example-collection',
      },
      worksheetNameMetadataKey: 'serviceType',
      saveMetadata: true,
      headerRowIndex: 1,
      dataRowStartIndex: 2,

      pageContentColumnSelector: [
        'A', // service
        2, // description -- note, column index
        'D', // url
        'C', // free tier type
      ],

      entryMetadataColumnSelector: [
        'D', // url
        3, // free tier type -- note, column index
      ],
      useBase64EncodedEntryMetadata: false,
    });
    const result = await excelLoader.process();
    return result;
  }
}
