/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import ExcelJs from 'exceljs';
import { isEmpty } from 'lodash';
import { DocumentMetadata } from '../../src';

export interface ExcelLoaderOptions {
  /**
   * Path to the excel file.
   */
  readonly execFilepath: string;

  /**
   * The domain to use in the root metadata object.
   * @default "my-example-domain"
   */
  readonly domain?: string;

  /**
   * Additional metadata to use in the root metadata object.
   */
  readonly rootMetadata: Record<string, string>;

  /**
   * The name of the key to add the worksheet's name as metadata.
   *
   * E.g.: if the value of this parameter is "category" and the worksheet's name is "Sheet1",
   * it will be added as `category: Sheet1` into the document's metadata object.
   *
   * If it's not set, the worksheet's name won't be added as a metadata.
   */
  readonly worksheetNameMetadataKey?: string;

  /**
   * Whether to save the document metadata as a `metadata.json` file.
   * If it's `true`, the metadata will be saved next to the excel file and its path is returned;
   * otherwise, the `DocumentMetadata` object is returned.
   */
  readonly saveMetadata?: boolean;

  /**
   * The index of the header row. This is 1-based (i.e.: excel row indexing)
   * @default 1
   */
  readonly headerRowIndex?: number;

  /**
   * The start index of the rows containing data. This is 1-based (i.e.: excel row indexing)
   * @default 2
   */
  readonly dataRowStartIndex?: number;

  /**
   * Column selector to include data in the `pageContent`.
   * Use column index (1-based) or column letter.
   *
   * The content will be added to `pageContent` in the order of the selector items,
   * using `headerValue`: `cellValue` lines
   */
  readonly pageContentColumnSelector: (string | number)[];

  /**
   * Column selector to use to include data in the entry's `metadata`.
   * Use column index (1-based) or column letter.
   *
   * This will be added to the entry's `metadata`
   * in the format of `headerValue`: `cellValue`
   *
   * @default undefined
   */
  readonly entryMetadataColumnSelector?: (string | number)[];

  /**
   * Whether to use base64 encoded metadata in the entries' metadata section.
   * Set this to `true` if you have metadata that uses non-US-ASCII characters (e.g.: Vietnamese chars)
   *
   * @default false
   */
  readonly useBase64EncodedEntryMetadata?: boolean;
}

export class ExcelLoader {
  readonly options: ExcelLoaderOptions;

  constructor(options: ExcelLoaderOptions) {
    this.options = options;
  }

  async process(): Promise<DocumentMetadata | string> {
    const documentMetadata: DocumentMetadata = {
      rootDir: '',
      metadata: {
        domain: this.options.domain ?? 'my-example-domain',
        ...this.options.rootMetadata,
      },
      documents: {},
    };
    const excelFilename = path.basename(this.options.execFilepath);

    const headerRowIndex = this.options.headerRowIndex ?? 1;
    const dataRowStartIndex = this.options.dataRowStartIndex ?? 2;

    const workbook = new ExcelJs.Workbook();
    await workbook.xlsx.readFile(this.options.execFilepath);

    for (const worksheet of workbook.worksheets) {
      console.log(`Processing worksheet ${worksheet.name}`);

      const headerRow = worksheet.getRow(headerRowIndex);
      const keys: Record<string, string> = {};

      this.options.pageContentColumnSelector.forEach((columnNameOrIdx) => {
        keys[`${columnNameOrIdx}`] = headerRow.getCell(columnNameOrIdx).toString();
      });

      // if there are no data rows, skip processing
      if (worksheet.rowCount <= dataRowStartIndex) {
        continue;
      }

      const lastrowIdx = worksheet.rowCount;

      for (let rowIdx = 2; rowIdx <= lastrowIdx; rowIdx++) {
        const row = worksheet.getRow(rowIdx);

        const content: string[] = [];
        this.options.pageContentColumnSelector.forEach((columnNameOrIdx) => {
          const val = row.getCell(columnNameOrIdx).toString();

          if (!isEmpty(val)) {
            content.push(`${keys[`${columnNameOrIdx}`]}: ${val}`);
          }
        });

        const entryMeta: Record<string, string> = {};
        if (this.options.entryMetadataColumnSelector) {
          this.options.entryMetadataColumnSelector.forEach((columnNameOrIdx) => {
            const val = row.getCell(columnNameOrIdx).toString();

            if (!isEmpty(val)) {
              entryMeta[keys[`${columnNameOrIdx}`]] = val;
            }
          });
        }

        let entryMetadata: Record<string, any> = {};
        if (this.options.worksheetNameMetadataKey) {
          entryMetadata[this.options.worksheetNameMetadataKey] = worksheet.name;
        }

        if (this.options.useBase64EncodedEntryMetadata) {
          entryMetadata['json-base64'] = Buffer.from(JSON.stringify(entryMeta)).toString('base64');
        } else {
          entryMetadata = {
            ...entryMetadata,
            ...entryMeta,
          };
        }

        const pageContent = content.join('\n');
        if (isEmpty(pageContent)) {
          continue;
        }

        documentMetadata.documents[`${excelFilename}/${worksheet.name}/row-${rowIdx}`] = {
          metadata: entryMetadata,
          pageContent: content.join('\n'),
        };
      }
    }

    if (this.options.saveMetadata) {
      // save it as a metadata.json file
      const outputDirPath = path.join(path.dirname(this.options.execFilepath), 'generated');
      if (!fs.existsSync(outputDirPath)) {
        fs.mkdirSync(outputDirPath);
      }
      const outputFilepath = path.join(outputDirPath, 'metadata.json');

      // save into a file
      fs.writeFileSync(outputFilepath, JSON.stringify(documentMetadata, null, 2), {
        encoding: 'utf-8',
      });

      // return absolute path
      return outputFilepath;
    }

    return documentMetadata;
  }
}
