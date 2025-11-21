import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatHeader } from "@/components/chat-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getXeroConnectionsByUserId } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const experimental_ppr = true;

export default async function AgentsLayout({
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
  }));
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar user={user} xeroConnections={sidebarXeroConnections} />
      <SidebarInset>
        <div className="flex min-h-svh flex-col">
          <ChatHeader chatId="" isReadonly={false} />
          <main className="flex-1 px-6 py-8">
            <div className="mx-auto w-full max-w-6xl space-y-8">{children}</div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
