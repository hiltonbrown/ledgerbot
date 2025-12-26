"use client";

import { useAuth } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import { FileText, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AgeingReportTable } from "@/components/ar/ageing-report-table";
import { ARAgeingChart } from "@/components/ar/ar-ageing-chart";
import { ARKPICards } from "@/components/ar/ar-kpi-cards";
import { StaleDataBanner } from "@/components/ar/stale-data-banner";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { AgeingReportItem, ARKPIs } from "@/lib/actions/ar";
import {
  getActiveXeroConnectionAction,
  getAgeingReportData,
  getARKPIs,
} from "@/lib/actions/ar";

export default function AgeingReportPage() {
  const { userId } = useAuth();
  const [data, setData] = useState<AgeingReportItem[]>([]);
  const [kpis, setKpis] = useState<ARKPIs | null>(null);
  const [activeConnection, setActiveConnection] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState("");

  const loadData = useCallback(async (tenantId: string) => {
    try {
      setIsLoading(true);
      const [reportData, kpiData] = await Promise.all([
        getAgeingReportData(tenantId),
        getARKPIs(tenantId),
      ]);
      setData(reportData);
      setKpis(kpiData);
    } catch (error) {
      console.error("Failed to load AR data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pollJob = useCallback(
    async (jobId: string) => {
      try {
        const res = await fetch(`/api/agents/ar/sync/job?jobId=${jobId}`);
        const { job } = await res.json();

        if (job.status === "running" || job.status === "pending") {
          setSyncProgress(job.progress);
          setSyncMessage(job.message);
          setTimeout(() => pollJob(jobId), 1000);
        } else if (job.status === "success") {
          setIsSyncing(false);
          setSyncJobId(null);
          toast({ type: "success", description: "Sync complete." });
          if (activeConnection) loadData(activeConnection.tenantId);
          // Refresh connection to get new lastSyncAt
          const conn = await getActiveXeroConnectionAction();
          setActiveConnection(conn);
        } else if (job.status === "failed") {
          setIsSyncing(false);
          setSyncJobId(null);
          toast({ type: "error", description: job.error || "Sync failed" });
        } else if (job.status === "cancelled") {
          setIsSyncing(false);
          setSyncJobId(null);
          toast({ type: "success", description: "Sync cancelled." });
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    },
    [activeConnection, loadData, userId]
  );

  const handleSync = async () => {
    if (!activeConnection) return;
    try {
      setIsSyncing(true);
      setSyncProgress(0);
      setSyncMessage("Starting...");

      const res = await fetch("/api/agents/ar/sync", { method: "POST" });
      const result = await res.json();

      if (result.success) {
        setSyncJobId(result.jobId);
        pollJob(result.jobId);
      } else {
        setIsSyncing(false);
        toast({ type: "error", description: result.error || "Sync failed" });
      }
    } catch (err) {
      setIsSyncing(false);
      toast({ type: "error", description: "Sync failed unexpectedly." });
    }
  };

  const handleCancel = async () => {
    if (!syncJobId) return;
    await fetch(`/api/agents/ar/sync/job?jobId=${syncJobId}`, {
      method: "DELETE",
    });
  };

  useEffect(() => {
    if (!userId) return;

    (async () => {
      const conn = await getActiveXeroConnectionAction();
      if (conn) {
        setActiveConnection(conn);
        await loadData(conn.tenantId);
      } else {
        setIsLoading(false);
      }
    })();
  }, [userId, loadData]);

  const lastUpdated = data.length > 0 ? data[0].lastUpdated : null;

  if (isLoading && !activeConnection) {
    return <div className="p-8 text-center">Loading connection...</div>;
  }

  if (!activeConnection) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center space-y-4">
        <p className="text-lg text-muted-foreground">
          No Xero organization connected.
        </p>
        <Button
          onClick={() => (window.location.href = "/settings/integrations")}
        >
          Connect Xero
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-3xl">
            <FileText className="h-8 w-8 text-primary" />
            Accounts Receivable
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <p>Manage outstanding invoices and assess customer risk</p>
            {activeConnection?.lastSyncAt && (
              <span className="text-xs">
                • Last synced:{" "}
                {formatDistanceToNow(new Date(activeConnection.lastSyncAt), {
                  addSuffix: true,
                })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSyncing ? (
            <div className="flex items-center gap-4">
              <div className="w-48 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span>{syncMessage}</span>
                  <span>{syncProgress}%</span>
                </div>
                <Progress className="h-1" value={syncProgress} />
              </div>
              <Button
                onClick={handleCancel}
                size="icon"
                title="Cancel Sync"
                variant="ghost"
              >
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <Button className="gap-2" onClick={handleSync} variant="outline">
              <RefreshCw className="h-4 w-4" />
              Sync from Xero
            </Button>
          )}
        </div>
      </div>

      {!isLoading && data.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="mb-4 text-lg text-muted-foreground">
            No data found for this organization.
          </p>
          <Button disabled={isSyncing} onClick={handleSync}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            Initial Sync from Xero
          </Button>
        </div>
      )}

      {data.length > 0 && (
        <>
          <StaleDataBanner lastSyncDate={lastUpdated} />
          {kpis && <ARKPICards kpis={kpis} />}
          {kpis && <ARAgeingChart ageingSummary={kpis.ageingSummary} />}
          <AgeingReportTable initialData={data} />
        </>
      )}
    </div>
  );
}
