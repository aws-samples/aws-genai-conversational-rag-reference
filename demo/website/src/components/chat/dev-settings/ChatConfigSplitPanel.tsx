/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { ButtonDropdown, ButtonDropdownProps, Header, StatusIndicator } from '@cloudscape-design/components';
import { CancelableEventHandler } from '@cloudscape-design/components/internal/events';
import { isEmpty } from 'lodash';
import { FC, useCallback, useMemo } from 'react';
import { ChatConfigForm } from './ChatConfigForm';
import { ManagedSplitPanel } from '../../../providers/AppLayoutProvider/managed-content';
import { useChatEngineConfig } from '../../../providers/ChatEngineConfig';

export const ChatConfigSplitPanel: FC = () => {
  const [config, , actions] = useChatEngineConfig();

  const onAction = useCallback<CancelableEventHandler<ButtonDropdownProps.ItemClickDetails>>(
    ({ detail }) => {
      switch (detail.id) {
        case 'copy': {
          actions?.copy().catch(console.error);
          break;
        }
        case 'paste': {
          actions?.paste().catch(console.error);
          break;
        }
        case 'reset': {
          actions?.reset();
          break;
        }
      }
    },
    [actions],
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
              { id: 'copy', text: 'copy', iconName: 'download' },
              { id: 'paste', text: 'paste', iconName: 'upload' },
              { id: 'reset', text: 'reset', iconName: 'refresh' },
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
        Chat Settings
      </Header>
    ),
    [config, actions],
  );

  return (
    <ManagedSplitPanel uuid="chat/dev-settings" header={header as any} closeBehavior="collapse" hidePreferencesButton>
      <ChatConfigForm />
    </ManagedSplitPanel>
  );
};
