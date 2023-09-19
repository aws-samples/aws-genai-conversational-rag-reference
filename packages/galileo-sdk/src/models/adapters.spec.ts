/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { AdaptedContentHandler } from './adapter.js';

describe('models/adapter', () => {

  describe('content handler', () => {
    test('should create default with empty config', async () => {
      const handler = new AdaptedContentHandler();
      const input = await handler.transformInput('text', { foo: 'Foo', bar: 'Bar' });
      expect(input.toString()).toEqual(JSON.stringify({
        text_inputs: 'text',
        foo: 'Foo',
        bar: 'Bar',
      }));

      const output = await handler.transformOutput(Buffer.from(JSON.stringify([{
        generated_text: 'the generated text',
      }])));
      expect(output).toBe('the generated text');
    });

    test('should create adapted content handler based on config', async () => {
      const handler = new AdaptedContentHandler({
        input: {
          promptKey: 'inputs',
          modelKwargsKey: 'parameters',
        },
        output: {
          jsonpath: '[0].result',
        },
      });
      const input = await handler.transformInput('text', { foo: 'Foo', bar: 'Bar' });
      expect(input.toString()).toEqual(JSON.stringify({
        inputs: 'text',
        parameters: {
          foo: 'Foo',
          bar: 'Bar',
        },
      }));

      const output = await handler.transformOutput(Buffer.from(JSON.stringify([{
        result: 'the generated text',
      }])));
      expect(output).toBe('the generated text');
    });
  });
});
