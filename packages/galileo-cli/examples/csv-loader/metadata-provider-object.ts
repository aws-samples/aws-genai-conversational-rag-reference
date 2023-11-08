/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { parseCsv } from './parser-common';
import { DocumentMetadata, IMetadataProvider } from '../../src';

export class MetadataProvider implements IMetadataProvider {
  async getMetadata(): Promise<string | DocumentMetadata> {
    // build the metadata
    const docMetadata = parseCsv();

    // return the actual object
    return docMetadata;
  }
}
