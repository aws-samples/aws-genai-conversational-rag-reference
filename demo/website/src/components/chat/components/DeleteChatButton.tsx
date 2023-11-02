/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Alert, Modal } from '@cloudscape-design/components';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { Chat } from 'api-typescript-react-query-hooks';
import { useState } from 'react';
import { useDeleteChatMutation } from '../../../hooks/chats';

export default function DeleteChatButton(props: { chat: Chat }) {
  const [visible, setVisible] = useState(false);

  const deleteChat = useDeleteChatMutation(() => {
    setVisible(false);
  });

  return (
    <>
      <Button variant="inline-icon" iconName="remove" onClick={() => setVisible(true)} />

      <Modal
        onDismiss={() => setVisible(false)}
        visible={visible}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setVisible(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={deleteChat.isLoading}
                disabled={deleteChat.isError}
                onClick={() => {
                  deleteChat.mutateAsync({ chatId: props.chat.chatId }).catch(console.error);
                }}
              >
                Ok
              </Button>
            </SpaceBetween>
          </Box>
        }
        header="Confirm chat delete"
      >
        {(deleteChat.error as any) && (
          <Alert type="error" header="Failed to delete chat">
            {(deleteChat.error as any).message || deleteChat.error}
          </Alert>
        )}
        <p>
          Are you sure you want to delete the chat?
          <br />
          This operation will delete all of the chat history and can not be reversed.
        </p>
      </Modal>
    </>
  );
}
