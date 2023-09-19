/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { BaseMessage } from 'langchain/schema';

// Patch langchain BaseMessage prototype to have "type" getter
// Currently only has _getType() method and we need simple getter for template
Object.defineProperty(BaseMessage.prototype, 'type', {
  get: function () {
    return this._getType();
  },
  configurable: true,
  enumerable: true,
});
