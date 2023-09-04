import { CreateChatRequest } from "api-typescript-react-query-hooks";

export function useCreateChat() {
  return {
    mutateAsync: () => {},
  };
}

export function useCreateChatMessage() {
  return {
    mutateAsync: () => {},
  };
}

export function useUpdateChat() {
  return {
    mutateAsync: () => {},
  };
}

export function useListChatMessages() {
  return {
    data: [],
  };
}
