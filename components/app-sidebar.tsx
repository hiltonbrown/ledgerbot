"use client";

import {
  BookOpen,
  Bot,
  FileText,
  Home,
  LifeBuoy,
  Lightbulb,
  MessageSquare,
  Send,
  Settings2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlusIcon } from "@/components/icons";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import { SidebarHistory } from "@/components/sidebar-history";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { AuthUser } from "@/lib/types/auth";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type SidebarXeroConnection = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  isActive: boolean;
};

export function AppSidebar({
  user,
  xeroConnections,
}: {
  user: AuthUser | null;
  xeroConnections?: SidebarXeroConnection[];
}) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const [isSwitching, setIsSwitching] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");

  const activeConnection =
    xeroConnections?.find((connection) => connection.isActive) ?? null;

  useEffect(() => {
    if (!activeConnection) {
      setSelectedConnectionId("");
      return;
    }

    setSelectedConnectionId(activeConnection.id);
  }, [activeConnection]);

  const handleSidebarCompanySelect = async (value: string) => {
    if (value === "add-new") {
      setOpenMobile(false);
      router.push("/settings/integrations");
      return;
    }

    if (!value || value === selectedConnectionId) {
      return;
    }

    setSelectedConnectionId(value);
    setIsSwitching(true);

    try {
      const response = await fetch("/api/xero/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ connectionId: value }),
      });

      if (!response.ok) {
        throw new Error("Failed to switch Xero company");
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to switch Xero company from sidebar:", error);
      setSelectedConnectionId(activeConnection?.id ?? "");
    } finally {
      setIsSwitching(false);
    }
  };

  const hasConnections = (xeroConnections?.length ?? 0) > 0;
  const selectValue =
    selectedConnectionId === "" ? undefined : selectedConnectionId;

  const navMain = [
    {
      title: "Chat",
      url: "/",
      icon: MessageSquare,
      isActive: true,
    },
    {
      title: "Agents",
      url: "/agents",
      icon: Bot,
      items: [
        {
          title: "Document Processing",
          url: "/agents/docmanagement",
        },
        {
          title: "Reconciliations",
          url: "/agents/reconciliations",
        },
        {
          title: "Compliance",
          url: "/agents/compliance",
        },
        {
          title: "Analytics",
          url: "/agents/analytics",
        },
        {
          title: "Forecasting",
          url: "/agents/forecasting",
        },
        {
          title: "Q&A",
          url: "/agents/qanda",
        },
        {
          title: "Accounts Payable",
          url: "/agents/ap",
        },
        {
          title: "Accounts Receivable",
          url: "/agents/ar",
        },
        {
          title: "Workflow",
          url: "/agents/workflow",
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      items: [
        {
          title: "Personalisation",
          url: "/settings/personalisation",
        },
        {
          title: "Integrations",
          url: "/settings/integrations",
        },
        {
          title: "Files",
          url: "/settings/files",
        },
        {
          title: "Usage",
          url: "/settings/usage",
        },
      ],
    },
  ];

  const navSecondary = [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ];

  return (
    <Sidebar className="group-data-[side=left]:border-r-0" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link
                href="/"
                onClick={() => {
                  setOpenMobile(false);
                }}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Lightbulb className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">intellisync</span>
                  <span className="truncate text-xs">
                    {activeConnection?.tenantName || "Accounting"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {hasConnections && (
            <SidebarMenuItem className="mt-2">
              <Select
                disabled={isSwitching}
                onValueChange={handleSidebarCompanySelect}
                value={selectValue}
              >
                <SelectTrigger
                  aria-label="Active Xero organisation"
                  className="h-9 w-full border border-border/40 bg-muted/40 px-2 text-left font-medium text-sm shadow-none focus:ring-0 data-[disabled]:cursor-default data-[disabled]:opacity-100"
                >
                  <SelectValue placeholder="Select Xero organisation" />
                </SelectTrigger>
                <SelectContent>
                  {xeroConnections?.map((connection) => (
                    <SelectItem key={connection.id} value={connection.id}>
                      {connection.tenantName || "Unnamed organisation"}
                      {connection.isActive && " (Active)"}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="add-new">Add new...</SelectItem>
                </SelectContent>
              </Select>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <SidebarHistory user={user} />
        <NavSecondary className="mt-auto" items={navSecondary} />
      </SidebarContent>
      <SidebarFooter>{user && <NavUser />}</SidebarFooter>
    </Sidebar>
  );
}
