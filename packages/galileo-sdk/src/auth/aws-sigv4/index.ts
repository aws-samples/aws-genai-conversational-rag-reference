/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Sha256 } from '@aws-crypto/sha256-js';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { parseQueryString } from '@aws-sdk/querystring-parser';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import type { Provider, AwsCredentialIdentity, HeaderBag } from '@aws-sdk/types';

type SignedFetcherInit = {
  service: string;
  region: string;
  credentials: AwsCredentialIdentity | Provider<AwsCredentialIdentity>;
  // "X-Cognito-IdToken" header token to provide specific user identity
  idToken?: string;
};

type CreateSignedFetcher = (init: SignedFetcherInit) => typeof fetch;

export const createSignedFetcher: CreateSignedFetcher = ({ service, region, credentials, idToken }): typeof fetch => {
  return async (input, init?) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);

    const headers = new Headers(init?.headers);
    headers.set('host', url.host);
    idToken && headers.set('X-Cognito-IdToken', idToken);

    const _headers: HeaderBag = {};
    headers.forEach((value, key) => (_headers[key] = value));

    const request = new HttpRequest({
      hostname: url.hostname,
      path: url.pathname,
      protocol: url.protocol,
      method: init?.method?.toUpperCase() || 'GET',
      body: init?.body,
      query: parseQueryString(url.search),
      headers: _headers,
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
