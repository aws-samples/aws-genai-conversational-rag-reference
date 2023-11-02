/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  UserType,
  AdminListGroupsForUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ChainedRequestInput, OperationResponse, ServerErrorResponseContent } from 'api-typescript-runtime';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import NodeCache from 'node-cache';
import { CognitoAuth } from '../utils';
import { ApiResponse } from '../utils/api-response';

export interface CallingIdentity {
  identityType: 'COGNITO' | 'SIGV4';
  username: string;
  identityId: string;
  email?: string;
  givenName?: string;
  familyName?: string;
  preferredUsername?: string;
  groups?: string[];
  idToken?: string;
}

// How long to cache callers to save calls to cognito
const USER_CACHE_TTL_SECONDS = 3 * 60;
const USER_CACHE_CHECK_PERIOD_SECONDS = 30;

let _cognitoClient: CognitoIdentityProviderClient | null = null;

function getCognitoClient(): CognitoIdentityProviderClient {
  if (_cognitoClient == null) {
    _cognitoClient = new CognitoIdentityProviderClient({});
  }
  return _cognitoClient;
}

// Cache users
const userCache = new NodeCache({
  stdTTL: USER_CACHE_TTL_SECONDS,
  checkperiod: USER_CACHE_CHECK_PERIOD_SECONDS,
});

export interface IIdentityInterceptorContext {
  readonly callingIdentity: CallingIdentity;
}

export interface IdentityInterceptorEnvironment {
  /** Required if "x-cognito-idtoken" header is used for identity */
  readonly USER_POOL_ID?: string;
  /** Required if "x-cognito-idtoken" header is used for identity */
  readonly USER_POOL_CLIENT_ID?: string;
}

export const COGNITO_IDTOKEN_HEADER = 'x-cognito-idtoken';

export const IDENTITY_INTERCEPTOR_IAM_ACTIONS = [
  'cognito-idp:ListUsers',
  'cognito-idp:AdminListGroupsForUser',
] as const;

/**
 * Convert a cognito user to a calling identity
 */
export const cognitoUserToCallingIdentity = (user: UserType, groups: string[]): CallingIdentity => {
  const attributes = Object.fromEntries(user.Attributes?.map(({ Name, Value }) => [Name?.toLowerCase(), Value]) || []);

  const identityId = attributes.sub || user.Username || 'unknown';
  const username = user.Username || identityId;

  return {
    groups,
    username,
    identityId,
    email: attributes.email,
    identityType: 'COGNITO',
    preferredUsername: attributes.preferred_username,
    givenName: attributes.family_name,
    familyName: attributes.given_name,
  };
};

/**
 * Retrieve the more specific cognito caller when the sigv4 signed request comes from a cognito identity
 * @param event api gateway lambda event
 */
const getCognitoCallerIdentity = async (event: APIGatewayProxyEvent): Promise<CallingIdentity | undefined> => {
  let cognitoAuthenticationProvider: string | null = event?.requestContext?.identity?.cognitoAuthenticationProvider;

  if (cognitoAuthenticationProvider == null) {
    if (COGNITO_IDTOKEN_HEADER in event.headers) {
      try {
        const idToken = event.headers[COGNITO_IDTOKEN_HEADER];

        if ('USER_POOL_CLIENT_ID' in process.env && 'USER_POOL_ID' in process.env) {
          if (idToken) {
            const cachedCallingIdentity = userCache.get<CallingIdentity>(idToken);

            if (cachedCallingIdentity) {
              return cachedCallingIdentity;
            }

            const cognitoIdentity = await new CognitoAuth({
              region: (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION)!,
              userPoolClientId: process.env.USER_POOL_CLIENT_ID!,
              userPoolId: process.env.USER_POOL_ID!,
            }).verify(idToken);

            if (cognitoIdentity) {
              const username = cognitoIdentity['cognito:username'] as string;
              const identityId = cognitoIdentity.sub as string;
              const groups = (cognitoIdentity['cognito:groups'] || []) as string[];

              const callingIdentity: CallingIdentity = {
                idToken,
                identityType: 'COGNITO',
                username: username,
                groups: groups,
                identityId: identityId,
                email: cognitoIdentity.email as string | undefined,
                givenName: cognitoIdentity.givenName as string | undefined,
                familyName: cognitoIdentity.familyName as string | undefined,
                preferredUsername: cognitoIdentity.preferred_username as string | undefined,
              };

              userCache.set<CallingIdentity>(idToken, callingIdentity);

              return callingIdentity;
            }
          }
        }
      } catch (error) {
        console.error(`Failed to verify ${COGNITO_IDTOKEN_HEADER} token`, error);
        return undefined;
      }
    }
  }

  if (cognitoAuthenticationProvider) {
    const providerParts = cognitoAuthenticationProvider.split(':');
    const subjectId = providerParts[providerParts.length - 1];
    const providerSourceParts = providerParts[0].split('/');
    const userPoolId = providerSourceParts[providerSourceParts.length - 1];

    const cachedCallingIdentity = userCache.get<CallingIdentity>(subjectId);

    if (cachedCallingIdentity) {
      return cachedCallingIdentity;
    }

    const cognito = getCognitoClient();

    const { Users } = await cognito.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Limit: 1,
        Filter: `sub="${subjectId}"`,
      }),
    );

    if (!Users || Users.length !== 1) {
      throw new Error(`No user found with subjectId ${subjectId} in pool ${userPoolId}`);
    }

    const user = Users[0];

    let groups: string[] = [];
    try {
      const { Groups } = await cognito.send(
        new AdminListGroupsForUserCommand({
          UserPoolId: userPoolId,
          Limit: 50,
          Username: user.Username,
        }),
      );
      if (Groups && Groups.length > 0) {
        groups = Groups.map((v) => v.GroupName).filter((v) => v == null) as string[];
      }
    } catch (error) {
      console.error(error);
    }

    const callingIdentity = cognitoUserToCallingIdentity(user, groups);

    userCache.set(subjectId, callingIdentity);

    return callingIdentity;
  }
  return undefined;
};

/**
 * Retrieve the caller for a sigv4 signed request
 * @param event api gateway lambda event
 */
const getSigv4CallerIdentity = (event: APIGatewayProxyEvent): CallingIdentity | undefined => {
  const identity = event?.requestContext?.identity || {};
  if (identity.userArn && identity.user) {
    return {
      // NB: You may wish to treat this as "SYSTEM_USER" rather than distinguishing between particular IAM roles
      // Alternatively, you may wish to allow SIGV4 authenticated callers to specify the user in an http header and
      // make use of that, to delegate authentication of users to the other system.
      username: identity.user,
      identityId: identity.userArn,
      identityType: 'SIGV4',
    };
  }

  return undefined;
};

/**
 * Interceptor for identifying the authorized user who made the request, and providing it in the interceptorContext for
 * API handlers to make use of it for authorization or auditing purposes.
 */
export const identityInterceptor = async <
  RequestParameters,
  RequestBody,
  Response extends OperationResponse<number, any>,
>(
  request: ChainedRequestInput<RequestParameters, RequestBody, Response>,
): Promise<Response | OperationResponse<403, ServerErrorResponseContent>> => {
  const { event } = request;
  const callingIdentity = (await getCognitoCallerIdentity(event)) || getSigv4CallerIdentity(event);

  if (!callingIdentity) {
    console.error(`Could not determine authenticated caller`, JSON.stringify(event));
    return ApiResponse.notAuthorized({
      errorMessage: 'You are not authorized to perform this operation',
    });
  }

  // Add the calling identity to the context
  request.interceptorContext.callingIdentity = callingIdentity;
  return request.chain.next(request);
};
