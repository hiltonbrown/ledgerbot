import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { AgeingReportTable } from "@/components/ar/ageing-report-table";
import { ARAgeingChart } from "@/components/ar/ar-ageing-chart";
import { ARKPICards } from "@/components/ar/ar-kpi-cards";
import { StaleDataBanner } from "@/components/ar/stale-data-banner";
import { SyncButton } from "@/components/ar/sync-button";
import { getAgeingReportData, getARKPIs } from "@/lib/actions/ar";

export const metadata: Metadata = {
  title: "Accounts Receivable | LedgerBot",
  description: "Accounts Receivable management and ageing report",
};

export default async function AgeingReportPage() {
  await auth();
  const data = await getAgeingReportData();
  const kpis = await getARKPIs();
  const lastUpdated = data.length > 0 ? data[0].lastUpdated : null;

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">
            Accounts Receivable
          </h1>
          <p className="text-muted-foreground">
            Manage outstanding invoices and assess customer risk.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-muted-foreground text-sm">
            Last updated: {lastUpdated ? lastUpdated.toLocaleString() : "N/A"}
          </div>
          <SyncButton />
        </div>
      </div>

      <StaleDataBanner lastSyncDate={lastUpdated} />

      {/* KPI Cards */}
      <div className="mb-6">
        <ARKPICards kpis={kpis} />
      </div>

      {/* Ageing Summary Chart */}
      <div className="mb-6">
        <ARAgeingChart ageingSummary={kpis.ageingSummary} />
      </div>

      <AgeingReportTable initialData={data} />
    </div>
  );
}
