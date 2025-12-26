import { Suspense } from "react";
import { SyncControls } from "@/components/agents/datavalidation/sync-controls";
import { VerificationSummaryCards } from "@/components/agents/datavalidation/verification-summary-cards";
import { requireAuth } from "@/lib/auth/clerk-helpers";
import { getActiveXeroConnection } from "@/lib/db/queries";
import { getDashboardData } from "./actions";
import { ClientPage } from "./client-page";

export const metadata = {
  title: "Data Validation Agent | LedgerBot",
  description:
    "Validate customer and supplier data against ABR and ASIC registries",
};

export default async function DataValidationPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string; page?: string; q?: string }>;
}) {
  const { tenantId: paramTenantId, page, q } = await searchParams;
  const user = await requireAuth();

  let tenantId = paramTenantId;
  if (!tenantId) {
    const activeConn = await getActiveXeroConnection(user.id);
    tenantId = activeConn?.tenantId;
  }

  if (!tenantId) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <h2 className="font-bold text-2xl">No Organization Selected</h2>
          <p className="text-muted-foreground mt-2">
            Please connect a Xero organization or select one from the settings.
          </p>
        </div>
      </div>
    );
  }

  const data = await getDashboardData(tenantId, Number(page) || 1, q || "");

  return (
    <div className="flex h-full flex-col space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-3xl tracking-tight">Data Validation</h2>
          <p className="text-muted-foreground">
            Verify contacts against ABR and ASIC registries to ensure
            compliance.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <SyncControls tenantId={tenantId} />
        </div>
      </div>

      <Suspense fallback={<div>Loading stats...</div>}>
        <VerificationSummaryCards summary={data.stats} />
      </Suspense>

      <ClientPage initialData={data} tenantId={tenantId} />
    </div>
  );
}
