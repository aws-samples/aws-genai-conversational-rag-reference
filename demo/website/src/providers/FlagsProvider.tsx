/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { FC, createContext, useContext, useMemo } from "react";
import { useRuntimeConfig } from "../Auth";

export interface IFeatureFlags {}

export const FlagContext = createContext<IFeatureFlags>({});

export const useFeatureFlags = () => {
  const context = useContext(FlagContext);
  if (context == null) {
    throw new Error("useFeatureFlag can only be used within a FlagsProvider");
  }
  return context;
};

export const useFeatureFlag = (flag: keyof IFeatureFlags): boolean => {
  const flags = useFeatureFlags();
  return flags[flag] === true;
};

export const FlagsProvider: FC<React.PropsWithChildren> = ({ children }) => {
  const { flags } = useRuntimeConfig();

  const value = useMemo<IFeatureFlags>(() => {
    return flags || {};
  }, [flags]);

  return <FlagContext.Provider value={value}>{children}</FlagContext.Provider>;
};
