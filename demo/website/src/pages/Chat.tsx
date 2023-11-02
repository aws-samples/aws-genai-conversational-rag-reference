/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import { useListChats } from 'api-typescript-react-query-hooks';
import ChatSplitPanel from '../components/chat/ChatSplitPanel';

const Chat: React.FC = () => {
  const chatHook = useListChats({});
  const chats = chatHook.data?.chats ?? [];

  return (
    <ContentLayout
      header={
        <Header variant="h1" info={<Link>Info</Link>} description="Content creation chats">
          Chat
        </Header>
      }
    >
      <ChatSplitPanel chats={chats} loading={chatHook.isLoading} />
    </ContentLayout>
  );
};

export default Chat;
