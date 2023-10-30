/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { DocumentMetadata } from "../types";

export interface IMetadataProvider {
  readonly getMetadata: () => string | DocumentMetadata;
}
