"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner"; // Assuming sonner or useToast from shadcn
import {
  bulkVerifyContactsAction,
  syncContactsAction,
} from "@/app/agents/datavalidation/actions";
import { Button } from "@/components/ui/button";

export function SyncControls() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncContactsAction();
      if (result.success) {
        toast.success(`Synced ${result.count} contacts from Xero`);
      } else {
        toast.error(`Sync failed: ${result.error}`);
      }
    } catch (_error) {
      toast.error("An unexpected error occurred during sync");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBulkVerify = async () => {
    setIsVerifying(true);
    try {
      toast.info("Starting bulk verification...");
      const result = await bulkVerifyContactsAction();
      if (result.success) {
        toast.success(
          `Verified ${result.count} contacts. ${result.errors ? `(${result.errors.length} failed)` : ""}`
        );
      } else {
        toast.error(`Verification failed: ${result.error}`);
      }
    } catch (_error) {
      toast.error("An unexpected error occurred during verification");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        disabled={isSyncing || isVerifying}
        onClick={handleSync}
        variant="outline"
      >
        <RefreshCw
          className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
        />
        {isSyncing ? "Syncing..." : "Sync Contacts"}
      </Button>
      <Button
        disabled={isSyncing || isVerifying}
        onClick={handleBulkVerify}
        variant="default"
      >
        {isVerifying ? "Verifying..." : "Run Bulk Verification"}
      </Button>
    </div>
  );
}
