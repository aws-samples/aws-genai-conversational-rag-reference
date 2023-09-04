/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import * as jose from "jose";
import fetch from "node-fetch";

// copied and updated a bit from https://github.com/aws-samples/aws-genai-llm-chatbot/blob/c5b8d468f6e940d628d6e15e53900f416db3e578/lib/chatbot-backend/functions/chat-action/common/cognito-auth.ts

export interface CognitoAuthProps {
  readonly region: string;
  readonly userPoolId: string;
  readonly userPoolClientId: string;
}

interface JwksInfo {
  readonly issuer: string;
  readonly jwskUri: string;
}

export function getJwksInfo(region: string, userPoolId: string): JwksInfo {
  const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  const jwskUri = `${issuer}/.well-known/jwks.json`;
  return {
    issuer,
    jwskUri,
  };
}

export class CognitoAuth {
  private _jwks: { [kid: string]: Uint8Array | jose.KeyLike } | null = null;
  private _jwksInfo: JwksInfo;
  private _userPoolClientId: string;

  constructor(props: CognitoAuthProps) {
    this._userPoolClientId = props.userPoolClientId;
    this._jwksInfo = getJwksInfo(props.region, props.userPoolId);
  }

  async verify(token?: string) {
    if (!this._jwks) {
      await this.fetchJWKS();
    }

    if (!token) {
      return null;
    }

    const verificationResult = await this.getVerifiedToken(token);
    if (verificationResult && verificationResult.verified) {
      return verificationResult.payload;
    }

    return null;
  }

  private async fetchJWKS() {
    const url = this._jwksInfo.jwskUri;
    console.log(`fetchJWKS: ${url}`);

    const response = await fetch(url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jwksObj: any = await response.json();
    const jwks: { [key: string]: Uint8Array | jose.KeyLike } = {};

    for (const key of jwksObj.keys) {
      jwks[key.kid] = await jose.importJWK(key, key.alg);
    }

    this._jwks = jwks;
  }

  private async getVerifiedToken(token: string) {
    const { kid } = jose.decodeProtectedHeader(token);
    if (!this._jwks || !kid) {
      return null;
    }

    try {
      const result = await jose.jwtVerify(token, this._jwks[kid], {
        audience: this._userPoolClientId,
        issuer: this._jwksInfo.issuer,
      });

      const payload = result.payload;
      if (result.payload.token_use !== "id") {
        return null;
      }

      return {
        verified: true,
        payload,
      };
    } catch (e) {
      console.error(e);
    }

    return null;
  }
}
