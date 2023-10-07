/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  InfiniteData,
  QueryFunction,
  UseQueryResult,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ListChatMessagesResponseContent,
  ListChatsResponseContent,
  useCreateChatMessage,
  useUpdateChat,
  useCreateChat,
  useListChats as useOriginalListChats,
  CreateChatResponseContent,
  useDeleteChat,
  useDeleteChatMessage,
  useListChatMessageSources,
  ListChatMessageSourcesResponseContent,
  ChatMessageSource,
  DefaultApiClientContext,
  ChatMessage,
  ListChatMessagesRequest,
} from "api-typescript-react-query-hooks";
import produce from "immer";
import { last } from "lodash";
import { useCallback, useContext } from "react";

type ListChatMessagesData = InfiniteData<FetchMessagesResponse>;

export const CHAT_MESSAGE_PARAMS: Partial<ListChatMessagesRequest> = {
  ascending: true,
  reverse: false,
  pageSize: 10,
};

export const queryKeyGenerators = {
  listChats: () => ["listChats"],
  getAllDataForChat: (chatId: string) => ["chat", chatId],
  listChatMessages: (chatId: string) => [
    "listChatMessages",
    { ...CHAT_MESSAGE_PARAMS, chatId },
  ],
  // TODO refactor out all prebuilt hooks to imporve query keys
  listChatMessageSources: (chatId: string, messageId: string) => [
    "listChatMessageSources",
    { chatId, messageId },
  ],
};

export function useListChats(): ReturnType<typeof useOriginalListChats> {
  return useOriginalListChats({
    select: (
      chatsResponse: ListChatsResponseContent
    ): ListChatsResponseContent => {
      return produce(chatsResponse, (chats) => {
        chats.chats?.sort(
          (a, b) =>
            (b.createdAt ?? Number.POSITIVE_INFINITY) -
            (a.createdAt ?? Number.NEGATIVE_INFINITY)
        );
        return chats;
      });
    },
  });
}

export function useCreateChatMutation(
  onCreate?: (response: CreateChatResponseContent) => void
): ReturnType<typeof useCreateChat> {
  const queryClient = useQueryClient();

  const listChatsQueryKey = queryKeyGenerators.listChats();

  const createChat = useCreateChat({
    onSuccess: (response) => {
      queryClient.setQueryData(
        listChatsQueryKey,
        (old: ListChatsResponseContent | undefined) => {
          return {
            ...old,
            chats: [response, ...(old?.chats ?? [])],
          };
        }
      );

      // Since we just created the chat, there will be no messages so don't do a fetch
      const listChatMessagesQueryKey = queryKeyGenerators.listChatMessages(
        response.chatId
      );

      queryClient.setQueryData(
        listChatMessagesQueryKey,
        (_old: ListChatMessagesData | undefined): ListChatMessagesData => {
          return {
            pages: [{ data: [], nextCursor: undefined }],
            pageParams: [null],
          };
        }
      );

      if (onCreate) {
        onCreate(response);
      }
    },
  });
  return createChat;
}

type ListChatMessagesDataPage = ListChatMessagesData["pages"][number];
type ListChatMessagePage =
  | ListChatMessagesDataPage
  | ListChatMessagesResponseContent;

export function useCreateChatMessageMutation(
  chatId: string,
  onSuccess?: () => void
): ReturnType<typeof useCreateChatMessage> {
  const queryClient = useQueryClient();

  const listChatMessagesQueryKey = queryKeyGenerators.listChatMessages(chatId);

  const createChatMessage = useCreateChatMessage({
    onSuccess: (questionResponse, _vars) => {
      const { question, answer, sources } = questionResponse;

      // add both the question and answer to the list of chats in the
      // listChatMessages query cache
      queryClient.setQueryData(
        listChatMessagesQueryKey,
        (old: ListChatMessagesData | undefined) => {
          return produce(old, (draft) => {
            if (question && answer) {
              const lastPage: ListChatMessagePage | undefined = last(
                draft?.pages || []
              ) as any;

              if (lastPage) {
                // empty chat (new) page contains "data" while non-empty container "chatMessages"
                const chatMessages =
                  ("data" in lastPage && lastPage.data) ||
                  ("chatMessages" in lastPage && lastPage.chatMessages) ||
                  undefined;

                if (chatMessages == null) {
                  // unable to inject new chat messages, just reset to resolve
                  console.warn(
                    "Failed to inject new chat turn into query cache"
                  );
                  queryClient
                    .resetQueries({
                      queryKey: [listChatMessagesQueryKey],
                    })
                    .catch(console.error);
                } else {
                  chatMessages.push(question, answer);
                }
              } else {
                // this is the first message
                return {
                  pages: [
                    {
                      data: [question, answer],
                      nextCursor: undefined,
                    },
                  ],
                  pageParams: [null],
                } as ListChatMessagesData;
              }

              onSuccess && onSuccess();
            }
            return draft;
          });
        }
      );

      // add the sources for the answer to the listChatMessageSources query cache
      const listChatMessageSourcesQueryKey =
        queryKeyGenerators.listChatMessageSources(chatId, answer.messageId);
      queryClient.setQueryData(
        listChatMessageSourcesQueryKey,
        (): ListChatMessageSourcesResponseContent => {
          return {
            chatMessageSources: sources,
          };
        }
      );
    },
    mutationKey: ["createChatMessage", chatId],
  });

  return createChatMessage;
}

