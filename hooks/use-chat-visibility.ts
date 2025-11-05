"use client";

import { useCallback, useEffect, useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { updateChatVisibility } from "@/app/(chat)/actions";
import {
  type ChatHistory,
  getChatHistoryPaginationKey,
} from "@/components/sidebar-history";
import {
  DEFAULT_CHAT_VISIBILITY,
  sanitizeVisibility,
  type VisibilityType,
} from "@/lib/chat/visibility";

export function useChatVisibility({
  chatId,
  initialVisibilityType,
}: {
  chatId: string;
  initialVisibilityType: VisibilityType;
}) {
  const { mutate, cache } = useSWRConfig();
  const history: ChatHistory = cache.get("/api/history")?.data;

  const sanitizedInitialVisibility = useMemo(
    () => sanitizeVisibility(initialVisibilityType),
    [initialVisibilityType]
  );

  const { data: localVisibility, mutate: setLocalVisibility } = useSWR(
    `${chatId}-visibility`,
    null,
    {
      fallbackData: sanitizedInitialVisibility,
    }
  );

  const historyVisibility = useMemo(() => {
    if (!history) {
      return;
    }

    const chat = history.chats.find((currentChat) => currentChat.id === chatId);

    return chat?.visibility;
  }, [history, chatId]);

  const visibilityType = useMemo(() => {
    const sourceVisibility = historyVisibility ?? localVisibility;

    if (!sourceVisibility) {
      return DEFAULT_CHAT_VISIBILITY;
    }

    return sanitizeVisibility(sourceVisibility);
  }, [historyVisibility, localVisibility]);

  const setVisibilityType = useCallback(
    (updatedVisibilityType: VisibilityType) => {
      const sanitizedVisibility = sanitizeVisibility(updatedVisibilityType);

      setLocalVisibility(sanitizedVisibility);
      mutate(unstable_serialize(getChatHistoryPaginationKey));

      updateChatVisibility({
        chatId,
        visibility: sanitizedVisibility,
      });
    },
    [chatId, mutate, setLocalVisibility]
  );

  useEffect(() => {
    if (historyVisibility === "public") {
      setVisibilityType(DEFAULT_CHAT_VISIBILITY);
    }
  }, [historyVisibility, setVisibilityType]);

  return { visibilityType, setVisibilityType };
}
