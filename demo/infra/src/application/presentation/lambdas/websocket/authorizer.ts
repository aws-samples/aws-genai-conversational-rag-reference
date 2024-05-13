/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { APIGatewayRequestAuthorizerHandler } from 'aws-lambda';

const userPoolId = process.env.USER_POOL_ID!;
const clientId = process.env.CLIENT_ID!;

export const handler: APIGatewayRequestAuthorizerHandler = async (event) => {
  try {
    console.info('WsApi authorizer', event);

    const verifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'id',
      clientId,
    });

    const encodedToken = event.queryStringParameters?.authToken;
    if (!encodedToken) {
      throw new Error(`authToken not found in query string`);
    }
    const payload = await verifier.verify(encodedToken);
    console.info('Token is valid. Payload:', payload);

    return allowPolicy(event.methodArn, payload);
  } catch (error) {
    console.error(error);
    return denyAllPolicy();
  }
};

const denyAllPolicy = () => {
  return {
    principalId: '*',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: '*',
          Effect: 'Deny',
          Resource: '*',
        },
      ],
    },
  };
};

const allowPolicy = (methodArn: string, idToken: any) => {
  return {
    principalId: idToken.sub,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: methodArn,
        },
      ],
    },
    context: {
      // set userId in the context
      userId: idToken.sub,
    },
  };
};
