import { cookies } from "next/headers";
import Script from "next/script";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getActiveXeroConnection } from "@/lib/db/queries";

export const experimental_ppr = true;

export default async function Layout({
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
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <DataStreamProvider>
        <SidebarProvider defaultOpen={!isCollapsed}>
          <AppSidebar user={user} xeroConnection={sidebarXeroConnection} />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </DataStreamProvider>
    </>
  );
}
