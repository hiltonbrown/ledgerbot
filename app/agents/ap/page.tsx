"use client";

import { Calendar, CreditCard, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  type AgeingBucket,
  APAgeingChart,
} from "@/components/agents/ap/ap-ageing-chart";
import type { CreditorDetailsData } from "@/components/agents/ap/ap-creditor-details";
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

  // Expanded creditor data
  const [expandedData, setExpandedData] = useState<
    Record<string, CreditorDetailsData | null>
  >({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );

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
  const handleSyncFromXero = async () => {
    try {
      setIsSyncing(true);
      toast({
        type: "success",
        description: "Syncing from Xero - Fetching bills and suppliers...",
      });

      const response = await fetch("/api/agents/ap/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          type: "success",
          description: `Synced ${data.summary.suppliersSync} suppliers and ${data.summary.billsSync} bills`,
        });

        // Reload data
        await Promise.all([loadKPIs(), loadCreditors(activeFilter)]);
      } else {
        toast({
          type: "error",
          description: data.error || "Failed to sync from Xero",
        });
      }
    } catch (error) {
      console.error("Error syncing from Xero:", error);
      toast({
        type: "error",
        description: "An error occurred while syncing from Xero",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    loadCreditors(filter);
  };

  // Handle row expansion with AI commentary
  const handleRowExpand = async (creditor: ContactWithStats) => {
    // Check if we already have data for this creditor
    if (expandedData[creditor.id]) {
      return; // Already loaded
    }

    try {
      // Set loading state
      setLoadingStates((prev) => ({ ...prev, [creditor.id]: true }));

      const response = await fetch(
        `/api/agents/ap/creditors/${creditor.id}/commentary`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setExpandedData((prev) => ({
          ...prev,
          [creditor.id]: result.data,
        }));
      } else {
        console.error("Failed to load creditor commentary:", result.error);
        toast({
          type: "error",
          description: result.error || "Could not load creditor details",
        });
        setExpandedData((prev) => ({ ...prev, [creditor.id]: null }));
      }
    } catch (error) {
      console.error("Error loading creditor commentary:", error);
      toast({
        type: "error",
        description: "An error occurred while loading creditor details",
      });
      setExpandedData((prev) => ({ ...prev, [creditor.id]: null }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, [creditor.id]: false }));
    }
  };

  // Initial load
  useEffect(() => {
    loadKPIs();
    loadCreditors();
  }, [loadCreditors, loadKPIs]);

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
          <p className="text-muted-foreground">
            Manage supplier payments, detect risks, and track cash flow
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="gap-2"
            disabled={isSyncing}
            onClick={handleSyncFromXero}
            variant="outline"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            Sync from Xero
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
        expandedData={expandedData}
        isLoading={isLoadingCreditors}
        loadingStates={loadingStates}
        onRowExpand={handleRowExpand}
      />

      {/* Payment Schedule Sheet */}
      <APPaymentScheduleSheet
        onClose={() => setShowPaymentSchedule(false)}
        open={showPaymentSchedule}
      />
    </div>
  );
}
