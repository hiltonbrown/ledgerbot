import { auth } from "@clerk/nextjs/server";
import { FileText, RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import { getUserSettings } from "@/app/(settings)/api/user/data";
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
  const userSettings = await getUserSettings();
  const lastUpdated = data.length > 0 ? data[0].lastUpdated : null;

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-3xl">
            <FileText className="h-8 w-8 text-primary" />
            Accounts Receivable
          </h1>
          <p className="text-muted-foreground">
            Manage outstanding invoices and assess customer risk
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <SyncButton />
          {lastUpdated && (
            <p className="text-muted-foreground text-xs">
              Last updated:{" "}
              {lastUpdated.toLocaleString("en-AU", {
                timeZone: userSettings.personalisation.timezone,
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>

      <StaleDataBanner lastSyncDate={lastUpdated} />

      {/* KPI Cards */}
      <ARKPICards kpis={kpis} />

      {/* Ageing Summary Chart */}
      <ARAgeingChart ageingSummary={kpis.ageingSummary} />

      {/* Main Table */}
      <AgeingReportTable initialData={data} />
    </div>
  );
}
