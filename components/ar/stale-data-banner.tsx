"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface StaleDataBannerProps {
  lastSyncDate: Date | null;
  syncStatus: string | null;
}

export function StaleDataBanner({
  lastSyncDate,
  syncStatus,
}: StaleDataBannerProps) {
  if (!lastSyncDate) {
    return (
      <Alert className="mb-6" variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No Data Sync</AlertTitle>
        <AlertDescription>
          AR data has never been synced. Please contact support or wait for the
          nightly sync to run.
        </AlertDescription>
      </Alert>
    );
  }

  const now = new Date();
  const hoursSinceSync =
    (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);

  if (syncStatus === "failed") {
    return (
      <Alert className="mb-6" variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Sync Failed</AlertTitle>
        <AlertDescription>
          The last AR data sync failed. Some data may be outdated. Check the{" "}
          <a className="underline" href="/agents/ar/monitoring">
            monitoring dashboard
          </a>{" "}
          for details.
        </AlertDescription>
      </Alert>
    );
  }

  if (hoursSinceSync > 24) {
    return (
      <Alert className="mb-6 border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-900">Stale Data</AlertTitle>
        <AlertDescription className="text-yellow-800">
          AR data is {Math.floor(hoursSinceSync)} hours old. Last synced:{" "}
          {lastSyncDate.toLocaleString()}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
