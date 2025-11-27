"use client";

import { ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function AgeingReportTable({ initialData }: AgeingReportTableProps) {
  const [data] = useState(initialData);
  const [sortField, setSortField] = useState<SortField>("totalOutstanding");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [filterMinBalance, setFilterMinBalance] = useState("");
  const [filterMinRisk, setFilterMinRisk] = useState("");
  const [filterHas90Plus, setFilterHas90Plus] = useState("all");

  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to desc for numbers usually
    }
  };

  const filteredData = data.filter((item) => {
    if (filterMinBalance && item.totalOutstanding < Number(filterMinBalance)) {
      return false;
    }
    if (filterMinRisk && item.riskScore < Number(filterMinRisk)) {
      return false;
    }
    if (filterHas90Plus === "yes" && item.ageing90Plus <= 0) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div className="space-y-2">
          <label className="font-medium text-sm">Min Outstanding</label>
          <Input
            className="w-[150px]"
            onChange={(e) => setFilterMinBalance(e.target.value)}
            placeholder="0.00"
            type="number"
            value={filterMinBalance}
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm">Min Risk Score</label>
          <Input
            className="w-[150px]"
            max="1.0"
            onChange={(e) => setFilterMinRisk(e.target.value)}
            placeholder="0.00"
            step="0.1"
            type="number"
            value={filterMinRisk}
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm">Has 90+ Overdue</label>
          <Select onValueChange={setFilterHas90Plus} value={filterHas90Plus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
            </SelectContent>
          </Select>
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
                  No customers found matching filters.
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
                    ${item.totalOutstanding.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ${item.ageingCurrent.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-yellow-600">
                    ${item.ageing1_30.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-orange-600">
                    ${item.ageing31_60.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    ${item.ageing61_90.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-red-800">
                    ${item.ageing90Plus.toFixed(2)}
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

      <CustomerDetailsSheet
        contactId={selectedContactId}
        customerName={selectedCustomer?.customerName || ""}
        onOpenChange={(open) => !open && setSelectedContactId(null)}
        riskScore={selectedCustomer?.riskScore || 0}
        totalOutstanding={selectedCustomer?.totalOutstanding || 0}
      />
    </div>
  );
}
