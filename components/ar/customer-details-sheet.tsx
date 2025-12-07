"use client";

import {
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { FollowUpTone } from "@/lib/logic/ar-chat";

type CustomerDetailsSheetProps = {
  contactId: string | null;
  customerName: string;
  totalOutstanding: number;
  riskScore: number;
  onOpenChange: (open: boolean) => void;
};

type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  amount: number;
  amountOutstanding: number;
  status: string;
  ageingBucket: string | null;
};

type FollowUpPreview = {
  contextId: string;
  customerName: string;
  totalOutstanding: number;
  riskScore: number;
  invoiceCount: number;
  oldestOverdueDays: number;
};

type SuggestedAction = {
  type: "email" | "call" | "sms";
  tone: FollowUpTone;
  description: string;
};

export function CustomerDetailsSheet({
  contactId,
  customerName,
  totalOutstanding,
  riskScore,
  onOpenChange,
}: CustomerDetailsSheetProps) {
  const [invoices, setInvoices] = useState<InvoiceDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [followUpPreview, setFollowUpPreview] =
    useState<FollowUpPreview | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>(
    []
  );
  const [isPreparing, setIsPreparing] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (contactId) {
      setLoading(true);
      getCustomerInvoiceDetails(contactId)
        .then(setInvoices)
        .finally(() => setLoading(false));
    }
  }, [contactId]);

  const prepareFollowUp = async (followUpType?: FollowUpTone) => {
    if (!contactId) {
      return;
    }

    setIsPreparing(true);
    try {
      const response = await fetch("/api/agents/ar/followup/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, followUpType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[CustomerDetailsSheet] API error response:", errorData);
        throw new Error(
          errorData.details || errorData.error || "Failed to prepare context"
        );
      }

      const data = await response.json();
      console.log("[CustomerDetailsSheet] Received data:", data);

      // Store the contextId with the preview data
      const previewWithContext = {
        ...data.preview,
        contextId: data.contextId,
      };

      console.log(
        "[CustomerDetailsSheet] Setting preview:",
        previewWithContext
      );
      setFollowUpPreview(previewWithContext);
      setSuggestedActions(data.suggestedActions);
    } catch (error) {
      console.error(
        "[CustomerDetailsSheet] Failed to prepare follow-up:",
        error
      );
      console.error("[CustomerDetailsSheet] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // TODO: Show error toast
    } finally {
      setIsPreparing(false);
    }
  };

  const createFollowUpChat = async () => {
    if (!followUpPreview || !selectedAction) {
      return;
    }

    setIsCreating(true);
    try {
      const [actionType] = selectedAction.split("-") as [
        "email" | "call" | "sms",
        string,
      ];

      const requestBody = {
        contextId: followUpPreview.contextId,
        actionType,
      };

      console.log("[CustomerDetailsSheet] Creating chat with:", requestBody);

      const response = await fetch("/api/agents/ar/followup/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[CustomerDetailsSheet] Create API error:", errorData);
        throw new Error(
          errorData.details || errorData.error || "Failed to create chat"
        );
      }

      const { chatId, initialMessage } = await response.json();
      console.log("[CustomerDetailsSheet] Chat created:", chatId);
      console.log("[CustomerDetailsSheet] Initial message:", initialMessage);

      // Navigate to the chat page with the chat ID and initial message
      // The chat page supports autoSendInput which will send the message automatically
      const params = new URLSearchParams({
        autoSend: initialMessage,
      });
      router.push(`/chat/${chatId}?${params.toString()}`);
    } catch (error) {
      console.error(
        "[CustomerDetailsSheet] Failed to create follow-up chat:",
        error
      );
      console.error("[CustomerDetailsSheet] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // TODO: Show error toast
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={!!contactId}>
      <SheetContent className="w-[800px] sm:max-w-[800px]">
        <SheetHeader>
          <SheetTitle>{customerName}</SheetTitle>
          <SheetDescription>
            Outstanding: ${totalOutstanding.toFixed(2)} | Risk Score:{" "}
            {riskScore.toFixed(2)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Follow-up Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Start Follow-up</h3>
              {!followUpPreview && (
                <Button
                  disabled={isPreparing}
                  onClick={() => prepareFollowUp()}
                  size="sm"
                  variant="outline"
                >
                  {isPreparing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    "Prepare Follow-up"
                  )}
                </Button>
              )}
            </div>

            {followUpPreview && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Outstanding:</span> $
                    {followUpPreview.totalOutstanding.toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Invoices:</span>{" "}
                    {followUpPreview.invoiceCount}
                  </div>
                  <div>
                    <span className="font-medium">Risk Score:</span>{" "}
                    {followUpPreview.riskScore.toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Oldest Overdue:</span>{" "}
                    {followUpPreview.oldestOverdueDays} days
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-sm">
                    Choose follow-up type:
                  </div>
                  <Select
                    onValueChange={setSelectedAction}
                    value={selectedAction || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an action..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suggestedActions.map((action, index) => (
                        <SelectItem
                          key={`${action.type}-${action.tone}-${index}`}
                          value={`${action.type}-${action.tone}`}
                        >
                          <div className="flex items-center gap-2">
                            {action.type === "email" && (
                              <Mail className="h-4 w-4" />
                            )}
                            {action.type === "call" && (
                              <Phone className="h-4 w-4" />
                            )}
                            {action.type === "sms" && (
                              <MessageSquare className="h-4 w-4" />
                            )}
                            <span>{action.description}</span>
                            <Badge className="ml-auto" variant="outline">
                              {action.tone}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full"
                  disabled={!selectedAction || isCreating}
                  onClick={createFollowUpChat}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Chat...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Start Follow-up Chat
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Invoice Details Table */}
          <div>
            <h3 className="mb-4 font-semibold text-lg">Invoice Details</h3>
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
