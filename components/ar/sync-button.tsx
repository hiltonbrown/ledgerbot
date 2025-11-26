"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);

    try {
      const response = await fetch("/api/agents/ar/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Sync complete", {
          description: `Synced ${data.contactsSynced} contacts and ${data.invoicesSynced} invoices${data.isUsingMock ? " (using mock data)" : ""}`,
        });

        // Refresh the page to show updated data
        window.location.reload();
      } else {
        toast.error("Sync failed", {
          description: data.error || "Unknown error occurred",
        });
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Sync failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      disabled={isSyncing}
      onClick={handleSync}
      size="sm"
      variant="outline"
    >
      <RefreshCw
        className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
      />
      {isSyncing ? "Syncing..." : "Sync from Xero"}
    </Button>
  );
}
