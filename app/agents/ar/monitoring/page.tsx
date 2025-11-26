import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/queries";
import { arJobRun } from "@/lib/db/schema/ar";

export const metadata: Metadata = {
  title: "AR Monitoring | LedgerBot",
  description: "Monitor AR data sync jobs and statistics",
};

export default async function ARMonitoringPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  // Fetch latest 10 job runs
  const jobRuns = await db
    .select()
    .from(arJobRun)
    .where(eq(arJobRun.userId, userId))
    .orderBy(desc(arJobRun.startedAt))
    .limit(10);

  const latestJob = jobRuns[0];

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="font-bold text-3xl tracking-tight">AR Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor automated AR data sync jobs and statistics.
        </p>
      </div>

      {latestJob && (
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-6">
            <div className="font-medium text-muted-foreground text-sm">
              Last Sync
            </div>
            <div className="mt-2 font-bold text-2xl">
              {latestJob.completedAt
                ? new Date(latestJob.completedAt).toLocaleString()
                : "In Progress"}
            </div>
            <div className="mt-1 text-sm">
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 font-medium text-xs ${
                  latestJob.status === "success"
                    ? "bg-green-100 text-green-800"
                    : latestJob.status === "failed"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {latestJob.status}
              </span>
            </div>
          </div>

          <div className="rounded-lg border p-6">
            <div className="font-medium text-muted-foreground text-sm">
              Customers Processed
            </div>
            <div className="mt-2 font-bold text-2xl">
              {latestJob.customersProcessed || 0}
            </div>
            <div className="mt-1 text-muted-foreground text-sm">
              High Risk: {latestJob.highRiskFlagged || 0}
            </div>
          </div>

          <div className="rounded-lg border p-6">
            <div className="font-medium text-muted-foreground text-sm">
              DSO (Days)
            </div>
            <div className="mt-2 font-bold text-2xl">
              {latestJob.stats?.dso?.toFixed(1) || "N/A"}
            </div>
            <div className="mt-1 text-muted-foreground text-sm">
              {latestJob.stats?.percentOver90Days?.toFixed(1)}% over 90 days
            </div>
          </div>
        </div>
      )}

      {latestJob?.stats?.riskDistribution && (
        <div className="mb-8 rounded-lg border p-6">
          <h2 className="mb-4 font-semibold text-lg">Risk Distribution</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="font-medium text-muted-foreground text-sm">
                Low Risk
              </div>
              <div className="mt-1 font-bold text-green-600 text-xl">
                {latestJob.stats.riskDistribution.low}
              </div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground text-sm">
                Medium Risk
              </div>
              <div className="mt-1 font-bold text-xl text-yellow-600">
                {latestJob.stats.riskDistribution.medium}
              </div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground text-sm">
                High Risk
              </div>
              <div className="mt-1 font-bold text-red-600 text-xl">
                {latestJob.stats.riskDistribution.high}
              </div>
            </div>
          </div>
        </div>
      )}

      {latestJob?.errors && latestJob.errors.length > 0 && (
        <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="mb-4 font-semibold text-lg text-red-900">Errors</h2>
          <ul className="space-y-2">
            {latestJob.errors.map((error, idx) => (
              <li className="text-red-800 text-sm" key={`error-${error.customerId || ""}-${idx}`}>
                <span className="font-mono">{error.message}</span>
                {error.customerId && (
                  <span className="ml-2 text-muted-foreground">
                    (Customer: {error.customerId})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border">
        <div className="border-b p-4">
          <h2 className="font-semibold text-lg">Job History</h2>
        </div>
        <div className="divide-y">
          {jobRuns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No job runs found. The nightly sync will populate this data.
            </div>
          ) : (
            jobRuns.map((job) => (
              <div
                className="flex items-center justify-between p-4"
                key={job.id}
              >
                <div>
                  <div className="font-medium">
                    {new Date(job.startedAt).toLocaleString()}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {job.customersProcessed} customers processed
                    {job.highRiskFlagged
                      ? `, ${job.highRiskFlagged} high-risk flagged`
                      : ""}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {job.completedAt && (
                    <div className="text-muted-foreground text-sm">
                      Duration:{" "}
                      {Math.round(
                        (new Date(job.completedAt).getTime() -
                          new Date(job.startedAt).getTime()) /
                          1000
                      )}
                      s
                    </div>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 font-medium text-xs ${
                      job.status === "success"
                        ? "bg-green-100 text-green-800"
                        : job.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
