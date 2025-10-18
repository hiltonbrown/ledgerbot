"use client";

import { Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { memo, useEffect, useMemo, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import {
  OrganisationSelector,
  type XeroOrganisationSummary,
} from "@/components/xero/organisation-selector";
import { PlusIcon } from "./icons";
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

  const { width: windowWidth } = useWindowSize();
  const [isMounted, setIsMounted] = useState(false);
  const [organisations, setOrganisations] = useState<XeroOrganisationSummary[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    async function fetchOrganisations() {
      try {
        const search = chatId ? `?chatId=${encodeURIComponent(chatId)}` : "";
        const response = await fetch(`/api/xero/organisations${search}`);
        if (!response.ok) return;
        const data = await response.json();
        setOrganisations(data.organisations ?? []);
        setSelectedTenantId(data.selectedTenantId ?? undefined);
      } catch (error) {
        console.error("Failed to load Xero organisations", error);
      }
    }

    void fetchOrganisations();
  }, [chatId]);

  const handleOrganisationSelect = async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    try {
      await fetch("/api/xero/chat-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, tenantId }),
      });
    } catch (error) {
      console.error("Failed to update chat organisation context", error);
    }
  };

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

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

      {shouldShowNewChat && (
        <Button
          className="order-2 ml-auto h-8 px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          variant="outline"
        >
          <PlusIcon />
          <span className="md:sr-only">New Chat</span>
        </Button>
      )}

      <div className="flex flex-1 items-center justify-end gap-2 md:order-2 md:justify-center">
        {!isReadonly && (
          <VisibilitySelector
            chatId={chatId}
            className="order-1"
            selectedVisibilityType={selectedVisibilityType}
          />
        )}
        {organisations.length > 0 && (
          <OrganisationSelector
            organisations={organisations}
            selectedTenantId={selectedTenantId}
            onSelect={handleOrganisationSelect}
          />
        )}
      </div>

      <Button
        aria-label={themeToggleLabel}
        className="order-4 ml-auto h-8 w-8 md:h-9 md:w-9"
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
