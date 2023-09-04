/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import useSigv4Client from "@aws-northstar/ui/components/CognitoAuth/hooks/useSigv4Client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  Configuration,
  ConfigurationParameters,
  DefaultApi,
  DefaultApiClientProvider,
} from "api-typescript-react-query-hooks";
import { FC, useCallback, useMemo } from "react";
import { matchPath } from "react-router-dom";
import { useGetIdToken, useRuntimeConfig } from "../Auth";

export const useApiClient = () => {
  const runtimeConfig = useRuntimeConfig();
  const getIdToken = useGetIdToken();

  const executeApiClient = useSigv4Client();
  const lambdaClient = useSigv4Client("lambda");

  // FetchApi router
  // TODO: add lambda fallback to apig
  const fetchApi = useCallback<Required<ConfigurationParameters>["fetchApi"]>(
    async (input, init) => {
      if (["PUT"].includes(init?.method || "Unknown")) {
        let url: string;
        if (input instanceof URL) {
          url = input.href;
        } else if (input instanceof Request) {
          url = input.url;
        } else {
          url = input;
        }
        url = url.replace(runtimeConfig.apiUrl, "");
        const _matchPath = matchPath;
        console.log(_matchPath);

        let match = matchPath("/chat/:chatId/message", url);
        if (match) {
          const idToken = await getIdToken();
          if (init && idToken) {
            if (init.headers == null) {
              init.headers = {
                "X-Cognito-IdToken": idToken,
              };
            } else if (
              init.headers instanceof Headers ||
              init.headers instanceof Map
            ) {
              init.headers.set("X-Cognito-IdToken", idToken);
            } else if (Array.isArray(init.headers)) {
              init.headers.push(["X-Cognito-IdToken", idToken]);
            } else if (typeof init.headers === "object") {
              init.headers["X-Cognito-IdToken"] = idToken;
            }
          }

          // Lambda FunctionURL does not support `pathParameters` so we need to use queryParameters
          return lambdaClient(
            `${runtimeConfig.inferenceBufferedFunctionUrl}${match.pathname}?chatId=${match.params.chatId}`,
            init
          );
        }
      }

      return executeApiClient(input, init);
    },
    [
      getIdToken,
      executeApiClient,
      lambdaClient,
      runtimeConfig.inferenceBufferedFunctionUrl,
      runtimeConfig.apiUrl,
    ]
  );

  return useMemo(
    () =>
      new DefaultApi(
        new Configuration({
          basePath: runtimeConfig.apiUrl,
          fetchApi,
        })
      ),
    [fetchApi, getIdToken]
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: false,
      refetchInterval: Infinity,
      staleTime: Infinity,
      cacheTime: Infinity,
    },
  },
});

export const ApiProvider: FC<React.PropsWithChildren> = ({ children }) => {
  const apiClient = useApiClient();

  return (
    <QueryClientProvider client={queryClient}>
      <DefaultApiClientProvider apiClient={apiClient} client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </DefaultApiClientProvider>
    </QueryClientProvider>
  );
};
