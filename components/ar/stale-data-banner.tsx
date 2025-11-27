"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface StaleDataBannerProps {
  lastSyncDate: Date | null;
}

export function StaleDataBanner({ lastSyncDate }: StaleDataBannerProps) {
  if (!lastSyncDate) {
    return (
      <Alert className="mb-6" variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No Data Sync</AlertTitle>
        <AlertDescription>
          AR data has not been synced yet. Use the "Sync from Xero" button to
          refresh the ageing report.
        </AlertDescription>
      </Alert>
    );
  }

  const now = new Date();
  const hoursSinceSync =
    (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);

  if (hoursSinceSync > 24) {
    return (
      <Alert className="mb-6 border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-900">Stale Data</AlertTitle>
        <AlertDescription className="text-yellow-800">
          AR data is {Math.floor(hoursSinceSync)} hours old. Last synced {lastSyncDate.toLocaleString()}. Use "Sync from Xero" to refresh.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
