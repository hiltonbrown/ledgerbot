"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Home, Moon, Settings2, Sun, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { PlusIcon } from "@/components/icons";
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
  const { setTheme, resolvedTheme } = useTheme();
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
  const selectValue = selectedConnectionId === "" ? undefined : selectedConnectionId;

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row items-center justify-between">
            <Link
              className="flex flex-row items-center gap-3"
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
            >
              <span className="cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted">
                intellisync
              </span>
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="h-8 p-1 md:h-fit md:p-2"
                  onClick={() => {
                    setOpenMobile(false);
                    router.push("/");
                    router.refresh();
                  }}
                  type="button"
                  variant="ghost"
                >
                  <PlusIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="end" className="hidden md:block">
                New Chat
              </TooltipContent>
            </Tooltip>
          </div>
          {hasConnections ? (
            <Select
              disabled={isSwitching}
              onValueChange={handleSidebarCompanySelect}
              value={selectValue}
            >
              <SelectTrigger
                aria-label="Active Xero organisation"
                className="mt-3 h-9 w-full border border-border/40 bg-muted/40 px-2 text-left font-medium text-sm shadow-none focus:ring-0 data-[disabled]:cursor-default data-[disabled]:opacity-100"
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
          ) : (
            <div className="mt-3 rounded-md bg-muted/30 px-2 py-2 text-muted-foreground text-xs">
              Connect Xero to display your organisation.
            </div>
          )}
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarHistory user={user} />
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <UserButton>
                <UserButton.MenuItems>
                  <UserButton.Link
                    href="/"
                    label="Home"
                    labelIcon={<Home className="size-4" />}
                  />
                  <UserButton.Link
                    href="/agents"
                    label="Agents"
                    labelIcon={<Users className="size-4" />}
                  />
                  <UserButton.Action
                    label={`Toggle ${resolvedTheme === "light" ? "dark" : "light"} mode`}
                    labelIcon={
                      resolvedTheme === "dark" ? (
                        <Sun className="size-4" />
                      ) : (
                        <Moon className="size-4" />
                      )
                    }
                    onClick={() =>
                      setTheme(resolvedTheme === "dark" ? "light" : "dark")
                    }
                  />
                  <UserButton.Link
                    href="/settings"
                    label="Settings"
                    labelIcon={<Settings2 className="size-4" />}
                  />
                  <UserButton.Action label="manageAccount" />
                </UserButton.MenuItems>
              </UserButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
