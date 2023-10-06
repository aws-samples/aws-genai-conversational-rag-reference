/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Container } from "@cloudscape-design/components";
import { Chat } from "api-typescript-react-query-hooks";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import ChatPanel from "./ChatPanel";
import ChatsList from "./ChatsList";
import { ChatConfigSplitPanel } from "./dev-settings/ChatConfigSplitPanel";
import { useIsAdmin } from "../../Auth";

type SessionsProps = {
  chats: Chat[];
  loading: boolean;
};

export default function Sessions({ chats, loading }: SessionsProps) {
  const isAdmin = useIsAdmin();
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
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flex: 1,
          height: "calc(90vh - 300px)",
          minHeight: 500,
          gap: 20,
        }}
      >
        <div
          style={{
            width: 300,
            flex: "none",
            overflow: "scroll",
          }}
        >
          <ChatsList
            loading={loading}
            items={chats ?? []}
            selectedItem={selectedChat}
            onSelect={(chat) => setSelectedChat(chat)}
          />
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
          }}
        >
          {selectedChat && (
            <>
              <ChatPanel chat={selectedChat} />
              {isAdmin && <ChatConfigSplitPanel />}
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
