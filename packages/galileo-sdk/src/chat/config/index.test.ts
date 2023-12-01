/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
// @ts-ignore - jest types are messed up in repo
import type {} from '@types/jest';
import { ChatEngineConfig, extractPrivilegedChatEngineConfigKeys, mergeUnresolvedChatEngineConfig } from './index';

describe('chat/config', () => {
  describe('mergeUnresolvedChatEngineConfig', () => {
    test('should correctly merge configs', () => {
      const actual = mergeUnresolvedChatEngineConfig(
        {
          llm: {
            model: 'sys-llm',
            modelKwargs: { a: 'sys' },
          },
          classifyChain: {
            enabled: false,
          },
          search: {
            url: 'system',
            limit: 10,
          },
          memory: {
            limit: 10,
          },
        },
        {
          llm: {
            model: 'application-llm',
            modelKwargs: { b: 'app', c: 'app' },
          },
          classifyChain: {
            llm: {
              model: 'application-classify-llm',
            },
          },
          search: {
            url: 'application',
          },
          memory: {
            limit: 9,
          },
        },
        {
          llm: {
            model: 'user-llm',
            modelKwargs: { c: 'user' },
          },
        },
      );

      const expected: ChatEngineConfig = {
        llm: {
          model: 'user-llm',
          modelKwargs: { a: 'sys', b: 'app', c: 'user' },
        },
        search: {
          limit: 10,
          url: 'application',
        },
        memory: {
          limit: 9,
        },
        classifyChain: {
          enabled: false,
          llm: {
            model: 'application-classify-llm',
          },
        },
      };

      expect(actual).toEqual(expected);
    });
  });

  describe('extractPrivilegedChatEngineConfigKeys', () => {
    test('should return empty list for empty config', () => {
      expect(extractPrivilegedChatEngineConfigKeys({})).toEqual([]);
    });
    test('should detect privileged keys', () => {
      expect(
        extractPrivilegedChatEngineConfigKeys({
          search: {
            url: 'xxx',
          },
          llm: {
            model: {
              framework: {},
              adapter: {},
            } as any,
          },
          qaChain: {
            llm: {
              model: {
                framework: {},
                adapter: {},
              } as any,
            },
          },
          condenseQuestionChain: {
            llm: {
              model: {
                framework: {},
                adapter: {},
              } as any,
            },
          },
          classifyChain: {
            llm: {
              model: {
                framework: {},
                adapter: {},
              } as any,
            },
          },
        }),
      ).toEqual([
        'llm.model.framework',
        'llm.model.adapter',
        'qaChain.llm.model.framework',
        'qaChain.llm.model.adapter',
        'condenseQuestionChain.llm.model.framework',
        'condenseQuestionChain.llm.model.adapter',
        'classifyChain.llm.model.framework',
        'classifyChain.llm.model.adapter',
        'search.url',
      ]);
    });
    test('should allow non-privileged keys', () => {
      expect(
        extractPrivilegedChatEngineConfigKeys({
          search: {
            limit: 10,
            filter: {},
            scoreThreshold: 0.5,
          } as any,
          llm: {
            model: { uuid: 'ok' } as any,
          },
          qaChain: {
            llm: {
              model: { uuid: 'ok' } as any,
            },
          },
          condenseQuestionChain: {
            llm: {
              model: { uuid: 'ok' } as any,
            },
          },
          classifyChain: {
            llm: {
              model: { uuid: 'ok' } as any,
            },
          },
        }),
      ).toEqual([]);
    });
  });
});
