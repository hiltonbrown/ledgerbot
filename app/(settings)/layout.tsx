import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "../(auth)/auth";
import { SettingsHeader } from "./_components/settings-header";

export const experimental_ppr = true;

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar user={session?.user} />
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
