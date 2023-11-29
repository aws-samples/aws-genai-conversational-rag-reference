/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Alert, Modal } from '@cloudscape-design/components';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { Chat } from 'api-typescript-react-query-hooks';
import { useCallback, useState } from 'react';
import { useDeleteChatMutation } from '../../../hooks/chats';

export default function DeleteChatButton(props: { chat: Chat }) {
  const [visible, setVisible] = useState(false);

  const deleteChat = useDeleteChatMutation(() => {
    setVisible(false);
  });

  const open = useCallback(() => {
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    deleteChat.reset();
  }, [deleteChat]);

  return (
    <>
      <Button variant="inline-icon" iconName="remove" onClick={open} />

      <Modal
        onDismiss={close}
        visible={visible}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={close}>
                Cancel
              </Button>
              {deleteChat.isError ? (
                <Button variant="normal" onClick={() => deleteChat.mutate({ chatId: props.chat.chatId })}>
                  Retry
                </Button>
              ) : (
                <Button
                  variant="primary"
                  loading={deleteChat.isLoading}
                  disabled={deleteChat.isError}
                  onClick={() => {
                    deleteChat.mutate({ chatId: props.chat.chatId });
                  }}
                >
                  Delete
                </Button>
              )}
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
