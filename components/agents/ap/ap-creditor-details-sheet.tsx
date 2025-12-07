"use client";

import {
  AlertTriangle,
  Banknote,
  CheckCircle,
  FileText,
  Loader2,
  MessageCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { CreditorDetailsData } from "./ap-creditor-details";

type APCreditorDetailsSheetProps = {
  creditorId: string | null;
  creditorName: string;
  onOpenChange: (open: boolean) => void;
};

export function APCreditorDetailsSheet({
  creditorId,
  creditorName,
  onOpenChange,
}: APCreditorDetailsSheetProps) {
  const [data, setData] = useState<CreditorDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingReview, setIsStartingReview] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (creditorId) {
      setIsLoading(true);
      fetch(`/api/agents/ap/creditors/${creditorId}/commentary`)
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            setData(result.data);
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setData(null);
    }
  }, [creditorId]);

  const handleStartReview = async () => {
    if (!creditorId) return;
    setIsStartingReview(true);
    try {
      // 1. Prepare Context
      const prepareRes = await fetch("/api/agents/ap/review/prepare", {
        method: "POST",
        body: JSON.stringify({ creditorId }),
      });
      const prepareData = await prepareRes.json();
      if (!prepareData.contextId) throw new Error("Failed to prepare context");

      // 2. Create Chat
      const createRes = await fetch("/api/agents/ap/review/create", {
        method: "POST",
        body: JSON.stringify({ contextId: prepareData.contextId }),
      });
      const createData = await createRes.json();
      if (!createData.chatId) throw new Error("Failed to create chat");

      // 3. Navigate
      const params = new URLSearchParams({
        autoSend: createData.initialMessage,
      });
      router.push(`/chat/${createData.chatId}?${params.toString()}`);
    } catch (error) {
      console.error("Failed to start review", error);
    } finally {
      setIsStartingReview(false);
    }
  };

  const {
    bills,

    paidBills = [],

    bankChanges,

    commentary,
  } = data || {
    bills: [],

    paidBills: [],

    bankChanges: [],

    statistics: {
      totalOutstanding: 0,

      totalOverdue: 0,

      overdueBills: 0,

      avgDaysToPayment: 0,
    },

    commentary: "",
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={!!creditorId}>
      <SheetContent className="w-[800px] overflow-y-auto sm:max-w-[800px]">
        <SheetHeader className="mb-6">
          <SheetTitle>{creditorName}</SheetTitle>

          <SheetDescription>
            Review supplier details and invoices.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />

            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Action Section */}

            <Card className="border-primary/20 bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Review with AI Agent</h4>

                  <p className="text-muted-foreground text-sm">
                    Discuss these bills, check for fraud, and plan payments.
                  </p>
                </div>

                <Button disabled={isStartingReview} onClick={handleStartReview}>
                  {isStartingReview ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Start Review
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Summary */}

            {commentary && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-sm">
                  <FileText className="h-4 w-4" />
                  Summary
                </h4>

                <Card className="p-4">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {commentary}
                  </p>
                </Card>
              </div>
            )}

            {/* Unpaid Invoices */}

            <div>
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-sm">
                <AlertTriangle className="h-4 w-4" />
                Unpaid Invoices ({bills.length})
              </h4>

              <Card className="p-4">
                {bills.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm">
                    No unpaid invoices
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
                              {new Date(bill.dueDate).toLocaleDateString(
                                "en-AU"
                              )}
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

            {/* Paid Invoices */}

            <div>
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-sm">
                <CheckCircle className="h-4 w-4" />
                Paid Invoices ({paidBills.length})
              </h4>

              <Card className="p-4">
                {paidBills.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm">
                    No recently paid invoices
                  </p>
                ) : (
                  <div className="space-y-3">
                    {paidBills.map((bill) => (
                      <div
                        className="flex items-center justify-between border-b pb-2 last:border-0"
                        key={bill.id}
                      >
                        <div>
                          <p className="font-medium text-sm">{bill.number}</p>

                          <p className="text-muted-foreground text-xs">
                            Issued{" "}
                            {new Date(bill.issueDate).toLocaleDateString(
                              "en-AU"
                            )}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold text-green-600 text-sm">
                            $
                            {Number.parseFloat(bill.total).toLocaleString(
                              "en-AU"
                            )}
                          </p>

                          <Badge className="text-xs" variant="outline">
                            Paid
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Bank Changes */}

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
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
