/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  ButtonDropdown,
  ButtonDropdownProps,
  Header,
  SplitPanelProps,
  StatusIndicator,
} from "@cloudscape-design/components";
import { CancelableEventHandler } from "@cloudscape-design/components/internal/events";
import { isEmpty } from "lodash";
import { FC, useCallback, useMemo } from "react";
import { ChatConfigForm } from "./ChatConfigForm";
import { useIsAdmin } from "../../../Auth";
import { ManagedSplitPanel } from "../../../providers/AppLayoutProvider/managed-content";
import { useChatEngineConfig } from "../../../providers/ChatEngineConfig";

export const ChatConfigSplitPanel: FC = () => {
  const isAdmin = useIsAdmin();
  const [config, , actions] = useChatEngineConfig();

  const onAction = useCallback<
    CancelableEventHandler<ButtonDropdownProps.ItemClickDetails>
  >(
    ({ detail }) => {
      switch (detail.id) {
        case "copy": {
          actions?.copy().catch(console.error);
          break;
        }
        case "paste": {
          actions?.paste().catch(console.error);
          break;
        }
        case "reset": {
          actions?.reset();
          break;
        }
        case "clear": {
          actions?.reset(true);
          break;
        }
      }
    },
    [actions]
  );

  const header = useMemo(
    () => (
      <Header
        variant="h2"
        actions={
          <ButtonDropdown
            variant="icon"
            ariaLabel="Settings Menu"
            onItemClick={onAction}
            items={[
              { id: "copy", text: "copy", iconName: "download" },
              { id: "paste", text: "paste", iconName: "upload" },
              { id: "reset", text: "reset", iconName: "refresh" },
              { id: "clear", text: "clear", iconName: "remove" },
            ]}
          />
        }
        counter={
          (config == null || isEmpty(config) ? (
            <StatusIndicator type="stopped" />
          ) : (
            <StatusIndicator type="success" />
          )) as any
        }
      >
        Dev Settings
      </Header>
    ),
    [config, actions]
  );

  const splitPanelProps = useMemo<SplitPanelProps | false>(
    () =>
      isAdmin && {
        header: header as any,
        children: <ChatConfigForm />,
        closeBehavior: "collapse",
        hidePreferencesButton: true,
      },
    [isAdmin, header]
  );

  if (!isAdmin || !splitPanelProps) {
    return null;
  }

  return <ManagedSplitPanel uuid="chat/dev-settings" {...splitPanelProps} />;
};
