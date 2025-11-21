"use client";

import { useEffect, useState } from "react";
import { CreditCard, RefreshCw, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APKPICards, type APKPIs } from "@/components/agents/ap/ap-kpi-cards";
import { APAgeingChart, type AgeingBucket } from "@/components/agents/ap/ap-ageing-chart";
import { APCreditorTable, type ContactWithStats } from "@/components/agents/ap/ap-creditor-table";
import { APFilterTabs, type FilterType } from "@/components/agents/ap/ap-filter-tabs";
import { APPaymentScheduleModal } from "@/components/agents/ap/ap-payment-schedule-modal";
import { useToast } from "@/hooks/use-toast";

export default function AccountsPayableAgentPage() {
  const { toast } = useToast();
  const [kpis, setKpis] = useState<APKPIs | null>(null);
  const [ageingSummary, setAgeingSummary] = useState<AgeingBucket[]>([]);
  const [creditors, setCreditors] = useState<ContactWithStats[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(true);
  const [isLoadingCreditors, setIsLoadingCreditors] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPaymentSchedule, setShowPaymentSchedule] = useState(false);

  // Load KPIs
  const loadKPIs = async () => {
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
  };

  // Load creditors
  const loadCreditors = async (filter: FilterType = "all") => {
    try {
      setIsLoadingCreditors(true);
      const response = await fetch(
        `/api/agents/ap/creditors?filter=${filter}`
      );
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
  };

  // Sync from Xero
  const handleSyncFromXero = async () => {
    try {
      setIsSyncing(true);
      toast({
        title: "Syncing from Xero",
        description: "Fetching bills and suppliers from Xero...",
      });

      const response = await fetch("/api/agents/ap/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Sync completed",
          description: `Synced ${data.summary.suppliersSync} suppliers and ${data.summary.billsSync} bills`,
        });

        // Reload data
        await Promise.all([loadKPIs(), loadCreditors(activeFilter)]);
      } else {
        toast({
          title: "Sync failed",
          description: data.error || "Failed to sync from Xero",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error syncing from Xero:", error);
      toast({
        title: "Sync error",
        description: "An error occurred while syncing from Xero",
        variant: "destructive",
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

  // Handle row expansion (placeholder for future AI commentary)
  const handleRowExpand = async (creditor: ContactWithStats) => {
    console.log("Expanding creditor:", creditor.name);
    // TODO: Load bill details and AI commentary
  };

  // Initial load
  useEffect(() => {
    loadKPIs();
    loadCreditors();
  }, []);

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
            variant="outline"
            onClick={handleSyncFromXero}
            disabled={isSyncing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
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
      <APKPICards kpis={kpis} isLoading={isLoadingKPIs} />

      {/* Ageing Summary */}
      <APAgeingChart ageingSummary={ageingSummary} isLoading={isLoadingKPIs} />

      {/* Filters */}
      <div className="flex items-center justify-between">
        <APFilterTabs
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          counts={filterCounts}
        />
      </div>

      {/* Creditor Table */}
      <APCreditorTable
        creditors={creditors}
        isLoading={isLoadingCreditors}
        onRowExpand={handleRowExpand}
      />

      {/* Payment Schedule Modal */}
      <APPaymentScheduleModal
        open={showPaymentSchedule}
        onClose={() => setShowPaymentSchedule(false)}
      />
    </div>
  );
}
