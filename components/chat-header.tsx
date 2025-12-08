"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { useWindowSize } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlusIcon } from "./icons";
import { useSidebar } from "./ui/sidebar";

function PureChatHeader({
  chatId: _chatId,
  isReadonly: _isReadonly,
}: {
  chatId: string;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const { width: windowWidth } = useWindowSize();

  const shouldShowNewChat = !open || windowWidth < 768;

  const agentsItems = [
    { title: "Overview", url: "/agents" },
    { title: "Document Processing", url: "/agents/docmanagement" },
    { title: "Analytics", url: "/agents/analytics" },
    { title: "Forecasting", url: "/agents/forecasting" },
    { title: "Accounts Payable", url: "/agents/ap" },
    { title: "Accounts Receivable", url: "/agents/ar" },
    { title: "Data Validation", url: "/agents/datavalidation" },
    { title: "Q&A", url: "/agents/qanda" },
    { title: "Workflow", url: "/agents/workflow" },
  ];

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

      <div className="order-1 md:order-2">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button className="h-8 px-2 md:h-fit md:px-2" variant="outline">
                  Agents
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Agents</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            {agentsItems.map((item) => (
              <DropdownMenuItem asChild key={item.title}>
                <a href={item.url}>{item.title}</a>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="order-3 ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
