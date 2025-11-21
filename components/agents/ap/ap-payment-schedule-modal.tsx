"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, DollarSign, AlertTriangle, CheckCircle2 } from "lucide-react";
import { APCashFlowChart } from "./ap-cash-flow-chart";
import { useToast } from "@/hooks/use-toast";

interface Bill {
  id: string;
  number: string;
  contactName: string;
  contactId: string;
  dueDate: string;
  amount: number;
  status: string;
  riskLevel: string;
}

interface ForecastData {
  date: string;
  billsDue: number;
  amountDue: number;
  cumulativeAmount: number;
}

interface PaymentScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onPaymentRunCreated?: () => void;
}

export function APPaymentScheduleModal({
  open,
  onClose,
  onPaymentRunCreated,
}: PaymentScheduleModalProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [billsByDate, setBillsByDate] = useState<Record<string, Bill[]>>({});
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [paymentRunName, setPaymentRunName] = useState("");
  const [paymentRunNotes, setPaymentRunNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Load schedule data when modal opens
  useEffect(() => {
    if (open) {
      loadScheduleData();
    } else {
      // Reset state when closing
      setSelectedBills(new Set());
      setShowCreateForm(false);
      setPaymentRunName("");
      setPaymentRunNotes("");
    }
  }, [open]);

  const loadScheduleData = async () => {
    try {
      setIsLoading(true);

      // Get 30 days forward from today
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const response = await fetch(
        `/api/agents/ap/schedule?startDate=${startDate.toISOString().split("T")[0]}&endDate=${endDate.toISOString().split("T")[0]}`
      );

      const result = await response.json();

      if (result.success && result.data) {
        setBillsByDate(result.data.billsByDate);
        setForecast(result.data.forecast);
      } else {
        console.error("Failed to load schedule:", result.error);
      }
    } catch (error) {
      console.error("Error loading schedule:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDateKey = selectedDate
    ? selectedDate.toISOString().split("T")[0]
    : "";
  const billsOnSelectedDate = billsByDate[selectedDateKey] || [];

  const toggleBillSelection = (billId: string) => {
    const newSelected = new Set(selectedBills);
    if (newSelected.has(billId)) {
      newSelected.delete(billId);
    } else {
      newSelected.add(billId);
    }
    setSelectedBills(newSelected);
  };

  const selectAllBills = () => {
    const allBillIds = billsOnSelectedDate.map((b) => b.id);
    setSelectedBills(new Set(allBillIds));
  };

  const deselectAllBills = () => {
    setSelectedBills(new Set());
  };

  const selectedBillsList = billsOnSelectedDate.filter((b) =>
    selectedBills.has(b.id)
  );
  const totalSelectedAmount = selectedBillsList.reduce(
    (sum, bill) => sum + bill.amount,
    0
  );

  const handleCreatePaymentRun = async () => {
    if (selectedBills.size === 0) {
      toast({
        title: "No bills selected",
        description: "Please select at least one bill for the payment run",
        variant: "destructive",
      });
      return;
    }

    if (!paymentRunName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the payment run",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);

      const response = await fetch("/api/agents/ap/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: paymentRunName,
          scheduledDate: selectedDate?.toISOString(),
          billIds: Array.from(selectedBills),
          notes: paymentRunNotes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Payment run created",
          description: `Successfully created payment run with ${selectedBills.size} bills`,
        });

        setShowCreateForm(false);
        setPaymentRunName("");
        setPaymentRunNotes("");
        setSelectedBills(new Set());

        if (onPaymentRunCreated) {
          onPaymentRunCreated();
        }
      } else {
        toast({
          title: "Failed to create payment run",
          description: result.error || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating payment run:", error);
      toast({
        title: "Error",
        description: "An error occurred while creating the payment run",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Get dates with bills for calendar highlighting
  const datesWithBills = Object.keys(billsByDate).map((dateStr) => new Date(dateStr));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Payment Schedule & Cash Flow Forecast
          </DialogTitle>
          <DialogDescription>
            View upcoming payments, create payment runs, and analyze cash flow impact
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cash Flow Forecast */}
          <APCashFlowChart data={forecast} isLoading={isLoading} />

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Calendar */}
            <div>
              <h4 className="mb-4 font-medium text-sm">Select Payment Date</h4>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                modifiers={{
                  hasBills: datesWithBills,
                }}
                modifiersStyles={{
                  hasBills: {
                    fontWeight: "bold",
                    textDecoration: "underline",
                  },
                }}
              />
              <p className="mt-2 text-muted-foreground text-xs">
                Dates with underlined numbers have bills due
              </p>
            </div>

            {/* Bills Due on Selected Date */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-medium text-sm">
                  Bills Due {selectedDate ? `on ${selectedDate.toLocaleDateString("en-AU")}` : ""}
                </h4>
                {billsOnSelectedDate.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllBills}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={deselectAllBills}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {isLoading ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    <p>Loading bills...</p>
                  </div>
                ) : billsOnSelectedDate.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    <p>No bills due on this date</p>
                    <p className="mt-1 text-sm">Select a different date to view bills</p>
                  </div>
                ) : (
                  billsOnSelectedDate.map((bill) => (
                    <Card
                      key={bill.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedBills.has(bill.id)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleBillSelection(bill.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedBills.has(bill.id)}
                            onCheckedChange={() => toggleBillSelection(bill.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{bill.contactName}</span>
                              {bill.riskLevel === "high" || bill.riskLevel === "critical" ? (
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                              ) : null}
                            </div>
                            <p className="text-muted-foreground text-sm">
                              Invoice #{bill.number}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            ${bill.amount.toLocaleString("en-AU", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {bill.status}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {/* Selected Bills Summary */}
              {selectedBills.size > 0 && (
                <Card className="mt-4 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span className="font-medium">
                        {selectedBills.size} {selectedBills.size === 1 ? "bill" : "bills"} selected
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs">Total Amount</p>
                      <p className="font-bold text-lg">
                        ${totalSelectedAmount.toLocaleString("en-AU", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Payment Run Creation Form */}
          {showCreateForm && selectedBills.size > 0 && (
            <Card className="border-primary p-4">
              <h4 className="mb-4 font-semibold">Create Payment Run</h4>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="runName">Payment Run Name *</Label>
                  <Input
                    id="runName"
                    placeholder="e.g., Weekly Payment Run - Week 1"
                    value={paymentRunName}
                    onChange={(e) => setPaymentRunName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="runNotes">Notes (Optional)</Label>
                  <Textarea
                    id="runNotes"
                    placeholder="Add any notes about this payment run..."
                    value={paymentRunNotes}
                    onChange={(e) => setPaymentRunNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {selectedBills.size > 0 && !showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)}>
              Create Payment Run ({selectedBills.size})
            </Button>
          )}
          {showCreateForm && (
            <Button onClick={handleCreatePaymentRun} disabled={isCreating}>
              {isCreating ? "Creating..." : "Confirm Payment Run"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
