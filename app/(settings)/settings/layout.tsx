import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatHeader } from "@/components/chat-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getXeroConnectionsByUserId } from "@/lib/db/queries";
import { SettingsSubnav } from "../_components/settings-subnav";

export const dynamic = "force-dynamic";
export const experimental_ppr = true;

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, cookieStore] = await Promise.all([getAuthUser(), cookies()]);
  const xeroConnections = user ? await getXeroConnectionsByUserId(user.id) : [];
  const sidebarXeroConnections = xeroConnections.map((connection) => ({
    id: connection.id,
    tenantId: connection.tenantId,
    tenantName: connection.tenantName ?? null,
    isActive: connection.isActive,
    lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
  }));
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar user={user} xeroConnections={sidebarXeroConnections} />
      <SidebarInset>
        <div className="flex min-h-svh flex-col">
          <ChatHeader chatId="" isReadonly={false} />
          <SettingsSubnav />
          <main className="flex-1">{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
