import { Suspense } from "react";
import { SyncControls } from "@/components/agents/datavalidation/sync-controls";
import { VerificationSummaryCards } from "@/components/agents/datavalidation/verification-summary-cards";
import { getDashboardData } from "./actions";
import { ClientPage } from "./client-page";

export const metadata = {
  title: "Data Validation Agent | LedgerBot",
  description:
    "Validate customer and supplier data against ABR and ASIC registries",
};

export default async function DataValidationPage() {
  // Initial data fetch
  const data = await getDashboardData();

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
          <SyncControls />
        </div>
      </div>

      <Suspense fallback={<div>Loading stats...</div>}>
        <VerificationSummaryCards summary={data.stats} />
      </Suspense>

      <ClientPage initialData={data} />
    </div>
  );
}
