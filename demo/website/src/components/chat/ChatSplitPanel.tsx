/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
// @ts-nocheck
import { Container } from "@cloudscape-design/components";
import { Chat } from "api-typescript-react-query-hooks";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import ChatPanel from "./ChatPanel";
import ChatsList from "./ChatsList";
import SplitPanel from "../layout/SplitPanel";

type SessionsProps = {
  chats: Chat[];
  loading: boolean;
};

export default function Sessions({ chats, loading }: SessionsProps) {
  const navigate = useNavigate();

  const setSelectedChat = (chat: Chat) =>
    navigate(`/chat/${chat.chatId}`, { replace: true });

  const { id: chatId } = useParams();
  const selectedChat = chats.find((chat) => chat.chatId === chatId)!;

  if (!chatId && chats !== undefined && chats.length > 0) {
    return <Navigate to={`/chat/${chats[0].chatId}`} />;
  }

  return (
    <Container>
      <SplitPanel
        panel={
          <ChatsList
            loading={loading}
            items={chats ?? []}
            selectedItem={selectedChat}
            onSelect={(chat) => setSelectedChat(chat)}
          />
        }
        panelWidth="350px"
        margin="10px"
        style={{
          minHeight: "700px",
          width: "100%",
        }}
      >
        {selectedChat && <ChatPanel chat={selectedChat} />}
      </SplitPanel>
    </Container>
  );
}
