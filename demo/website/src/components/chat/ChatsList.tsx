/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { useCollection } from "@cloudscape-design/collection-hooks";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Cards from "@cloudscape-design/components/cards";
import Header from "@cloudscape-design/components/header";
import Pagination from "@cloudscape-design/components/pagination";
import TextFilter from "@cloudscape-design/components/text-filter";
import { Chat } from "api-typescript-react-query-hooks/lib/models/Chat";
import { useCreateChatMutation } from "../../hooks/chats";
import EmptyState from "../Empty";
import { getMatchesCountText } from "../table-config";

type ChatCardsProps = {
  items: Chat[];
  selectedItem: Chat | undefined;
  onSelect: (chat: Chat) => void;
  loading: boolean;
};

const definitions = [
  {
    id: "createdAt",
    content: (item: Chat) =>
      item.createdAt && new Date(item.createdAt).toLocaleString(),
  },
];

function ChatCards({
  items: allChats,
  selectedItem,
  onSelect,
  loading,
}: ChatCardsProps) {
  const preferences = {
    pageSize: 4,
    visibleContent: ["title", "createdAt"] as readonly string[],
  };

  const {
    items,
    actions,
    filteredItemsCount,
    collectionProps,
    filterProps,
    paginationProps,
  } = useCollection(allChats, {
    filtering: {
      empty: (
        <EmptyState
          title="No chats"
          subtitle="No chats to display."
          action={<Button>Create chat</Button>}
        />
      ),
      noMatch: (
        <EmptyState
          title="No matches"
          subtitle="We can’t find a match."
          action={
            <Button onClick={() => actions.setFiltering("")}>
              Clear filter
            </Button>
          }
        />
      ),
    },
    pagination: { pageSize: preferences.pageSize },
    sorting: {},
    selection: {},
  });

  const createChat = useCreateChatMutation((response) => {
    onSelect(response);
  });

  async function createNewChat() {
    await createChat.mutateAsync({
      createChatRequestContent: {
        title: "New Chat - " + new Date().toLocaleString(),
      },
    });
  }

  return (
    <Cards
      {...collectionProps}
      onSelectionChange={({ detail }) => {
        onSelect(detail.selectedItems[0]);
      }}
      stickyHeader
      loading={loading}
      selectedItems={selectedItem ? [selectedItem] : []}
      selectionType="single"
      ariaLabels={{
        itemSelectionLabel: (_e, n) => `select ${n.title}`,
        selectionGroupLabel: "Chat selection",
      }}
      cardDefinition={{
        header: (item) => (
          <span style={{ fontSize: "13pt" }}>{item.title}</span>
        ),
        sections: definitions,
      }}
      cardsPerRow={[{ cards: 1 }, { minWidth: 300, cards: 1 }]}
      items={items}
      loadingText="Loading chats"
      empty={
        <Box textAlign="center" color="inherit">
          <b>No chats</b>
          <Box padding={{ bottom: "s" }} variant="p" color="inherit">
            No chats to display.
          </Box>
        </Box>
      }
      header={
        <Header
          actions={
            <Button
              variant="primary"
              iconName="add-plus"
              onClick={createNewChat}
              loading={loading || createChat.isLoading}
            >
              Create Chat
            </Button>
          }
        >
          Chats
        </Header>
      }
      pagination={<Pagination {...paginationProps} />}
      filter={
        <TextFilter
          {...filterProps}
          countText={getMatchesCountText(filteredItemsCount || 0)}
          filteringAriaLabel="Filter chats"
        />
      }
    />
  );
}

export default ChatCards;
