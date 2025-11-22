"use client";

import {
  AlertTriangle,
  Banknote,
  CheckCircle,
  FileText,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApBankChange, ApBill, ApPayment } from "@/lib/db/schema/ap";

export type CreditorDetailsData = {
  bills: ApBill[];
  recentPayments: (ApPayment & { billNumber?: string })[];
  bankChanges: ApBankChange[];
  statistics: {
    totalOutstanding: number;
    totalOverdue: number;
    overdueBills: number;
    avgDaysToPayment: number;
  };
  commentary: string;
};

type APCreditorDetailsProps = {
  data: CreditorDetailsData | null;
  isLoading: boolean;
};

export function APCreditorDetails({ data, isLoading }: APCreditorDetailsProps) {
  if (isLoading) {
    return (
      <div className="border-t bg-muted/30 p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="border-t bg-muted/30 p-6">
        <p className="text-center text-muted-foreground">
          Failed to load creditor details
        </p>
      </div>
    );
  }

  const { bills, recentPayments, bankChanges, statistics, commentary } = data;

  // Parse commentary into sections
  const commentarySections = commentary.split("\n\n").filter((s) => s.trim());

  return (
    <div className="border-t bg-muted/30 p-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: AI Commentary */}
        <div>
          <h4 className="mb-4 flex items-center gap-2 font-semibold text-base">
            <FileText className="h-4 w-4" />
            AI Risk Analysis
          </h4>
          <Card className="p-4">
            <div className="prose prose-sm max-w-none">
              {commentarySections.map((section, idx) => {
                // Check if section is a heading (starts with **text**)
                const headingMatch = section.match(/^\*\*(.*?)\*\*/);
                if (headingMatch) {
                  return (
                    <div className="mb-3" key={idx}>
                      <h5 className="mb-2 font-semibold text-sm">
                        {headingMatch[1]}
                      </h5>
                      <p className="text-muted-foreground text-sm">
                        {section.replace(/^\*\*.*?\*\*\s*/, "")}
                      </p>
                    </div>
                  );
                }
                return (
                  <p className="mb-3 text-muted-foreground text-sm" key={idx}>
                    {section}
                  </p>
                );
              })}
            </div>
          </Card>

          {/* Payment Statistics */}
          <div className="mt-4">
            <h4 className="mb-3 font-semibold text-sm">Payment Statistics</h4>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    Avg. Payment Delay
                  </span>
                  {statistics.avgDaysToPayment > 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="mt-1 font-semibold text-lg">
                  {Math.abs(statistics.avgDaysToPayment)} days
                </p>
                <p className="text-muted-foreground text-xs">
                  {statistics.avgDaysToPayment > 0
                    ? "Paid late"
                    : statistics.avgDaysToPayment < 0
                      ? "Paid early"
                      : "On time"}
                </p>
              </Card>

              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    Overdue Bills
                  </span>
                  {statistics.overdueBills > 0 ? (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="mt-1 font-semibold text-lg">
                  {statistics.overdueBills}
                </p>
                {statistics.totalOverdue > 0 && (
                  <p className="text-red-600 text-xs">
                    $
                    {statistics.totalOverdue.toLocaleString("en-AU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                )}
              </Card>
            </div>
          </div>
        </div>

        {/* Right Column: Transaction Details */}
        <div className="space-y-4">
          {/* Outstanding Bills */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 font-semibold text-sm">
              <FileText className="h-4 w-4" />
              Outstanding Bills ({bills.length})
            </h4>
            <Card className="p-4">
              {bills.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm">
                  No outstanding bills
                </p>
              ) : (
                <div className="space-y-3">
                  {bills.map((bill) => {
                    const amountDue = (
                      Number.parseFloat(bill.total) -
                      Number.parseFloat(bill.amountPaid)
                    ).toFixed(2);
                    const daysOverdue = Math.floor(
                      (Date.now() - new Date(bill.dueDate).getTime()) /
                        (1000 * 60 * 60 * 24)
                    );

                    return (
                      <div
                        className="flex items-center justify-between border-b pb-2 last:border-0"
                        key={bill.id}
                      >
                        <div>
                          <p className="font-medium text-sm">{bill.number}</p>
                          <p className="text-muted-foreground text-xs">
                            Due{" "}
                            {new Date(bill.dueDate).toLocaleDateString("en-AU")}
                            {daysOverdue > 0 && (
                              <span className="ml-1 text-red-600">
                                ({daysOverdue} days overdue)
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">
                            $
                            {Number.parseFloat(amountDue).toLocaleString(
                              "en-AU"
                            )}
                          </p>
                          <Badge
                            className="text-xs"
                            variant={
                              daysOverdue > 0 ? "destructive" : "outline"
                            }
                          >
                            {bill.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Recent Payments */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 font-semibold text-sm">
              <CheckCircle className="h-4 w-4" />
              Recent Payments ({recentPayments.length})
            </h4>
            <Card className="p-4">
              {recentPayments.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm">
                  No recent payments
                </p>
              ) : (
                <div className="space-y-3">
                  {recentPayments.map((payment) => (
                    <div
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                      key={payment.id}
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {payment.billNumber || "Unknown"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(payment.paidAt).toLocaleDateString("en-AU")}
                          {payment.method && ` • ${payment.method}`}
                        </p>
                      </div>
                      <p className="font-semibold text-green-600 text-sm">
                        $
                        {Number.parseFloat(
                          payment.amount.toString()
                        ).toLocaleString("en-AU")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Bank Account Changes */}
          {bankChanges.length > 0 && (
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-sm">
                <Banknote className="h-4 w-4" />
                Bank Account Changes ({bankChanges.length})
              </h4>
              <Card className="border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
                <div className="space-y-3">
                  {bankChanges.map((change) => (
                    <div
                      className="border-orange-200 border-b pb-3 last:border-0 dark:border-orange-800"
                      key={change.id}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {new Date(change.detectedAt).toLocaleDateString(
                            "en-AU"
                          )}
                        </span>
                        <Badge
                          className="text-xs"
                          variant={
                            change.isVerified ? "default" : "destructive"
                          }
                        >
                          {change.isVerified ? "Verified" : "Unverified"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Old Account</p>
                          <p className="font-mono">
                            {change.oldBsb || "N/A"}-
                            {change.oldAccountNumber || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">New Account</p>
                          <p className="font-mono">
                            {change.newBsb || "N/A"}-
                            {change.newAccountNumber || "N/A"}
                          </p>
                        </div>
                      </div>
                      {change.notes && (
                        <p className="mt-2 text-muted-foreground text-xs">
                          {change.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
