"use client";

import { UserButton } from "@clerk/nextjs";
import { Home, Moon, Settings2, Sun } from "lucide-react";
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
  tenantId: string;
  tenantName: string | null;
} | null;

export function AppSidebar({
  user,
  xeroConnection,
}: {
  user: AuthUser | null;
  xeroConnection?: SidebarXeroConnection;
}) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const { setTheme, resolvedTheme } = useTheme();
  const xeroTenantName =
    xeroConnection?.tenantName?.trim() || "Xero organisation";

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
          {xeroConnection ? (
            <Select defaultValue={xeroConnection.tenantId}>
              <SelectTrigger
                aria-label="Active Xero organisation"
                className="mt-3 h-9 w-full border border-border/40 bg-muted/40 px-2 text-left text-sm font-medium shadow-none focus:ring-0 data-[disabled]:cursor-default data-[disabled]:opacity-100"
              >
                <SelectValue placeholder="Xero organisation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={xeroConnection.tenantId}>
                  {xeroTenantName}
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="mt-3 rounded-md bg-muted/30 px-2 py-2 text-xs text-muted-foreground">
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
