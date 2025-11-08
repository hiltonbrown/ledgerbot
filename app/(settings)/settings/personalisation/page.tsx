import { eq } from "drizzle-orm";
import Link from "next/link";
import { ProfileInfoCard } from "@/components/settings/profile-info-card";
import { PromptSettingsForm } from "@/components/settings/prompt-settings-form";
import { TemplateVariableForm } from "@/components/settings/template-variable-form";
import { XeroCompanySelector } from "@/components/settings/xero-company-selector";
import { requireAuth } from "@/lib/auth/clerk-helpers";
import { db } from "@/lib/db/queries";
import { xeroConnection } from "@/lib/db/schema";
import { getUserSettings } from "../../api/user/data";

export const dynamic = "force-dynamic";

export default async function PersonalisationSettingsPage() {
  const data = await getUserSettings();
  const user = await requireAuth();

  // Fetch Xero connections for company selector
  const xeroConnections = await db
    .select({
      id: xeroConnection.id,
      tenantName: xeroConnection.tenantName,
      isActive: xeroConnection.isActive,
      chartOfAccounts: xeroConnection.chartOfAccounts,
      chartOfAccountsSyncedAt: xeroConnection.chartOfAccountsSyncedAt,
    })
    .from(xeroConnection)
    .where(eq(xeroConnection.userId, user.id))
    .orderBy(xeroConnection.updatedAt);

  const xeroConnectionsWithCount = xeroConnections.map((conn) => ({
    ...conn,
    accountCount: Array.isArray(conn.chartOfAccounts)
      ? conn.chartOfAccounts.length
      : 0,
  }));

  const activeConnection = xeroConnectionsWithCount.find(
    (conn) => conn.isActive
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-lg">Profile</h2>
        <p className="text-muted-foreground text-sm">
          Your profile information is managed through Clerk authentication.
        </p>
      </div>
      <ProfileInfoCard data={data} />

      <div className="pt-4">
        <h2 className="font-semibold text-lg">Template Variables</h2>
        <p className="text-muted-foreground text-sm">
          Define variables that will be automatically substituted in your system
          prompts. Use these to personalize the AI assistant with your business
          information.
        </p>
      </div>
      <TemplateVariableForm data={data} xeroConnection={activeConnection} />

      {xeroConnectionsWithCount.length > 0 && (
        <>
          <div className="pt-4">
            <h2 className="font-semibold text-lg">Xero Integration</h2>
            <p className="text-muted-foreground text-sm">
              Select which Xero organization to use for your chart of accounts.
              The chart will be automatically included in AI conversations.
            </p>
          </div>
          <div className="rounded-lg border p-6">
            <XeroCompanySelector
              activeConnectionId={activeConnection?.id}
              connections={xeroConnectionsWithCount}
              showViewAll
            />
            {activeConnection && (
              <div className="mt-4 flex items-center justify-between rounded-md border bg-muted/30 p-3">
                <div className="text-sm">
                  <p className="font-medium">
                    {activeConnection.accountCount} accounts synced
                  </p>
                  {activeConnection.chartOfAccountsSyncedAt && (
                    <p className="text-muted-foreground text-xs">
                      Last synced:{" "}
                      {new Date(
                        activeConnection.chartOfAccountsSyncedAt
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Link
                  className="text-primary text-sm hover:underline"
                  href="/settings/chartofaccounts"
                >
                  View Chart of Accounts
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      <div className="pt-4">
        <h2 className="font-semibold text-lg">System Prompts</h2>
        <p className="text-muted-foreground text-sm">
          Customize the prompts used by the AI assistant for different types of
          tasks. You can use template variables like {"{"}
          {"{"}COMPANY_NAME{"}"}
          {"}"} in your prompts.
        </p>
      </div>
      <PromptSettingsForm data={data} />
    </div>
  );
}
