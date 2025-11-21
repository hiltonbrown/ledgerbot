"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AgeingBucket = {
  label: string;
  minDays: number;
  maxDays: number | null;
  totalOutstanding: number;
  invoiceCount: number;
};

type ContactAgeing = {
  contactId: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  totalOutstanding: number;
  invoiceCount: number;
  buckets: {
    current: number;
    thirtyDays: number;
    sixtyDays: number;
    ninetyPlus: number;
  };
  oldestInvoiceDays: number;
};

type AgeingReport = {
  asOf: string;
  summary: {
    totalOutstanding: number;
    invoiceCount: number;
    contactCount: number;
  };
  buckets: AgeingBucket[];
  contacts: ContactAgeing[];
};

type SyncStatus = {
  isSyncing: boolean;
  lastSynced: Date | null;
  contactsSynced: number;
  invoicesSynced: number;
  isUsingMock: boolean;
};

type Invoice = {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string;
  total: string;
  amountPaid: string;
  amountDue: string;
  status: string;
  daysOverdue: number;
  currency: string;
};

type ContactInvoicesData = {
  invoices: Invoice[];
};

export default function AccountsReceivableAgentPage() {
  const [ageingReport, setAgeingReport] = useState<AgeingReport | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSynced: null,
    contactsSynced: 0,
    invoicesSynced: 0,
    isUsingMock: false,
  });
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedContacts, setExpandedContacts] = useState<Set<string>>(
    new Set()
  );
  const [contactInvoices, setContactInvoices] = useState<
    Map<string, ContactInvoicesData>
  >(new Map());

  // Filtering and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [bucketFilter, setBucketFilter] = useState<string>("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Bulk selection state
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    new Set()
  );

  const loadAgeingReport = useCallback(async () => {
    setIsLoadingReport(true);
    setError(null);

    try {
      const response = await fetch("/api/agents/ar/ageing");

      if (!response.ok) {
        throw new Error("Failed to load ageing report");
      }

      const data: AgeingReport = await response.json();
      setAgeingReport(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load ageing report";
      setError(message);
    } finally {
      setIsLoadingReport(false);
    }
  }, []);

  const handleSyncXero = useCallback(async () => {
    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    setError(null);

    try {
      const response = await fetch("/api/agents/ar/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to sync with Xero");
      }

      setSyncStatus({
        isSyncing: false,
        lastSynced: new Date(),
        contactsSynced: data.contactsSynced,
        invoicesSynced: data.invoicesSynced,
        isUsingMock: data.isUsingMock,
      });

      // Reload the ageing report after sync
      await loadAgeingReport();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to sync with Xero";
      setError(message);
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
    }
  }, [loadAgeingReport]);

  // Load report on mount
  useEffect(() => {
    loadAgeingReport();
  }, [loadAgeingReport]);

  const toggleContactExpanded = useCallback(
    async (contactId: string) => {
      const isExpanded = expandedContacts.has(contactId);

      if (isExpanded) {
        // Collapse
        setExpandedContacts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(contactId);
          return newSet;
        });
      } else {
        // Expand and fetch invoices if not already loaded
        setExpandedContacts((prev) => new Set(prev).add(contactId));

        if (!contactInvoices.has(contactId)) {
          try {
            const response = await fetch(
              `/api/agents/ar/customer/${contactId}`
            );

            if (response.ok) {
              const data = await response.json();
              setContactInvoices((prev) => {
                const newMap = new Map(prev);
                newMap.set(contactId, { invoices: data.invoices });
                return newMap;
              });
            }
          } catch (err) {
            console.error("Failed to load invoices:", err);
          }
        }
      }
    },
    [expandedContacts, contactInvoices]
  );

  const formatCurrency = (amount: number | string) => {
    const value =
      typeof amount === "string" ? Number.parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getRiskColor = (daysOverdue: number) => {
    if (daysOverdue <= 30) {
      return "text-yellow-600";
    }
    if (daysOverdue <= 60) {
      return "text-orange-600";
    }
    if (daysOverdue <= 90) {
      return "text-red-600";
    }
    return "text-red-800";
  };

  const getRiskBadge = (daysOverdue: number) => {
    if (daysOverdue <= 30) {
      return { label: "Low", variant: "secondary" as const };
    }
    if (daysOverdue <= 60) {
      return { label: "Medium", variant: "default" as const };
    }
    if (daysOverdue <= 90) {
      return { label: "High", variant: "destructive" as const };
    }
    return { label: "Critical", variant: "destructive" as const };
  };

  const getRiskLevel = useCallback((daysOverdue: number): string => {
    if (daysOverdue <= 30) {
      return "low";
    }
    if (daysOverdue <= 60) {
      return "medium";
    }
    if (daysOverdue <= 90) {
      return "high";
    }
    return "critical";
  }, []);

  // Filtered and searched contacts
  const filteredContacts = useMemo(() => {
    if (!ageingReport) {
      return [];
    }

    let filtered = ageingReport.contacts;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (contact) =>
          contact.contactName.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query)
      );
    }

    // Risk level filter
    if (riskFilter !== "all") {
      filtered = filtered.filter(
        (contact) => getRiskLevel(contact.oldestInvoiceDays) === riskFilter
      );
    }

    // Overdue bucket filter
    if (bucketFilter !== "all") {
      filtered = filtered.filter((contact) => {
        const days = contact.oldestInvoiceDays;
        switch (bucketFilter) {
          case "0-30":
            return days >= 0 && days <= 30;
          case "31-60":
            return days >= 31 && days <= 60;
          case "61-90":
            return days >= 61 && days <= 90;
          case "90+":
            return days > 90;
          default:
            return true;
        }
      });
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      // Validate minAmount and maxAmount
      const min = minAmount ? Math.max(0, Number.parseFloat(minAmount)) : 0;
      const max = maxAmount
        ? Math.max(0, Number.parseFloat(maxAmount))
        : Number.POSITIVE_INFINITY;
      // If invalid input, skip filtering (show all)
      if (Number.isNaN(min) || Number.isNaN(max) || (maxAmount && min > max)) {
        // Optionally, you could return [] here to show no results, or handle error UI
        // For now, skip filtering
      } else {
        filtered = filtered.filter((contact) => {
          const amount = contact.totalOutstanding;
          return amount >= min && amount <= max;
        });
      }
    }

    return filtered;
  }, [
    ageingReport,
    searchQuery,
    riskFilter,
    bucketFilter,
    minAmount,
    maxAmount,
    getRiskLevel,
  ]);

  // Bulk selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(
        new Set(filteredContacts.map((contact) => contact.contactId))
      );
    }
  }, [selectedContacts, filteredContacts]);

  const handleSelectContact = useCallback((contactId: string) => {
    setSelectedContacts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedContacts(new Set());
  }, []);

  // CSV Export function
  const handleExportCSV = useCallback(() => {
    if (!ageingReport) {
      return;
    }

    const dataToExport =
      selectedContacts.size > 0
        ? filteredContacts.filter((c) => selectedContacts.has(c.contactId))
        : filteredContacts;

    // Escape CSV fields according to RFC 4180
    const escapeCSV = (value: string | number) => {
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [
      [
        "Customer Name",
        "Email",
        "Phone",
        "Total Outstanding",
        "Invoice Count",
        "Oldest Invoice (Days)",
        "Risk Level",
        "0-30 Days",
        "31-60 Days",
        "61-90 Days",
        "90+ Days",
      ],
      ...dataToExport.map((contact) => [
        contact.contactName,
        contact.email || "",
        contact.phone || "",
        contact.totalOutstanding.toString(),
        contact.invoiceCount.toString(),
        contact.oldestInvoiceDays.toString(),
        getRiskLevel(contact.oldestInvoiceDays),
        contact.buckets.current.toString(),
        contact.buckets.thirtyDays.toString(),
        contact.buckets.sixtyDays.toString(),
        contact.buckets.ninetyPlus.toString(),
      ]),
    ];

    const csvContent = csvRows
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `ar-ageing-report-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [ageingReport, filteredContacts, selectedContacts, getRiskLevel]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setRiskFilter("all");
    setBucketFilter("all");
    setMinAmount("");
    setMaxAmount("");
  }, []);

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-3xl">
            <DollarSign className="h-8 w-8 text-primary" />
            Accounts Receivable Agent
          </h1>
          <p className="text-muted-foreground">
            Manage customer invoices, track overdue payments, and generate
            collection scripts
          </p>
          {syncStatus.lastSynced && (
            <p className="text-muted-foreground text-xs">
              Last synced: {syncStatus.lastSynced.toLocaleString()} •{" "}
              {syncStatus.contactsSynced} contacts, {syncStatus.invoicesSynced}{" "}
              invoices
              {syncStatus.isUsingMock && " (using mock data)"}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            className="gap-2"
            disabled={syncStatus.isSyncing || isLoadingReport}
            onClick={handleSyncXero}
            variant="outline"
          >
            <RefreshCw
              className={`h-4 w-4 ${syncStatus.isSyncing ? "animate-spin" : ""}`}
            />
            Sync from Xero
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">{error}</p>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      {ageingReport && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-muted-foreground text-sm">
                  Total Outstanding
                </p>
                <p className="mt-2 font-bold text-3xl">
                  {formatCurrency(ageingReport.summary.totalOutstanding)}
                </p>
                <p className="mt-1 text-muted-foreground text-sm">
                  Across {ageingReport.summary.invoiceCount} invoice
                  {ageingReport.summary.invoiceCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-muted-foreground text-sm">
                  Active Debtors
                </p>
                <p className="mt-2 font-bold text-3xl">
                  {ageingReport.summary.contactCount}
                </p>
                <p className="mt-1 text-muted-foreground text-sm">
                  Customers with overdue invoices
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-muted-foreground text-sm">
                  Average DSO
                </p>
                <p className="mt-2 font-bold text-3xl">
                  {ageingReport.summary.contactCount > 0
                    ? Math.round(
                        ageingReport.contacts.reduce(
                          (sum, c) => sum + c.oldestInvoiceDays,
                          0
                        ) / ageingReport.summary.contactCount
                      )
                    : 0}{" "}
                  days
                </p>
                <p className="mt-1 text-muted-foreground text-sm">
                  Days Sales Outstanding
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Ageing Summary */}
      {ageingReport && (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-lg">Ageing Summary</h3>
            <p className="text-muted-foreground text-sm">
              Outstanding invoices by age
            </p>
          </div>

          <div className="space-y-4">
            {ageingReport.buckets.map((bucket) => {
              // Calculate max value for scaling
              const maxTotal = Math.max(
                ...ageingReport.buckets.map((b) => b.totalOutstanding),
                1
              );
              const percentage =
                maxTotal > 0 ? (bucket.totalOutstanding / maxTotal) * 100 : 0;
              const shareOfTotal =
                ageingReport.summary.totalOutstanding > 0
                  ? (bucket.totalOutstanding /
                      ageingReport.summary.totalOutstanding) *
                    100
                  : 0;

              // Determine color based on bucket
              let colorClass = "bg-green-500";
              if (
                bucket.label.includes("1-30") ||
                bucket.label.includes("30")
              ) {
                colorClass = "bg-yellow-500";
              } else if (
                bucket.label.includes("31-60") ||
                bucket.label.includes("60")
              ) {
                colorClass = "bg-orange-500";
              } else if (
                bucket.label.includes("61-90") ||
                bucket.label.includes("90+") ||
                bucket.label.includes("90")
              ) {
                colorClass = "bg-red-500";
              }

              return (
                <div className="space-y-2" key={bucket.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{bucket.label}</span>
                    <span className="text-muted-foreground">
                      {bucket.invoiceCount}{" "}
                      {bucket.invoiceCount === 1 ? "invoice" : "invoices"} • $
                      {bucket.totalOutstanding.toLocaleString("en-AU", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="relative h-8 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all duration-500 ${colorClass}`}
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-medium text-sm text-white drop-shadow-md">
                        {shareOfTotal.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between font-semibold">
              <span>Total</span>
              <span>
                $
                {ageingReport.summary.totalOutstanding.toLocaleString("en-AU", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      {ageingReport && ageingReport.contacts.length > 0 && (
        <Card className="p-6">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <div className="relative">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by customer name or email..."
                  value={searchQuery}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                size="default"
                variant="outline"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {(riskFilter !== "all" ||
                  bucketFilter !== "all" ||
                  minAmount ||
                  maxAmount) && (
                  <Badge className="ml-2" variant="destructive">
                    Active
                  </Badge>
                )}
              </Button>
              <Button
                onClick={handleExportCSV}
                size="default"
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="border-t pt-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="risk-filter">Risk Level</Label>
                  <Select onValueChange={setRiskFilter} value={riskFilter}>
                    <SelectTrigger id="risk-filter">
                      <SelectValue placeholder="All risks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risks</SelectItem>
                      <SelectItem value="low">Low (≤30 days)</SelectItem>
                      <SelectItem value="medium">
                        Medium (31-60 days)
                      </SelectItem>
                      <SelectItem value="high">High (61-90 days)</SelectItem>
                      <SelectItem value="critical">
                        Critical (90+ days)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bucket-filter">Overdue Period</Label>
                  <Select onValueChange={setBucketFilter} value={bucketFilter}>
                    <SelectTrigger id="bucket-filter">
                      <SelectValue placeholder="All periods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Periods</SelectItem>
                      <SelectItem value="0-30">0-30 days</SelectItem>
                      <SelectItem value="31-60">31-60 days</SelectItem>
                      <SelectItem value="61-90">61-90 days</SelectItem>
                      <SelectItem value="90+">90+ days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-amount">Min Amount</Label>
                  <Input
                    id="min-amount"
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="0"
                    type="number"
                    value={minAmount}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-amount">Max Amount</Label>
                  <Input
                    id="max-amount"
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="No limit"
                    type="number"
                    value={maxAmount}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button onClick={clearFilters} size="sm" variant="outline">
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
                <p className="text-muted-foreground text-sm">
                  Showing {filteredContacts.length} of{" "}
                  {ageingReport.contacts.length} customers
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Bulk Action Toolbar */}
      {selectedContacts.size > 0 && (
        <Card className="border-primary p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Check className="h-5 w-5 text-primary" />
              <span className="font-semibold">
                {selectedContacts.size} customer
                {selectedContacts.size !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/?ar_bulk=${Array.from(selectedContacts).map(encodeURIComponent).join(",")}`}
              >
                <Button size="default">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Draft Bulk Reminders
                </Button>
              </Link>
              <Button
                onClick={handleClearSelection}
                size="default"
                variant="outline"
              >
                <X className="mr-2 h-4 w-4" />
                Clear Selection
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Debtor List */}
      {ageingReport && filteredContacts.length > 0 && (
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="flex items-center gap-2 font-semibold text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Debtors ({filteredContacts.length})
            </h3>
            <p className="text-muted-foreground text-sm">
              Click the arrow to view invoice details, or click actions to draft
              reminders
            </p>
          </div>
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        selectedContacts.size === filteredContacts.length &&
                        filteredContacts.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[50px]" />
                  <TableHead>Debtor</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Oldest (Days)</TableHead>
                  <TableHead className="text-right">Risk</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => {
                  const risk = getRiskBadge(contact.oldestInvoiceDays);
                  const isExpanded = expandedContacts.has(contact.contactId);
                  const invoicesData = contactInvoices.get(contact.contactId);

                  return (
                    <>
                      <TableRow key={contact.contactId}>
                        <TableCell>
                          <Checkbox
                            checked={selectedContacts.has(contact.contactId)}
                            onCheckedChange={() =>
                              handleSelectContact(contact.contactId)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() =>
                              toggleContactExpanded(contact.contactId)
                            }
                            size="sm"
                            variant="ghost"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Link
                            className="font-medium hover:underline"
                            href={`/agents/ar/customer/${contact.contactId}`}
                          >
                            {contact.contactName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {contact.email && (
                            <div className="max-w-[200px] truncate">
                              {contact.email}
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-1 text-xs">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </div>
                          )}
                          {!contact.email && !contact.phone && (
                            <span className="text-muted-foreground text-xs">
                              No contact info
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(contact.totalOutstanding)}
                        </TableCell>
                        <TableCell className="text-right">
                          {contact.invoiceCount}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${getRiskColor(contact.oldestInvoiceDays)}`}
                        >
                          {contact.oldestInvoiceDays}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={risk.variant}>{risk.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/agents/ar/customer/${contact.contactId}`}
                            >
                              <Button size="sm" variant="outline">
                                <Eye className="mr-1 h-3 w-3" />
                                View
                              </Button>
                            </Link>
                            <Link
                              href={`/?ar_contact=${contact.contactId}&ar_name=${encodeURIComponent(contact.contactName)}`}
                            >
                              <Button size="sm" variant="default">
                                <MessageSquare className="mr-1 h-3 w-3" />
                                Reminder
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Invoice Details */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={9}>
                            <div className="bg-muted/30 p-4">
                              {invoicesData ? (
                                <div>
                                  <h4 className="mb-3 font-semibold text-sm">
                                    Invoice Breakdown
                                  </h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-xs">
                                          Invoice #
                                        </TableHead>
                                        <TableHead className="text-xs">
                                          Issue Date
                                        </TableHead>
                                        <TableHead className="text-xs">
                                          Due Date
                                        </TableHead>
                                        <TableHead className="text-right text-xs">
                                          Total
                                        </TableHead>
                                        <TableHead className="text-right text-xs">
                                          Paid
                                        </TableHead>
                                        <TableHead className="text-right text-xs">
                                          Outstanding
                                        </TableHead>
                                        <TableHead className="text-right text-xs">
                                          Days
                                        </TableHead>
                                        <TableHead className="text-right text-xs">
                                          Status
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {invoicesData.invoices.map((invoice) => {
                                        const statusVariant =
                                          invoice.status === "paid"
                                            ? "secondary"
                                            : invoice.daysOverdue > 60
                                              ? "destructive"
                                              : "default";

                                        return (
                                          <TableRow key={invoice.id}>
                                            <TableCell className="font-medium text-xs">
                                              {invoice.number}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                              {formatDate(invoice.issueDate)}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                              {formatDate(invoice.dueDate)}
                                            </TableCell>
                                            <TableCell className="text-right text-xs">
                                              {formatCurrency(invoice.total)}
                                            </TableCell>
                                            <TableCell className="text-right text-xs">
                                              {formatCurrency(
                                                invoice.amountPaid
                                              )}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-xs">
                                              {formatCurrency(
                                                invoice.amountDue
                                              )}
                                            </TableCell>
                                            <TableCell
                                              className={`text-right font-semibold text-xs ${getRiskColor(invoice.daysOverdue)}`}
                                            >
                                              {invoice.daysOverdue}
                                            </TableCell>
                                            <TableCell className="text-right text-xs">
                                              <Badge
                                                className="text-xs"
                                                variant={statusVariant}
                                              >
                                                {invoice.status}
                                              </Badge>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                  <span className="ml-2 text-muted-foreground text-sm">
                                    Loading invoices...
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {ageingReport && ageingReport.contacts.length === 0 && (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-semibold text-lg">No Overdue Invoices</h3>
            <p className="mb-4 text-center text-muted-foreground text-sm">
              All invoices are paid or not yet due. Click "Sync from Xero" to
              refresh data.
            </p>
            <Button disabled={syncStatus.isSyncing} onClick={handleSyncXero}>
              {syncStatus.isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync from Xero
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isLoadingReport && !ageingReport && (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">
              Loading ageing report...
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
