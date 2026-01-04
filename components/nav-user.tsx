"use client";

import { UserButton } from "@clerk/nextjs";
import { Home, Moon, Settings2, Sun, Users } from "lucide-react";
import { useTheme } from "next-themes";
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { sidebarUserButtonAppearance } from "@/lib/clerk/appearance";

export function NavUser() {
  const { setTheme, resolvedTheme } = useTheme();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <UserButton
          appearance={sidebarUserButtonAppearance}
          showName={!isCollapsed}
        >
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
  );
}
