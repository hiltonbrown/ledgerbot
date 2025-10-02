"use client";

import { Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { memo, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { useWindowSize } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlusIcon } from "./icons";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { toast } from "./toast";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const { resolvedTheme, setTheme } = useTheme();
  const { mutate } = useSWRConfig();

  const { width: windowWidth } = useWindowSize();
  const [isMounted, setIsMounted] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const shouldShowNewChat = !open || windowWidth < 768;

  const themeToggleLabel = isMounted
    ? resolvedTheme === "dark"
      ? "Switch to light mode"
      : "Switch to dark mode"
    : "Toggle theme";
  const themeToggleIcon = useMemo(() => {
    if (!isMounted) {
      return <Moon className="size-4" />;
    }

    return resolvedTheme === "dark" ? (
      <Sun className="size-4" />
    ) : (
      <Moon className="size-4" />
    );
  }, [isMounted, resolvedTheme]);

  const handleThemeToggle = () => {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  const handleCreateConversation = async () => {
    if (isCreatingConversation) {
      return;
    }

    setIsCreatingConversation(true);

    try {
      const payload: { visibility: VisibilityType } = {
        visibility: "private",
      };

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        toast({
          type: "error",
          description:
            errorBody?.message ??
            "Failed to start a new conversation. Please try again.",
        });
        return;
      }

      const { id: nextChatId } = (await response.json()) as { id: string };

      mutate(unstable_serialize(getChatHistoryPaginationKey));
      router.push(`/chat/${nextChatId}`);
    } catch (error) {
      console.error("Error creating conversation", error);
      toast({
        type: "error",
        description: "Failed to start a new conversation. Please try again.",
      });
    } finally {
      setIsCreatingConversation(false);
    }
  };

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

      {shouldShowNewChat && (
        <Button
          className="order-2 ml-auto h-8 px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
          disabled={isCreatingConversation}
          onClick={handleCreateConversation}
          variant="outline"
        >
          <PlusIcon />
          <span className="md:sr-only">New Chat</span>
        </Button>
      )}

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          className="order-1 md:order-2"
          selectedVisibilityType={selectedVisibilityType}
        />
      )}

      <Button
        aria-label={themeToggleLabel}
        className={cn(
          "order-4 h-8 w-8 md:h-9 md:w-9",
          shouldShowNewChat ? "ml-1" : "ml-auto"
        )}
        disabled={!isMounted}
        onClick={handleThemeToggle}
        size="icon"
        variant="ghost"
      >
        {themeToggleIcon}
        <span className="sr-only">{themeToggleLabel}</span>
      </Button>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
