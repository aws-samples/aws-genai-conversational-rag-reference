/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { BaseOutputParser, OutputParserException } from 'langchain/schema/output_parser';

export class PojoOutputParser<T extends any = any> extends BaseOutputParser<T> {
  static lc_name() {
    return 'PojoOutputParser';
  }

  lc_namespace = ['langchain', 'output_parsers', 'pojo'];

  getFormatInstructions(): string {
    throw new Error('Method getFormatInstructions is not implemented');
  }

  /**
   * Parses the given JSON text to POJO.
   * @param text The text to parse
   * @returns The parsed output.
   */
  async parse(text: string): Promise<T> {
    try {
      const json = text.includes('```') ? text.trim().split(/```(?:json)?/)[1] : text.trim();
      return JSON.parse(json);
    } catch (e) {
      throw new OutputParserException(`Failed to parse. Text: "${text}". Error: ${e}`, text);
    }
  }
}
