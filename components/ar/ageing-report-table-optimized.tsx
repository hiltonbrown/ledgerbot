"use client";

import { ArrowUpDown } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
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

// Dynamic import for modal - code splitting
const CustomerDetailsSheet = dynamic(
  () =>
    import("./customer-details-sheet").then((mod) => ({
      default: mod.CustomerDetailsSheet,
    })),
  {
    loading: () => <div>Loading...</div>,
    ssr: false,
  }
);

interface AgeingReportTableProps {
  initialData: AgeingReportItem[];
}

type SortField =
  | "customerName"
  | "totalOutstanding"
  | "riskScore"
  | "ageing90Plus";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 50; // Items per page

export function AgeingReportTableOptimized({
  initialData,
}: AgeingReportTableProps) {
  const [data] = useState(initialData);
  const [sortField, setSortField] = useState<SortField>("totalOutstanding");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [filterMinBalance, setFilterMinBalance] = useState("");
  const [filterMinRisk, setFilterMinRisk] = useState("");
  const [filterHas90Plus, setFilterHas90Plus] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);

  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null
  );

  // Memoized sorting handler
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("desc");
      }
      setCurrentPage(1); // Reset to first page on sort
    },
    [sortField]
  );

  // Memoized filtered data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filterMinBalance && item.totalOutstanding < Number(filterMinBalance))
        return false;
      if (filterMinRisk && item.riskScore < Number(filterMinRisk)) return false;
      if (filterHas90Plus === "yes" && item.ageing90Plus <= 0) return false;
      return true;
    });
  }, [data, filterMinBalance, filterMinRisk, filterHas90Plus]);

  // Memoized sorted data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Memoized summary stats
  const summaryStats = useMemo(
    () => ({
      totalCustomers: filteredData.length,
      totalOutstanding: filteredData.reduce(
        (sum, item) => sum + item.totalOutstanding,
        0
      ),
      highRiskCount: filteredData.filter((item) => item.riskScore > 0.7).length,
    }),
    [filteredData]
  );

  const selectedCustomer = useMemo(
    () => data.find((c) => c.contactId === selectedContactId),
    [data, selectedContactId]
  );

  // Memoized filter handlers
  const handleMinBalanceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilterMinBalance(e.target.value);
      setCurrentPage(1);
    },
    []
  );

  const handleMinRiskChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilterMinRisk(e.target.value);
      setCurrentPage(1);
    },
    []
  );

  const handleHas90PlusChange = useCallback((value: string) => {
    setFilterHas90Plus(value);
    setCurrentPage(1);
  }, []);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="text-muted-foreground text-sm">Total Customers</div>
          <div className="font-bold text-2xl">
            {summaryStats.totalCustomers}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-muted-foreground text-sm">Total Outstanding</div>
          <div className="font-bold text-2xl">
            ${summaryStats.totalOutstanding.toFixed(2)}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-muted-foreground text-sm">High Risk</div>
          <div className="font-bold text-2xl text-red-600">
            {summaryStats.highRiskCount}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <label className="font-medium text-sm">Min Outstanding</label>
          <Input
            className="w-[150px]"
            onChange={handleMinBalanceChange}
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
            onChange={handleMinRiskChange}
            placeholder="0.00"
            step="0.1"
            type="number"
            value={filterMinRisk}
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm">Has 90+ Overdue</label>
          <Select onValueChange={handleHas90PlusChange} value={filterHas90Plus}>
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

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
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
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell className="h-24 text-center" colSpan={8}>
                  No customers found matching filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Showing {startIndex + 1}-{Math.min(endIndex, sortedData.length)} of{" "}
            {sortedData.length} customers
          </div>
          <div className="flex gap-2">
            <Button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              size="sm"
              variant="outline"
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    size="sm"
                    variant={currentPage === page ? "default" : "outline"}
                  >
                    {page}
                  </Button>
                );
              })}
              {totalPages > 5 && <span className="px-2">...</span>}
            </div>
            <Button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Lazy-loaded modal */}
      {selectedContactId && selectedCustomer && (
        <CustomerDetailsSheet
          contactId={selectedContactId}
          customerName={selectedCustomer.customerName}
          onOpenChange={(open) => !open && setSelectedContactId(null)}
          riskScore={selectedCustomer.riskScore}
          totalOutstanding={selectedCustomer.totalOutstanding}
        />
      )}
    </div>
  );
}
