import { eq } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChartOfAccountsDisplay } from "@/components/settings/chart-of-accounts-display";
import { XeroCompanySelector } from "@/components/settings/xero-company-selector";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { db } from "@/lib/db/queries";
import { xeroConnection } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

async function getXeroConnections(userId: string) {
  const connections = await db
    .select({
      id: xeroConnection.id,
      tenantName: xeroConnection.tenantName,
      isActive: xeroConnection.isActive,
      chartOfAccounts: xeroConnection.chartOfAccounts,
      chartOfAccountsSyncedAt: xeroConnection.chartOfAccountsSyncedAt,
    })
    .from(xeroConnection)
    .where(eq(xeroConnection.userId, userId))
    .orderBy(xeroConnection.updatedAt);

  return connections.map((conn) => ({
    ...conn,
    accountCount: Array.isArray(conn.chartOfAccounts)
      ? conn.chartOfAccounts.length
      : 0,
  }));
}

export default async function ChartOfAccountsPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const connections = await getXeroConnections(user.id);
  const activeConnection = connections.find((conn) => conn.isActive);

  if (connections.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Link className="hover:text-foreground" href="/settings">
            Settings
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Chart of Accounts</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="font-semibold text-3xl">Chart of Accounts</h1>
          <p className="text-muted-foreground">
            Manage your Xero chart of accounts for AI assistance
          </p>
        </div>

        {/* No connections state */}
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="font-semibold text-lg">No Xero Connection</h3>
          <p className="mt-2 text-muted-foreground text-sm">
            Connect your Xero account to automatically sync your chart of
            accounts.
          </p>
          <Link
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
            href="/settings/integrations"
          >
            Connect Xero
          </Link>
        </div>
      </div>
    );
  }

  if (!activeConnection || !activeConnection.chartOfAccounts) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Link className="hover:text-foreground" href="/settings">
            Settings
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Chart of Accounts</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="font-semibold text-3xl">Chart of Accounts</h1>
          <p className="text-muted-foreground">
            Manage your Xero chart of accounts for AI assistance
          </p>
        </div>

        {/* Company Selector */}
        <div className="rounded-lg border p-6">
          <XeroCompanySelector
            activeConnectionId={activeConnection?.id}
            connections={connections}
            showAddNew
          />
        </div>

        {/* No chart data state */}
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="font-semibold text-lg">
            Chart of Accounts Not Synced
          </h3>
          <p className="mt-2 text-muted-foreground text-sm">
            The chart of accounts has not been synced yet. Click the button
            below to sync now.
          </p>
          <form action="/api/xero/chart-of-accounts/sync" method="POST">
            <button
              className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
              type="submit"
            >
              Sync Chart of Accounts
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Link className="hover:text-foreground" href="/settings">
          Settings
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link className="hover:text-foreground" href="/settings/integrations">
          Integrations
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Chart of Accounts</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="font-semibold text-3xl">Chart of Accounts</h1>
        <p className="text-muted-foreground">
          Manage your Xero chart of accounts for AI assistance
        </p>
      </div>

      {/* Company Selector */}
      <div className="rounded-lg border p-6">
        <XeroCompanySelector
          activeConnectionId={activeConnection.id}
          connections={connections}
          showAddNew
        />
      </div>

      {/* Chart Display */}
      <div className="rounded-lg border p-6">
        <ChartOfAccountsDisplay
          accounts={activeConnection.chartOfAccounts}
          organisationName={activeConnection.tenantName || undefined}
          showSyncButton
          syncedAt={activeConnection.chartOfAccountsSyncedAt}
        />
      </div>

      {/* Info Box */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h4 className="font-medium text-sm">About Chart of Accounts</h4>
        <p className="mt-2 text-muted-foreground text-sm">
          Your chart of accounts is automatically used in AI conversations to
          provide context-aware assistance. The chart is synced when you connect
          Xero and when you switch organizations. You can also manually sync at
          any time.
        </p>
      </div>
    </div>
  );
}
