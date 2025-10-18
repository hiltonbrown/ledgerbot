import { cookies } from "next/headers";
import { AgentsHeader } from "@/components/agents/agents-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getActiveXeroConnection } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const experimental_ppr = true;

export default async function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, cookieStore] = await Promise.all([getAuthUser(), cookies()]);
  const xeroConnection = user
    ? await getActiveXeroConnection(user.id)
    : null;
  const sidebarXeroConnection = xeroConnection
    ? {
        tenantId: xeroConnection.tenantId,
        tenantName: xeroConnection.tenantName ?? null,
      }
    : null;
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar user={user} xeroConnection={sidebarXeroConnection} />
      <SidebarInset>
        <div className="flex min-h-svh flex-col">
          <header className="border-b bg-background">
            <div className="flex flex-col gap-4 px-6 py-6">
              <AgentsHeader />
            </div>
          </header>
          <main className="flex-1 px-6 py-8">
            <div className="mx-auto w-full max-w-6xl space-y-8">{children}</div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
