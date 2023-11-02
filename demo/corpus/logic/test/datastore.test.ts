/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
// @ts-ignore
import type {} from '@types/jest';
import { normalizeMetadata } from '../src/indexing/datastore';

describe('metadata', () => {
  test('normalizeMetadata - simple', () => {
    const metadata = {
      key: 'value',
      key1: 'value1',
    };

    const result = normalizeMetadata(metadata);

    expect(result).toEqual(metadata);
  });

  test('normalizeMetadata - with base64 field', () => {
    // example to generate the base64 encoded values
    // const nonUsASCIIKV = {
    //   "chìa khóa": "giá trị",
    //   "giá trị": "chìa khóa",
    // };
    // const base64EncodedValue = Buffer.from(
    //   JSON.stringify(nonUsASCIIKV)
    // ).toString("base64");
    // console.log(base64EncodedValue);

    const metadata = {
      'key': 'value',
      'json-base64':
        'eyJjaMOsYSBraMOzYSI6Imdpw6EgdHLhu4siLCJnacOhIHRy4buLIjoiY2jDrGEga2jDs2EifQ==', // base64EncodedValue,
    };

    const expectedResult = {
      'key': 'value',
      'chìa khóa': 'giá trị',
      'giá trị': 'chìa khóa',
    };

    const result = normalizeMetadata(metadata);
    expect(result).toEqual(expectedResult);
  });

  test('normalizeMetadata - with wrong base64 field', () => {
    const metadata = {
      'key': 'value',
      'json-base64': 'wrongly-encoded-value',
    };

    const expectedResult = {
      key: 'value',
    };

    const result = normalizeMetadata(metadata);
    expect(result).toEqual(expectedResult);
  });
});
