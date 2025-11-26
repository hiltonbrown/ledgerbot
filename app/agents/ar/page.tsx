import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { AgeingReportTable } from "@/components/ar/ageing-report-table";
import { ARAgeingChart } from "@/components/ar/ar-ageing-chart";
import { ARKPICards } from "@/components/ar/ar-kpi-cards";
import { StaleDataBanner } from "@/components/ar/stale-data-banner";
import { SyncButton } from "@/components/ar/sync-button";
import { getAgeingReportData, getARKPIs } from "@/lib/actions/ar";
import { db } from "@/lib/db/queries";
import { arJobRun } from "@/lib/db/schema/ar";

export const metadata: Metadata = {
  title: "Accounts Receivable | LedgerBot",
  description: "Accounts Receivable management and ageing report",
};

export default async function AgeingReportPage() {
  const { userId } = await auth();
  const data = await getAgeingReportData();
  const kpis = await getARKPIs();
  const lastUpdated = data.length > 0 ? data[0].lastUpdated : new Date();

  // Fetch latest job run for stale data check
  let latestJob: typeof arJobRun.$inferSelect | null = null;
  if (userId) {
    const jobs = await db
      .select()
      .from(arJobRun)
      .where(eq(arJobRun.userId, userId))
      .orderBy(desc(arJobRun.startedAt))
      .limit(1);
    latestJob = jobs[0] || null;
  }

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
            Last updated: {lastUpdated.toLocaleString()}
          </div>
          <SyncButton />
        </div>
      </div>

      <StaleDataBanner
        lastSyncDate={latestJob?.completedAt || null}
        syncStatus={latestJob?.status || null}
      />

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
