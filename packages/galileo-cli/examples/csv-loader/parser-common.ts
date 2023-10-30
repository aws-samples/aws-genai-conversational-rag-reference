/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parse } from "csv-parse/sync";
import { DocumentMetadata } from "../../src";

export const parseCsv = (): DocumentMetadata => {
  try {
    const filename = "example.csv";
    const filepath = path.join(__dirname, filename);
    const csvFileContent = fs.readFileSync(filepath, { encoding: "utf-8" });

    const rows: any[] = parse(csvFileContent, {
      columns: [
        { name: "service" },
        { name: "description" },
        { name: "serviceType" },
        { name: "freeTierType" },
      ],
      delimiter: ",",
      encoding: "utf-8",
      from_line: 2, // don't parse header line
    });

    const docMetadata: DocumentMetadata = {
      // leave it empty as we're not using any files
      // if you want to use files, use absolute path
      rootDir: "",
      metadata: {
        domain: "aws-services",
      },
      documents: {},
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      docMetadata.documents[`${filename}-line${i + 2}`] = {
        pageContent: `Service name: ${row.service}\nDescription: ${row.description}\nType: ${row.serviceType}`,
        metadata: {
          serviceType: row.serviceType,
          // only include this metadata entry if value present
          freeTierType: row.freeTierType === "" ? undefined : row.freeTierType,
        },
      };
    }

    return docMetadata;
  } catch (err) {
    console.log(JSON.stringify(err));
  }
};
