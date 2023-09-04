/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
// @ts-ignore
import type {} from "@types/jest";
import createJWKSMock from "mock-jwks";
import {
  getJwksInfo,
  COGNITO_IDTOKEN_HEADER,
  identityInterceptor,
} from "../src";

const AWS_REGION = "us-east-1";
process.env.AWS_REGION = AWS_REGION;
const USER_POOL_ID = "mock_UserPoolId";
process.env.USER_POOL_ID = USER_POOL_ID;
const USER_POOL_CLIENT_ID = "mockClientId";
process.env.USER_POOL_CLIENT_ID = USER_POOL_CLIENT_ID;

describe("interceptor/identity", () => {
  describe("cognito", () => {
    describe("token", () => {
      const jwksInfo = getJwksInfo(AWS_REGION, USER_POOL_ID);
      const jwks = createJWKSMock(jwksInfo.issuer);
      beforeEach(() => {
        jwks.start();
      });
      afterEach(() => {
        jwks.stop();
      });

      test("valid token", async () => {
        const idToken = jwks.token({
          sub: "1234567890",
          "cognito:groups": ["Administrators"],
          email_verified: true,
          iss: jwksInfo.issuer,
          "cognito:username": "tester",
          given_name: "Tester",
          // origin_jti: "xxxxxx-xxxxxx-xxxxxx-xxxxxx-xxxxxx",
          aud: USER_POOL_CLIENT_ID,
          // event_id: "xxxxx-xxx-xxx-xxxx-xxxxxxxxxxx",
          token_use: "id",
          auth_time: Date.now(),
          exp: Date.now(),
          iat: Date.now(),
          family_name: "Test",
          jti: "xxxxxx-xxxx-xxxx-xxxx-xxxx",
          email: "test+example@example.com",
        });

        const next = jest.fn();

        await identityInterceptor({
          event: {
            httpMethod: "GET",
            isBase64Encoded: false,
            path: "hello",
            resource: "hello",
            stageVariables: {} as any,
            pathParameters: {},
            queryStringParameters: {},
            multiValueQueryStringParameters: {},
            headers: {
              [COGNITO_IDTOKEN_HEADER]: idToken,
            },
            multiValueHeaders: {},
            body: JSON.stringify("hello"),
            requestContext: {} as any,
          },
          context: {} as any,
          input: {} as any,
          interceptorContext: {},
          chain: {
            next,
          },
        });

        expect(next).toHaveBeenCalled();
      });
    });
  });
});
