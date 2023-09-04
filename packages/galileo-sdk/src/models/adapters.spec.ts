/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { AdaptedContentHandler, PromptAdapter } from './adapter';

const QA_TEMPLATE = `<sequence><instruction><system>system details</system>

<context>Chat History: <delimiter>{chat_history}</delimiter></context>

Follow Up Question: <human>{question}</human>
Standalone Question: </instruction> <ai>`;

describe('models/adapter', () => {
  describe('prompt', () => {
    test('should remove all tags and trim template with empty adapter config', () => {
      const adapter = new PromptAdapter({
        ai: { open: '', close: '' },
        human: { open: '', close: '' },
        sequence: { open: '', close: '' },
        instruction: { open: '', close: '' },
        context: { open: '', close: '' },
        system: { open: '', close: '' },
        delimiter: { open: '', close: '' },
      });

      expect(adapter.transform(QA_TEMPLATE)).toBe(
        PromptAdapter.trim(QA_TEMPLATE
          .replace(/<([a-z]+)>/g, '')
          .replace(/<\/([a-z]+)>/g, ''),
        ),
      );
    });
    test('should adapt prompts based on config', () => {
      const adapter = new PromptAdapter({
        ai: { open: 'ai:', close: ':ai' },
        human: { open: 'human:', close: ':human' },
        sequence: { open: 'sequence:', close: ':sequence' },
        instruction: { open: 'instruction:', close: ':instruction' },
        context: { open: 'context:', close: ':context' },
        system: { open: 'system:', close: ':system' },
        delimiter: { open: 'delimiter:', close: ':delimiter' },
      });


      expect(adapter.transform(QA_TEMPLATE)).toBe(
        PromptAdapter.trim(QA_TEMPLATE
          .replace(/<([a-z]+)>/g, '$1:')
          .replace(/<\/([a-z]+)>/g, ':$1'),
        ),
      );
    });
    test('falcon', () => {
      const adapter = new PromptAdapter({
        ai: { open: '<|assistant|>', close: '<|endoftext|>' },
        human: { open: '<|prompter|>', close: '<|endoftext|>' },
        system: { open: '<|system|>', close: '<|endoftext|>' },
      });

      const FALCON_TEMPLATE = `<|system|>system details<|endoftext|>

Chat History: '''{chat_history}'''

Follow Up Question: <|prompter|>{question}<|endoftext|>
Standalone Question: <|assistant|>`;

      expect(adapter.transform(QA_TEMPLATE)).toBe(PromptAdapter.trim(FALCON_TEMPLATE));
    });
    test('llama', () => {
      const adapter = new PromptAdapter({
        ai: { open: '', close: '' },
        human: { open: '', close: '' },
        sequence: { open: '<s>', close: '</s>' },
        instruction: { open: '[INST]', close: '[/INST]' },
        system: { open: ' <<SYS>>\n', close: '\n<</SYS>>\n\n' },
      });

      const LLAMA_TEMPLATE = `<s>[INST] <<SYS>>
system details
<</SYS>>

Chat History: '''{chat_history}'''

Follow Up Question: {question}
Standalone Question: [/INST]`;

      expect(adapter.transform(QA_TEMPLATE)).toBe(PromptAdapter.trim(LLAMA_TEMPLATE));
    });
  });

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