export function useUpdateChatMutation(): ReturnType<typeof useUpdateChat> {
  const queryClient = useQueryClient();

  const listChatsQueryKey = queryKeyGenerators.listChats();

  const updateChat = useUpdateChat({
    onMutate: async (newChat) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: listChatsQueryKey });

      // Snapshot the previous value
      const previousListChat = queryClient.getQueryData(
        listChatsQueryKey
      ) as ListChatsResponseContent;

      const newListChats = produce(previousListChat, (listChatDraft) => {
        const chats = listChatDraft.chats || [];
        chats.map((chat) => {
          if (chat.chatId === newChat.chatId) {
            chat.title = newChat.updateChatRequestContent.title;
          }
          return chat;
        });
        listChatDraft.chats = chats;
      });

      // Optimistically update to the new value
      queryClient.setQueryData(listChatsQueryKey, newListChats);

      // Return a context object with the snapshotted value
      return { previousListChat };
    },
    // If the mutation fails,
    // use the context returned from onMutate to roll back
    onError: (_err, _newChat, context) => {
      queryClient.setQueryData(
        listChatsQueryKey,
        (context as { previousListChat: ListChatsResponseContent })
          .previousListChat
      );
    },
  });

  return updateChat;
}

export function useDeleteChatMutation(
  onSuccess: () => void
): ReturnType<typeof useDeleteChat> {
  const queryClient = useQueryClient();

  const listChatsQueryKey = queryKeyGenerators.listChats();

  const deleteMutation = useDeleteChat({
    onSuccess(_data, variables, _context) {
      if (onSuccess) {
        onSuccess();
      }

      // delete the chat out of the chat list
      queryClient.setQueryData<ListChatsResponseContent>(
        listChatsQueryKey,
        (previousChatsList) => {
          if (previousChatsList) {
            return produce(previousChatsList, (listChatDraft) => {
              const chats = listChatDraft.chats || [];
              listChatDraft.chats = chats.filter(
                (chat) => chat.chatId !== variables.chatId
              );
              return listChatDraft;
            });
          } else {
            return {
              chats: [],
            };
          }
        }
      );

      // Now remove the chat messages and message sources for that chat
      const allChatData = queryKeyGenerators.getAllDataForChat(
        variables.chatId
      );

      queryClient.removeQueries(allChatData);
    },
  });

  return deleteMutation;
}

export function useDeleteChatMessageMutation(
  onSuccess: () => void
): ReturnType<typeof useDeleteChatMessage> {
  const queryClient = useQueryClient();

  const deleteMutation = useDeleteChatMessage({
    onSuccess(_data, variables, _context) {
      if (onSuccess) {
        onSuccess();
      }

      const listChatMessagesQueryKey = queryKeyGenerators.listChatMessages(
        variables.chatId
      );

      queryClient.setQueryData<ListChatMessagesData>(
        listChatMessagesQueryKey,
        (old) =>
          produce(old, (listChatMessagesDraft) => {
            if (listChatMessagesDraft && listChatMessagesDraft.pages) {
              for (let page of listChatMessagesDraft.pages) {
                page.data = page.data.filter(
                  (message) => message.messageId !== variables.messageId
                );
              }
            } else if (old && "chatMessages" in old) {
              const filtered = (old.chatMessages as ChatMessage[]).filter(
                (v) => v.messageId !== _data.messageId
              ) as any;
              return {
                chatMessages: filtered,
              } as any;
            }

            return listChatMessagesDraft;
          })
      );
    },
  });

  return deleteMutation;
}

export function useMessageSources(
  chatId: string,
  messageId: string
): UseQueryResult<ChatMessageSource[]> {
  // @ts-expect-error
  return useListChatMessageSources(
    { chatId, messageId },
    {
      select: (data) => {
        if (data.pages && data.pages.length > 0) {
          return data.pages.flatMap((page) => page.chatMessageSources);
        }
        // @ts-ignore
        return data.chatMessageSources || ([] as ChatMessageSource[]);
      },
    }
  );
}

type FetchMessagesResponse = {
  data: ChatMessage[];
  nextCursor: string | undefined;
};
export function useInfiniteChatMessages(
  chatId: string,
  pageSize: number = 100
) {
  const key = queryKeyGenerators.listChatMessages(chatId);

  const api = useContext(DefaultApiClientContext);
  const fetchMessages: QueryFunction<FetchMessagesResponse> = useCallback(
    async ({ pageParam }) => {
      const result = await api.listChatMessages({
        chatId,
        nextToken: pageParam,
        pageSize: pageSize,
        reverse: true,
        ascending: true,
      });
      return {
        data: result.chatMessages || [],
        nextCursor: result.nextToken,
      };
    },
    [api]
  );

  return useInfiniteQuery(key, {
    queryFn: fetchMessages,
    retry() {
      return false;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

// TODO remove once we change over completely to infinite scrolling
export function useListChatMessages(chatId: string) {
  const api = useContext(DefaultApiClientContext);
  const key = queryKeyGenerators.listChatMessages(chatId);
  async function queryFn(): Promise<ListChatMessagesResponseContent> {
    // We want messages in reverse order, since results are descending order
    return api.listChatMessages({ chatId, reverse: true });
  }
  return useQuery(key, {
    queryFn,
  });
}
