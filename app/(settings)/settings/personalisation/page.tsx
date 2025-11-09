import { eq } from "drizzle-orm";
import { AIPreferencesForm } from "@/components/settings/ai-preferences-form";
import { ChatSuggestionsForm } from "@/components/settings/chat-suggestions-form";
import { CustomInstructionsForm } from "@/components/settings/custom-instructions-form";
import { LockSettingsBanner } from "@/components/settings/lock-settings-banner";
import { ProfileInfoCard } from "@/components/settings/profile-info-card";
import { TemplateVariableForm } from "@/components/settings/template-variable-form";
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
      {/* Lock Settings Banner */}
      <LockSettingsBanner data={data} />

      {/* Profile & Account */}
      <ProfileInfoCard data={data} />

      {/* Business Information (includes Template Variables, Country, State, Chart of Accounts) */}
      <TemplateVariableForm data={data} xeroConnection={activeConnection} />

      {/* AI Preferences */}
      <AIPreferencesForm data={data} />

      {/* Custom Instructions */}
      <CustomInstructionsForm data={data} />

      {/* Chat Suggestions */}
      <ChatSuggestionsForm data={data} />
    </div>
  );
}
