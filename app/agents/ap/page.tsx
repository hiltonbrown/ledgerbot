"use client";

import { formatDistanceToNow } from "date-fns";
import { Calendar, CreditCard, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  type AgeingBucket,
  APAgeingChart,
} from "@/components/agents/ap/ap-ageing-chart";
import { APCreditorDetailsSheet } from "@/components/agents/ap/ap-creditor-details-sheet";
import {
  APCreditorTable,
  type ContactWithStats,
} from "@/components/agents/ap/ap-creditor-table";
import {
  APFilterTabs,
  type FilterType,
} from "@/components/agents/ap/ap-filter-tabs";
import { APKPICards, type APKPIs } from "@/components/agents/ap/ap-kpi-cards";
import { APPaymentScheduleSheet } from "@/components/agents/ap/ap-payment-schedule-sheet";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";

export default function AccountsPayableAgentPage() {
  const [kpis, setKpis] = useState<APKPIs | null>(null);
  const [ageingSummary, setAgeingSummary] = useState<AgeingBucket[]>([]);
  const [creditors, setCreditors] = useState<ContactWithStats[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(true);
  const [isLoadingCreditors, setIsLoadingCreditors] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPaymentSchedule, setShowPaymentSchedule] = useState(false);
  const [selectedCreditor, setSelectedCreditor] =
    useState<ContactWithStats | null>(null);

  // Load KPIs
  const loadKPIs = useCallback(async () => {
    try {
      setIsLoadingKPIs(true);
      const response = await fetch("/api/agents/ap/kpis");
      const data = await response.json();

      if (data.success && data.kpis) {
        setKpis(data.kpis);
        setAgeingSummary(data.kpis.ageingSummary || []);
      } else {
        console.error("Failed to load KPIs:", data.error);
      }
    } catch (error) {
      console.error("Error loading KPIs:", error);
    } finally {
      setIsLoadingKPIs(false);
    }
  }, []);

  // Load creditors
  const loadCreditors = useCallback(async (filter: FilterType = "all") => {
    try {
      setIsLoadingCreditors(true);
      const response = await fetch(`/api/agents/ap/creditors?filter=${filter}`);
      const data = await response.json();

      if (data.success && data.creditors) {
        setCreditors(data.creditors);
      } else {
        console.error("Failed to load creditors:", data.error);
      }
    } catch (error) {
      console.error("Error loading creditors:", error);
    } finally {
      setIsLoadingCreditors(false);
    }
  }, []);

  // Sync from Xero
  const handleSyncFromXero = useCallback(async (background = false) => {
    try {
      setIsSyncing(true);
      if (!background) {
        toast({
          type: "success",
          description: "Syncing from Xero - Fetching bills and suppliers...",
        });
      }

      const response = await fetch("/api/agents/ap/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        if (!background) {
          toast({
            type: "success",
            description: `Synced ${data.summary.suppliersSync} suppliers and ${data.summary.billsSync} bills`,
          });
        }

        // Reload data
        // Note: activeFilter is not available in useCallback dependency without causing loops or stale closures if not careful
        // But since this is inside the component, we can access the state ref or just reload all.
        // To be safe and clean, we'll trigger reload here.
        // Actually, we can't easily access 'activeFilter' here if we wrap in useCallback without adding it to deps.
        // If we add it to deps, handleSyncFromXero changes every time filter changes. That's fine.
      } else if (background) {
        console.error("Background sync failed:", data.error);
      } else {
        toast({
          type: "error",
          description: data.error || "Failed to sync from Xero",
        });
      }
    } catch (error) {
      console.error("Error syncing from Xero:", error);
      if (!background) {
        toast({
          type: "error",
          description: "An error occurred while syncing from Xero",
        });
      }
    } finally {
      setIsSyncing(false);
      // Always reload KPIs to update "Last Synced" time
      // We need to call loadKPIs() and loadCreditors() here.
      // Since they are state setting functions, we can call them.
      // But we need to make sure we don't create infinite loops.
      // Let's return true if success so the caller can reload.
      return true;
    }
  }, []);

  // Sync and reload wrapper
  const triggerSync = async (background = false) => {
    const success = await handleSyncFromXero(background);
    if (success) {
      loadKPIs();
      loadCreditors(activeFilter);
    }
  };

  // Handle filter change
  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    loadCreditors(filter);
  };

  // Initial load
  useEffect(() => {
    loadKPIs();
    loadCreditors();
    // Trigger background sync on mount
    triggerSync(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Calculate filter counts
  const filterCounts = {
    all: creditors.length,
    highRisk: creditors.filter(
      (c) => c.riskLevel === "high" || c.riskLevel === "critical"
    ).length,
    bankChanges: creditors.filter((c) => c.hasBankChange).length,
    overdue: creditors.filter((c) => c.totalOverdue > 0).length,
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-3xl">
            <CreditCard className="h-8 w-8 text-primary" />
            Accounts Payable Agent
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <p>Manage supplier payments, detect risks, and track cash flow</p>
            {kpis?.lastSyncedAt && (
              <span className="text-xs">
                • Last synced:{" "}
                {formatDistanceToNow(new Date(kpis.lastSyncedAt), {
                  addSuffix: true,
                })}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            className="gap-2"
            disabled={isSyncing}
            onClick={() => triggerSync(false)}
            variant="outline"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing..." : "Sync from Xero"}
          </Button>
          <Button
            className="gap-2"
            onClick={() => setShowPaymentSchedule(true)}
          >
            <Calendar className="h-4 w-4" />
            Payment Schedule
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <APKPICards isLoading={isLoadingKPIs} kpis={kpis} />

      {/* Ageing Summary */}
      <APAgeingChart ageingSummary={ageingSummary} isLoading={isLoadingKPIs} />

      {/* Filters */}
      <div className="flex items-center justify-between">
        <APFilterTabs
          activeFilter={activeFilter}
          counts={filterCounts}
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Creditor Table */}
      <APCreditorTable
        creditors={creditors}
        isLoading={isLoadingCreditors}
        onSelectCreditor={setSelectedCreditor}
      />

      {/* Payment Schedule Sheet */}
      <APPaymentScheduleSheet
        onClose={() => setShowPaymentSchedule(false)}
        open={showPaymentSchedule}
      />

      {/* Creditor Details Sheet */}
      <APCreditorDetailsSheet
        creditorId={selectedCreditor?.id || null}
        creditorName={selectedCreditor?.name || ""}
        onOpenChange={(open) => !open && setSelectedCreditor(null)}
      />
    </div>
  );
}
