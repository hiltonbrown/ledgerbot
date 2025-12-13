"use client";

import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import {
//   ColumnDef,
//   flexRender,
//   getCoreRowModel,
//   useReactTable,
//   getPaginationRowModel,
//   getSortedRowModel,
//   SortingState,
//   getFilteredRowModel,
//   ColumnFiltersState,
// } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  VerificationResult,
  XeroContactRecord,
} from "@/types/datavalidation";
import {
  GSTStatusBadge,
  VerificationStatusBadge,
} from "./verification-status-badge";

// import { formatDistanceToNow } from "date-fns";

// NOTE: For this MVP, I'm building a simple table structure.
// Fully featured data-table is skipped for brevity but would follow the project's data-table pattern.

interface ContactComparisonTableProps {
  contacts: Array<{
    contact: XeroContactRecord;
    verification?: VerificationResult;
    updatedAt: Date;
  }>;
  onViewDetails: (contact: XeroContactRecord) => void;
  onVerify: (contactId: string) => void;
}

export function ContactComparisonTable({
  contacts,
  onViewDetails,
  onVerify,
}: ContactComparisonTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox />
            </TableHead>
            <TableHead>Contact Name</TableHead>
            <TableHead>ABN / ACN</TableHead>
            <TableHead>Registry</TableHead>
            <TableHead>Comparison</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.length === 0 ? (
            <TableRow>
              <TableCell className="h-24 text-center" colSpan={6}>
                No contacts found.
              </TableCell>
            </TableRow>
          ) : (
            contacts.map(({ contact, verification, updatedAt }) => (
              <TableRow
                className="cursor-pointer hover:bg-muted/50"
                key={contact.contactId}
                onClick={() => onViewDetails(contact)}
              >
                <TableCell
                  className="w-[40px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{contact.name}</div>
                  <div className="mt-1 flex gap-1">
                    {contact.isCustomer && (
                      <Badge className="h-4 text-[10px]" variant="secondary">
                        Cus
                      </Badge>
                    )}
                    {contact.isSupplier && (
                      <Badge className="h-4 text-[10px]" variant="secondary">
                        Sup
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-mono text-xs">
                    {contact.taxNumber || "-"}
                  </div>
                  <div className="font-mono text-muted-foreground text-xs">
                    {contact.companyNumber || "-"}
                  </div>
                </TableCell>
                <TableCell>
                  {verification?.abrRecord ? (
                    <div className="space-y-1">
                      <div
                        className="max-w-[150px] truncate font-medium text-xs"
                        title={verification.abrRecord.entityName}
                      >
                        {verification.abrRecord.entityName}
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          className="h-4 px-1 text-[10px]"
                          variant={
                            verification.abrRecord.abnStatus === "Active"
                              ? "outline"
                              : "destructive"
                          }
                        >
                          {verification.abrRecord.abnStatus[0]}
                        </Badge>
                        <GSTStatusBadge
                          className="h-4 px-1"
                          registered={
                            verification.abrRecord.gst.status === "Registered"
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {verification ? (
                    <VerificationStatusBadge
                      status={verification.verificationStatus}
                    />
                  ) : (
                    <VerificationStatusBadge status="pending" />
                  )}
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="h-8 w-8 p-0" variant="ghost">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onViewDetails(contact)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onVerify(contact.contactId)}
                      >
                        Verify
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>View in Xero</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
