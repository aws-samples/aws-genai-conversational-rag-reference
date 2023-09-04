/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { CognitoAuth, useCognitoAuthContext } from "@aws-northstar/ui";
import { User as AppUser } from "@aws-northstar/ui/components/AppLayout/components/NavHeader";
import ErrorMessage from "@aws-northstar/ui/components/CognitoAuth/components/ErrorMessage";
import Spinner from "@cloudscape-design/components/spinner";
import jwt_decode from "jwt-decode";
import React, {
  FC,
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Config from "./config.json";

export interface RuntimeContext {
  readonly apiUrl: string;
  readonly region: string;
  readonly userPoolId: string;
  readonly userPoolWebClientId: string;
  readonly identityPoolId: string;
  readonly dataSovereigntyRisk: boolean;
  readonly inferenceBufferedFunctionUrl: string;
  readonly flags?: Record<string, boolean>;
  /**
   * Comma-separate list of foundation model ids that have been deployed
   */
  readonly foundationModels: string;
  readonly defaultModelId: string;
}

/**
 * Context for storing the runtimeContext.
 */
export const RuntimeConfigContext = createContext<RuntimeContext | undefined>(
  undefined
);

export const useRuntimeConfig = () => {
  const context = useContext(RuntimeConfigContext);
  if (context == null) {
    throw new Error("RuntimeConfig context is not provided");
  }
  return context;
};

/**
 * Sets up the runtimeContext and Cognito auth.
 *
 * This assumes a runtime-config.json file is present at '/'. In order for Auth to be set up automatically,
 * the runtime-config.json must have the following properties configured: [region, userPoolId, userPoolWebClientId, identityPoolId].
 */
const Auth: React.FC<any> = ({ children }) => {
  const [runtimeContext, setRuntimeContext] = useState<
    RuntimeContext | undefined
  >();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    fetch("/runtime-config.json")
      .then((response) => {
        return response.json();
      })
      .then((runtimeCtx) => {
        if (
          runtimeCtx.region &&
          runtimeCtx.userPoolId &&
          runtimeCtx.userPoolWebClientId &&
          runtimeCtx.identityPoolId
        ) {
          setRuntimeContext(runtimeCtx as RuntimeContext);
        } else {
          setError(
            "runtime-config.json should have region, userPoolId, userPoolWebClientId & identityPoolId."
          );
        }
      })
      .catch(() => {
        setError("No runtime-config.json detected");
      });
  }, [setRuntimeContext]);

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>;
  }

  return runtimeContext?.userPoolId && runtimeContext?.userPoolWebClientId ? (
    <CognitoAuth
      header={Config.applicationName}
      userPoolId={runtimeContext.userPoolId}
      clientId={runtimeContext.userPoolWebClientId}
      region={runtimeContext.region}
      identityPoolId={runtimeContext.identityPoolId}
    >
      <RuntimeConfigContext.Provider value={runtimeContext}>
        <UserContextProvider>{children}</UserContextProvider>
      </RuntimeConfigContext.Provider>
    </CognitoAuth>
  ) : (
    <></>
  );
};

type IGetIdTokenCallback = () => Promise<string>;

interface IUserContext {
  readonly getIdToken: IGetIdTokenCallback;
  readonly username: string;
  readonly email?: string;
  readonly groups?: string[];
  readonly isAdmin?: boolean;
  readonly claims?: Record<string, any>;
  readonly givenName?: string;
  readonly familyName?: string;
}

const UserContext = createContext<IUserContext | undefined>(undefined);

export const useUserContext = (): IUserContext => {
  const context = useContext(UserContext);
  if (context == null) {
    throw new Error(
      "UserContextProvider is not define or has not yet resolved"
    );
  }
  return context;
};

export const useGetIdToken = () => {
  return useUserContext().getIdToken;
};

/**
 * Indicates if the user is an administrator
 */
export const useIsAdmin = (): boolean => {
  return useUserContext().isAdmin === true;
};

export const useAppUser = (): AppUser => {
  const user = useUserContext();

  let username = user.username;

  if (user.givenName) {
    username = `${user.givenName} ${user.familyName}`;
  }

  if (user.isAdmin) {
    username += ` (Admin)`;
  }

  return {
    username,
    email: user.email,
  };
};

export const UserContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const { getAuthenticatedUserSession } = useCognitoAuthContext();
  const [idToken, setIdToken] = useState<string | null>();

  // Resolve the idToken from dynamic user session (automatic refresh)
  // Called downstream, with hook to update the idToken anytime it changes
  // Currently this will only get triggered in this provider and by lambda functionurl auth flow.
  const getIdToken = useCallback(async (): Promise<string> => {
    const _session = await getAuthenticatedUserSession();
    const _idToken = _session?.getIdToken().getJwtToken();
    if (_idToken == null) {
      throw new Error("Missing cognito user session");
    }
    if (_idToken !== idToken) {
      setIdToken(_idToken);
    }
    return _idToken;
  }, [getAuthenticatedUserSession, idToken, setIdToken]);

  // Resolve initial token claims, and anytime cognito context changes
  useEffect(() => {
    (async () => {
      await getIdToken();
    })().catch((error) => console.warn(error));
  }, [getAuthenticatedUserSession]);

  // Extract claims from idToken and persist as user details
  const userContext = useMemo<IUserContext | undefined>(() => {
    if (idToken == null) {
      return undefined;
    }

    const claims: any = jwt_decode(idToken);
    const groups = claims["cognito:groups"] || [];
    const isAdmin = groups.includes("Administrators");

    const user: IUserContext = {
      getIdToken,
      claims,
      groups,
      isAdmin,
      username: claims["cognito:username"],
      email: claims.email,
      givenName: claims.given_name,
      familyName: claims.family_name,
    };

    console.debug("CognitoAuth user details updated:", user);

    return user;
  }, [idToken, getIdToken]);

  if (userContext == null) {
    return <Spinner size="large" />;
  }

  return (
    <UserContext.Provider value={userContext}>{children}</UserContext.Provider>
  );
};

export default Auth;
