/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { useAppLayoutContext } from "@aws-northstar/ui/components/AppLayout";
import { FC, useEffect } from "react";
import { useMatch } from "react-router-dom";
import { ChatConfigForm } from "./ChatConfigForm";
import { useIsAdmin } from "../../Auth";

export const ChatConfigSplitPanel: FC<{}> = () => {
  const { setSplitPanelProps } = useAppLayoutContext();
  const isAdmin = useIsAdmin();
  const isChatRoute = useMatch("/chat/*");

  useEffect(() => {
    if (isAdmin) {
      const content = <ChatConfigForm />;

      setSplitPanelProps({
        header: "Chat Config",
        children: content,
        closeBehavior: "collapse",
        hidePreferencesButton: true,
      });
    }

    return () => {
      setSplitPanelProps(undefined);
    };
  }, [setSplitPanelProps, isAdmin, isChatRoute]);

  return null;
};
