/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { ChatEngineConfig as RestChatEngineConfig } from 'api-typescript-runtime';
import { ChatEngineConfig as WsChatEngineConfig } from 'ws-api-typescript-runtime';
import { ENV } from './env';

export type ChatEngineConfig = RestChatEngineConfig | WsChatEngineConfig;

const ADMIN_GROUPS: string[] = JSON.parse(ENV.ADMIN_GROUPS);
export function isAdmin(groups?: string[]): boolean {
  return groups != null && groups.filter((v) => ADMIN_GROUPS.includes(v)).length > 0;
}
