"use client";

import {
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  Phone,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const getRiskColor = (daysOverdue: number) => {
    if (daysOverdue <= 30) return "text-yellow-600";
    if (daysOverdue <= 60) return "text-orange-600";
    if (daysOverdue <= 90) return "text-red-600";
    return "text-red-800";
  };

  const getRiskBadge = (daysOverdue: number) => {
    if (daysOverdue <= 30)
      return { label: "Low", variant: "secondary" as const };
    if (daysOverdue <= 60)
      return { label: "Medium", variant: "default" as const };
    if (daysOverdue <= 90)
      return { label: "High", variant: "destructive" as const };
    return { label: "Critical", variant: "destructive" as const };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">
                Accounts Receivable Agent
              </CardTitle>
            </div>
            <Button
              disabled={syncStatus.isSyncing || isLoadingReport}
              onClick={handleSyncXero}
              size="default"
            >
              {syncStatus.isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing from Xero
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync from Xero
                </>
              )}
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            Manage customer invoices, track overdue payments, and generate
            collection scripts. Sync data from Xero to view ageing reports and
            contact debtors.
          </p>
          {syncStatus.lastSynced && (
            <p className="text-muted-foreground text-xs">
              Last synced: {syncStatus.lastSynced.toLocaleString()} •{" "}
              {syncStatus.contactsSynced} contacts, {syncStatus.invoicesSynced}{" "}
              invoices
              {syncStatus.isUsingMock && " (using mock data)"}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {ageingReport && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Total Outstanding
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {formatCurrency(ageingReport.summary.totalOutstanding)}
              </div>
              <p className="text-muted-foreground text-xs">
                Across {ageingReport.summary.invoiceCount} invoice
                {ageingReport.summary.invoiceCount !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Active Debtors
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {ageingReport.summary.contactCount}
              </div>
              <p className="text-muted-foreground text-xs">
                Customers with overdue invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Average DSO</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {ageingReport.summary.contactCount > 0
                  ? Math.round(
                      ageingReport.contacts.reduce(
                        (sum, c) => sum + c.oldestInvoiceDays,
                        0
                      ) / ageingReport.summary.contactCount
                    )
                  : 0}{" "}
                days
              </div>
              <p className="text-muted-foreground text-xs">
                Days Sales Outstanding
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ageing Buckets */}
      {ageingReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Ageing Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ageingReport.buckets.map((bucket) => {
                const percentage =
                  ageingReport.summary.totalOutstanding > 0
                    ? (bucket.totalOutstanding /
                        ageingReport.summary.totalOutstanding) *
                      100
                    : 0;

                return (
                  <div className="space-y-2" key={bucket.label}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {bucket.label}
                        </span>
                        <Badge variant="outline">
                          {bucket.invoiceCount} invoice
                          {bucket.invoiceCount !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <span className="font-semibold text-sm">
                        {formatCurrency(bucket.totalOutstanding)}
                      </span>
                    </div>
                    <Progress className="h-2" value={percentage} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debtor List */}
      {ageingReport && ageingReport.contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Debtors ({ageingReport.contacts.length})
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Click on a debtor name to start a collection conversation with AI
              assistance
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
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
                {ageingReport.contacts.map((contact) => {
                  const risk = getRiskBadge(contact.oldestInvoiceDays);
                  return (
                    <TableRow key={contact.contactId}>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline"
                          href={`/?ar_contact=${contact.contactId}&ar_name=${encodeURIComponent(contact.contactName)}`}
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
                        <Link
                          href={`/?ar_contact=${contact.contactId}&ar_name=${encodeURIComponent(contact.contactName)}`}
                        >
                          <Button size="sm" variant="outline">
                            Contact
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {ageingReport && ageingReport.contacts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
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
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoadingReport && !ageingReport && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">
              Loading ageing report...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
