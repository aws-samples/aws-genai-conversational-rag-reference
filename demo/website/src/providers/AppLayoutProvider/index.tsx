/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { FC, PropsWithChildren } from "react";
import { SplitPanelProvider, HelpPanelProvider } from "./managed-content";

export const AppLayoutProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <SplitPanelProvider>
      <HelpPanelProvider>{children}</HelpPanelProvider>
    </SplitPanelProvider>
  );
};
