import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getActiveXeroConnection } from "@/lib/db/queries";
import { SettingsHeader } from "../_components/settings-header";

export const dynamic = "force-dynamic";
export const experimental_ppr = true;

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, cookieStore] = await Promise.all([getAuthUser(), cookies()]);
  const xeroConnection = user ? await getActiveXeroConnection(user.id) : null;
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
              <SettingsHeader />
            </div>
          </header>
          <main className="flex-1 px-6 py-8">
            <div className="mx-auto w-full max-w-5xl space-y-8">{children}</div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
