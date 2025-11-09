import { eq } from "drizzle-orm";
import { ExternalLink, Info } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        {/* No connections state */}
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="font-semibold text-lg">No Xero Connection</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              Connect your Xero account to automatically sync your chart of
              accounts.
            </p>
            <Button asChild className="mt-4">
              <Link href="/settings/integrations">
                Connect Xero
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeConnection || !activeConnection.chartOfAccounts) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Company Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Xero Organisation</CardTitle>
          </CardHeader>
          <CardContent>
            <XeroCompanySelector
              activeConnectionId={activeConnection?.id}
              connections={connections}
              showAddNew
            />
          </CardContent>
        </Card>

        {/* No chart data state */}
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="font-semibold text-lg">
              Chart of Accounts Not Synced
            </h3>
            <p className="mt-2 text-muted-foreground text-sm">
              The chart of accounts has not been synced yet. Click the button
              below to sync now.
            </p>
            <form action="/api/xero/chart-of-accounts/sync" method="POST">
              <Button className="mt-4" type="submit">
                Sync Chart of Accounts
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Company Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Xero Organisation</CardTitle>
        </CardHeader>
        <CardContent>
          <XeroCompanySelector
            activeConnectionId={activeConnection.id}
            connections={connections}
            showAddNew
          />
        </CardContent>
      </Card>

      {/* Chart Display */}
      <Card>
        <CardContent className="pt-6">
          <ChartOfAccountsDisplay
            accounts={activeConnection.chartOfAccounts}
            organisationName={activeConnection.tenantName || undefined}
            showSyncButton
            syncedAt={activeConnection.chartOfAccountsSyncedAt}
          />
        </CardContent>
      </Card>

      {/* Info Box */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong className="font-medium">About Chart of Accounts</strong>
          <p className="mt-1 text-xs">
            Your chart of accounts is automatically used in AI conversations to
            provide context-aware assistance. The chart is synced when you
            connect Xero and when you switch organizations. You can also
            manually sync at any time.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
