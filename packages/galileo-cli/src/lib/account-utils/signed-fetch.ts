/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Sha256 } from '@aws-crypto/sha256-js';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { parseQueryString } from '@aws-sdk/querystring-parser';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Provider, AwsCredentialIdentity } from '@aws-sdk/types';
import fetch, { Headers } from 'cross-fetch';

type SignedFetcherInit = {
  service: string;
  region?: string;
  credentials: AwsCredentialIdentity | Provider<AwsCredentialIdentity>;
};

export const createSignedFetcher = ({ service, region = 'us-east-1', credentials }: SignedFetcherInit) => {
  return async (input: string | URL | RequestInfo, init: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    // @ts-ignore
    const headers = new Map((init?.headers && new Headers(init?.headers)) || []);
    headers.set('host', url.host);
    const request = new HttpRequest({
      hostname: url.hostname,
      path: url.pathname,
      protocol: url.protocol,
      method: init?.method?.toUpperCase() || 'GET',
      body: init?.body,
      query: parseQueryString(url.search),
      headers: Object.fromEntries(headers.entries()),
    });
    const signer = new SignatureV4({
      credentials,
      service,
      region,
      sha256: Sha256,
    });
    const signedRequest = await signer.sign(request);
    return fetch(input, { headers: signedRequest.headers, body: signedRequest.body, method: signedRequest.method });
  };
};
