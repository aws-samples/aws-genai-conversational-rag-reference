/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import Header from '@cloudscape-design/components/header';
import { Chat } from 'api-typescript-react-query-hooks';
import { useCallback, useRef } from 'react';
import DeleteChatButton from './components/DeleteChatButton';
import HumanInputForm from './components/HumanInputForm';
import { ConversationView } from './ConversationView';
import { useUpdateChatMutation } from '../../hooks/chats';
import InlineEditor from '../InlineEditor';

type SessionChatProps = {
  chat: Chat;
};

export default function ChatPanel(props: SessionChatProps) {
  const conversationRef = useRef<HTMLDivElement>(null);
  const updateChat = useUpdateChatMutation();

  const onMessageSuccess = useCallback(() => {
    // scroll to new message when created
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversationRef]);

  async function updateChatTitle(title: string) {
    await updateChat.mutateAsync({
      chatId: props.chat.chatId,
      updateChatRequestContent: {
        title,
      },
    });
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        flex: 1,
      }}
    >
      <Header variant="h3" actions={<DeleteChatButton chat={props.chat} />}>
        <InlineEditor loading={updateChat.isLoading} onChange={updateChatTitle}>
          {props.chat.title}
        </InlineEditor>
      </Header>

      {/* Dialog */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifySelf: 'stretch',
          alignSelf: 'stretch',
          overflow: 'hidden',
        }}
      >
        <ConversationView ref={conversationRef} chatId={props.chat.chatId} />
      </div>

      {/* Input  */}
      <div
        style={{
          flex: 0,
        }}
      >
        <HumanInputForm chat={props.chat} onSuccess={onMessageSuccess} />
      </div>
    </div>
  );
}
