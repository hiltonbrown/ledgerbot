"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCustomerInvoiceDetails } from "@/lib/actions/ar";

interface CustomerDetailsSheetProps {
  contactId: string | null;
  customerName: string;
  totalOutstanding: number;
  riskScore: number;
  onOpenChange: (open: boolean) => void;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  amount: number;
  amountOutstanding: number;
  status: string;
  ageingBucket: string | null;
}

export function CustomerDetailsSheet({
  contactId,
  customerName,
  totalOutstanding,
  riskScore,
  onOpenChange,
}: CustomerDetailsSheetProps) {
  const [invoices, setInvoices] = useState<InvoiceDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (contactId) {
      setLoading(true);
      getCustomerInvoiceDetails(contactId)
        .then(setInvoices)
        .finally(() => setLoading(false));
    }
  }, [contactId]);

  const handleStartChat = () => {
    if (!contactId) return;

    const params = new URLSearchParams({
      context: "ar_followup",
      customerId: contactId,
      outstanding: totalOutstanding.toString(),
      riskScore: riskScore.toString(),
    });

    router.push(`/chat/new?${params.toString()}`);
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={!!contactId}>
      <SheetContent className="w-[800px] sm:max-w-[800px]">
        <SheetHeader>
          <SheetTitle>{customerName}</SheetTitle>
          <SheetDescription>
            Total Outstanding: ${totalOutstanding.toFixed(2)} | Risk Score:{" "}
            {riskScore.toFixed(2)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <div className="mb-4 flex justify-end">
            <Button onClick={handleStartChat}>Start Follow-Up Chat</Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bucket</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell className="h-24 text-center" colSpan={7}>
                      Loading invoices...
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-24 text-center" colSpan={7}>
                      No invoices found.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.invoiceNumber}</TableCell>
                      <TableCell>
                        {new Date(inv.issueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${inv.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${inv.amountOutstanding.toFixed(2)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {inv.status.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>{inv.ageingBucket || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
