"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { memo } from "react";
import type { VisibilityType } from "@/lib/chat/visibility";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "./elements/suggestion";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
  suggestions?: Array<{
    id: string;
    text: string;
    enabled: boolean;
    order: number;
  }>;
};

function PureSuggestedActions({
  chatId,
  sendMessage,
  suggestions,
}: SuggestedActionsProps) {
  const defaultSuggestions = [
    {
      id: "default-1",
      text: "",
    },
    {
      id: "default-2",
      text: "",
    },
    {
      id: "default-3",
      text: "",
    },
    {
      id: "default-4",
      text: "",
    },
  ];

  // Use user suggestions if provided, otherwise use defaults
  const suggestedActions = suggestions
    ? suggestions.filter((s) => s.enabled).sort((a, b) => a.order - b.order)
    : defaultSuggestions;

  return (
    <div
      className="grid w-full gap-2 sm:grid-cols-2"
      data-testid="suggested-actions"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 0 }}
          key={suggestedAction.id}
          transition={{ delay: 0.05 * index }}
        >
          <Suggestion
            className="h-auto w-full whitespace-normal p-3 text-left"
            onClick={(suggestion) => {
              window.history.replaceState({}, "", `/chat/${chatId}`);
              sendMessage({
                role: "user",
                parts: [{ type: "text", text: suggestion }],
              });
            }}
            suggestion={suggestedAction.text}
          >
            {suggestedAction.text}
          </Suggestion>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }

    return true;
  }
);
