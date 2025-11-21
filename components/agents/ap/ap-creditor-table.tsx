"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronRight,
  Search,
  AlertTriangle,
  Banknote,
  ArrowUpDown,
} from "lucide-react";
import type { ApContact } from "@/lib/db/schema/ap";

export type ContactWithStats = ApContact & {
  totalOutstanding: number;
  totalOverdue: number;
  billCount: number;
  oldestInvoiceDays: number;
  hasBankChange?: boolean;
};

interface APCreditorTableProps {
  creditors: ContactWithStats[];
  isLoading?: boolean;
  onRowExpand?: (creditor: ContactWithStats) => void;
}

type SortField = "name" | "outstanding" | "overdue" | "dpo";
type SortDirection = "asc" | "desc";

export function APCreditorTable({
  creditors,
  isLoading,
  onRowExpand,
}: APCreditorTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("outstanding");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Filter creditors by search term
  const filteredCreditors = creditors.filter((creditor) =>
    creditor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort creditors
  const sortedCreditors = [...filteredCreditors].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortField) {
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case "outstanding":
        aValue = a.totalOutstanding;
        bValue = b.totalOutstanding;
        break;
      case "overdue":
        aValue = a.totalOverdue;
        bValue = b.totalOverdue;
        break;
      case "dpo":
        aValue = a.oldestInvoiceDays;
        bValue = b.oldestInvoiceDays;
        break;
      default:
        return 0;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === "asc"
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const toggleRow = (creditorId: string, creditor: ContactWithStats) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(creditorId)) {
      newExpanded.delete(creditorId);
    } else {
      newExpanded.add(creditorId);
      // Trigger data load callback
      if (onRowExpand) {
        onRowExpand(creditor);
      }
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-1 font-medium text-xs ${
          colors[riskLevel as keyof typeof colors] || colors.low
        }`}
      >
        {riskLevel}
      </span>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-full rounded bg-muted" />
          <div className="h-64 w-full rounded bg-muted" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-lg">Creditor List</h3>
        <div className="relative w-64">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("name")}
                  className="gap-1"
                >
                  Supplier
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("outstanding")}
                  className="gap-1"
                >
                  Outstanding
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("overdue")}
                  className="gap-1"
                >
                  Overdue
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("dpo")}
                  className="gap-1"
                >
                  Next Payment
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-center">Risk Score</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCreditors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {searchTerm ? "No creditors found matching your search." : "No creditors found."}
                </TableCell>
              </TableRow>
            ) : (
              sortedCreditors.map((creditor) => {
                const isExpanded = expandedRows.has(creditor.id);

                return (
                  <TableRow key={creditor.id} className="group">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(creditor.id, creditor)}
                        className="h-6 w-6 p-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium">{creditor.name}</div>
                          <div className="text-muted-foreground text-sm">
                            {creditor.billCount} {creditor.billCount === 1 ? "bill" : "bills"}
                          </div>
                        </div>
                        {creditor.hasBankChange && (
                          <Banknote className="h-4 w-4 text-orange-500" title="Bank details changed" />
                        )}
                        {creditor.riskLevel === "high" || creditor.riskLevel === "critical" ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" title="High risk" />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${creditor.totalOutstanding.toLocaleString("en-AU", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {creditor.totalOverdue > 0 ? (
                        <span className="font-medium text-red-600">
                          ${creditor.totalOverdue.toLocaleString("en-AU", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm">
                      {creditor.oldestInvoiceDays > 0
                        ? `${creditor.oldestInvoiceDays} days`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {getRiskBadge(creditor.riskLevel)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleRow(creditor.id, creditor)}
                      >
                        {isExpanded ? "Collapse" : "View Details"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {sortedCreditors.length > 0 && (
        <div className="mt-4 text-muted-foreground text-sm">
          Showing {sortedCreditors.length} of {creditors.length} creditors
        </div>
      )}
    </Card>
  );
}
