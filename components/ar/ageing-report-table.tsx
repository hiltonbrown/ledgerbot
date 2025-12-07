"use client";

import { AlertTriangle, ArrowUpDown, Clock, List, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AgeingReportItem } from "@/lib/actions/ar";
import { CustomerDetailsSheet } from "./customer-details-sheet";

type AgeingReportTableProps = {
  initialData: AgeingReportItem[];
};

type SortField =
  | "customerName"
  | "totalOutstanding"
  | "riskScore"
  | "ageing90Plus";
type SortDirection = "asc" | "desc";
type FilterTab = "all" | "high-risk" | "90-plus";

export function AgeingReportTable({ initialData }: AgeingReportTableProps) {
  const [data] = useState(initialData);
  const [sortField, setSortField] = useState<SortField>("totalOutstanding");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredData = data.filter((item) => {
    // Search filter
    if (
      searchTerm &&
      !item.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    // Tab filter
    if (activeTab === "high-risk" && item.riskScore <= 0.7) {
      return false;
    }
    if (activeTab === "90-plus" && item.ageing90Plus <= 0) {
      return false;
    }

    return true;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (aValue < bValue) {
      return sortDirection === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortDirection === "asc" ? 1 : -1;
    }
    return 0;
  });

  const selectedCustomer = data.find((c) => c.contactId === selectedContactId);

  // Calculate counts for tabs
  const counts = {
    all: data.length,
    highRisk: data.filter((item) => item.riskScore > 0.7).length,
    ninetyPlus: data.filter((item) => item.ageing90Plus > 0).length,
  };

  return (
    <Card className="p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            className="gap-2"
            onClick={() => setActiveTab("all")}
            size="sm"
            variant={activeTab === "all" ? "default" : "outline"}
          >
            <List className="h-4 w-4" />
            All
            <span
              className={`ml-1 rounded-full px-2 py-0.5 font-semibold text-xs ${
                activeTab === "all" ? "bg-white/20" : "bg-muted"
              }`}
            >
              {counts.all}
            </span>
          </Button>
          <Button
            className="gap-2"
            onClick={() => setActiveTab("high-risk")}
            size="sm"
            variant={activeTab === "high-risk" ? "default" : "outline"}
          >
            <AlertTriangle className="h-4 w-4" />
            High Risk
            <span
              className={`ml-1 rounded-full px-2 py-0.5 font-semibold text-xs ${
                activeTab === "high-risk" ? "bg-white/20" : "bg-muted"
              }`}
            >
              {counts.highRisk}
            </span>
          </Button>
          <Button
            className="gap-2"
            onClick={() => setActiveTab("90-plus")}
            size="sm"
            variant={activeTab === "90-plus" ? "default" : "outline"}
          >
            <Clock className="h-4 w-4" />
            90+ Days
            <span
              className={`ml-1 rounded-full px-2 py-0.5 font-semibold text-xs ${
                activeTab === "90-plus" ? "bg-white/20" : "bg-muted"
              }`}
            >
              {counts.ninetyPlus}
            </span>
          </Button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customers..."
            type="text"
            value={searchTerm}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  onClick={() => handleSort("customerName")}
                  variant="ghost"
                >
                  Customer <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  onClick={() => handleSort("totalOutstanding")}
                  variant="ghost"
                >
                  Outstanding <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">1-30 Days</TableHead>
              <TableHead className="text-right">31-60 Days</TableHead>
              <TableHead className="text-right">61-90 Days</TableHead>
              <TableHead className="text-right">
                <Button
                  onClick={() => handleSort("ageing90Plus")}
                  variant="ghost"
                >
                  90+ Days <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button onClick={() => handleSort("riskScore")} variant="ghost">
                  Risk Score <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell className="h-24 text-center" colSpan={8}>
                  {searchTerm
                    ? "No customers found matching your search."
                    : "No customers found."}
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((item) => (
                <TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  key={item.contactId}
                  onClick={() => setSelectedContactId(item.contactId)}
                >
                  <TableCell className="font-medium">
                    {item.customerName}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    $
                    {item.totalOutstanding.toLocaleString("en-AU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    $
                    {item.ageingCurrent.toLocaleString("en-AU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right text-yellow-600">
                    $
                    {item.ageing1_30.toLocaleString("en-AU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right text-orange-600">
                    $
                    {item.ageing31_60.toLocaleString("en-AU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    $
                    {item.ageing61_90.toLocaleString("en-AU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right font-bold text-red-800">
                    $
                    {item.ageing90Plus.toLocaleString("en-AU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`rounded px-2 py-1 font-medium text-xs ${
                        item.riskScore > 0.7
                          ? "bg-red-100 text-red-800"
                          : item.riskScore > 0.3
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                      }`}
                    >
                      {item.riskScore.toFixed(2)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 text-muted-foreground text-sm">
        Showing {sortedData.length} of {data.length} customers
      </div>

      <CustomerDetailsSheet
        contactId={selectedContactId}
        customerName={selectedCustomer?.customerName || ""}
        onOpenChange={(open) => !open && setSelectedContactId(null)}
        riskScore={selectedCustomer?.riskScore || 0}
        totalOutstanding={selectedCustomer?.totalOutstanding || 0}
      />
    </Card>
  );
}
