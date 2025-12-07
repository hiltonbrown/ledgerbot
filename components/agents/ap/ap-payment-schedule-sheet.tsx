"use client";

import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileText,
} from "lucide-react";
import { type ReactElement, useCallback, useEffect, useState } from "react";
import { toast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { APCashFlowChart } from "./ap-cash-flow-chart";

type Bill = {
  id: string;
  number: string;
  contactName: string;
  contactId: string;
  dueDate: string;
  amount: number;
  scheduledAmount: number;
  status: string;
  riskLevel: string;
};

type PaymentSchedule = {
  id: string;
  name: string;
  scheduledDate: string;
  totalAmount: number;
  billCount: number;
  status: string;
};

type ForecastData = {
  date: string;
  billsDue: number;
  amountDue: number;
  cumulativeAmount: number;
};

type PaymentScheduleSheetProps = {
  open: boolean;
  onClose: () => void;
  onPaymentRunCreated?: () => void;
};

export function APPaymentScheduleSheet({
  open,
  onClose,
  onPaymentRunCreated,
}: PaymentScheduleSheetProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [billsByDate, setBillsByDate] = useState<Record<string, Bill[]>>({});
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set());
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>(
    {}
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [paymentRunName, setPaymentRunName] = useState("");
  const [paymentRunNotes, setPaymentRunNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadScheduleData = useCallback(async () => {
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
        setSchedules(result.data.schedules || []);
      } else {
        console.error("Failed to load schedule:", result.error);
      }
    } catch (error) {
      console.error("Error loading schedule:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load schedule data when sheet opens
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
  }, [open, loadScheduleData]);

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

  const totalSelectedAmount = selectedBillsList.reduce((sum, bill) => {
    const remainingAmount = bill.amount - bill.scheduledAmount;
    const amount = paymentAmounts[bill.id] ?? remainingAmount;
    return sum + amount;
  }, 0);

  const handleCreatePaymentRun = async () => {
    if (selectedBills.size === 0) {
      toast({
        type: "error",
        description: "Please select at least one bill for the payment run",
      });
      return;
    }

    if (!paymentRunName.trim()) {
      toast({
        type: "error",
        description: "Please enter a name for the payment run",
      });
      return;
    }

    try {
      setIsCreating(true);

      const items = selectedBillsList.map((bill) => {
        const remainingAmount = bill.amount - bill.scheduledAmount;
        return {
          billId: bill.id,
          amount: paymentAmounts[bill.id] ?? remainingAmount,
        };
      });

      const response = await fetch("/api/agents/ap/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: paymentRunName,
          scheduledDate: selectedDate?.toISOString(),
          billIds: Array.from(selectedBills),
          items,
          notes: paymentRunNotes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          type: "success",
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
          type: "error",
          description: result.error || "An error occurred",
        });
      }
    } catch (error) {
      console.error("Error creating payment run:", error);
      toast({
        type: "error",
        description: "An error occurred while creating the payment run",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Custom calendar rendering
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const previousMonth = () => {
      setCurrentMonth(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
      setCurrentMonth(new Date(year, month + 1, 1));
    };

    const days: ReactElement[] = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div className="aspect-square p-1" key={`empty-${i}`}>
          <div className="h-full w-full" />
        </div>
      );
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toISOString().split("T")[0];
      const hasBills = billsByDate[dateKey]?.length > 0;
      const billCount = billsByDate[dateKey]?.length || 0;
      const isSelected = selectedDate?.toISOString().split("T")[0] === dateKey;
      const isToday = new Date().toDateString() === date.toDateString();

      const hasSchedules = schedules.some(
        (s) => s.scheduledDate.split("T")[0] === dateKey
      );

      days.push(
        <div className="aspect-square p-1" key={day}>
          <button
            className={`relative flex h-full w-full flex-col items-center justify-center rounded-lg transition-all ${
              isSelected
                ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2"
                : hasBills
                  ? "border-2 border-primary bg-primary/10 font-semibold hover:bg-primary/20"
                  : hasSchedules
                    ? "border-2 border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/20"
                    : isToday
                      ? "border-2 border-primary/40 bg-primary/5 hover:bg-primary/10"
                      : "hover:bg-muted"
            }`}
            onClick={() => setSelectedDate(date)}
            type="button"
          >
            <span
              className={`text-sm ${isSelected ? "font-bold" : hasBills ? "font-bold" : "font-medium"}`}
            >
              {day}
            </span>
            {hasBills && (
              <div className="absolute bottom-1 flex gap-0.5">
                {Array.from({ length: Math.min(billCount, 3) }).map((_, i) => (
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSelected ? "bg-primary-foreground" : "bg-primary"
                    }`}
                    key={`dot-${dateKey}-${i}-${billCount}`}
                  />
                ))}
              </div>
            )}
            {!hasBills && hasSchedules && (
              <div className="absolute bottom-1 flex gap-0.5">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${
                    isSelected ? "bg-primary-foreground" : "bg-orange-500"
                  }`}
                />
              </div>
            )}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">
            {currentMonth.toLocaleDateString("en-AU", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="flex gap-1">
            <Button
              className="h-8 w-8"
              onClick={previousMonth}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              className="h-8 w-8"
              onClick={nextMonth}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-lg border bg-card p-3">
          {/* Weekday Headers */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                className="flex items-center justify-center p-2 text-center font-medium text-muted-foreground text-xs"
                key={day}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">{days}</div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-lg border-2 border-primary bg-primary/10" />
            <span className="font-medium">Bills due</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-lg border-2 border-orange-500/50 bg-orange-500/10" />
            <span className="font-medium">Scheduled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-lg border-2 border-primary/40 bg-primary/5" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-lg bg-primary" />
            <span>Selected</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Sheet onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
      <SheetContent className="w-[800px] overflow-y-auto sm:max-w-[800px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-xl">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Payment Schedule & Cash Flow Forecast
          </SheetTitle>
          <SheetDescription>
            View upcoming payments, create payment runs, and analyze cash flow
            impact over the next 30 days
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Cash Flow Forecast */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-base">
              <DollarSign className="h-5 w-5 text-primary" />
              30-Day Cash Flow Forecast
            </h3>
            <APCashFlowChart data={forecast} isLoading={isLoading} />
          </div>

          <div className="grid gap-6">
            {/* Calendar Section */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-base">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Select Payment Date
              </h3>
              {renderCalendar()}
            </div>

            {/* Bills Due Section */}
            <div className="flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-base">
                  <FileText className="h-5 w-5 text-primary" />
                  Bills Due{" "}
                  {selectedDate &&
                    `on ${selectedDate.toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}`}
                </h3>
                {billsOnSelectedDate.length > 0 && (
                  <div className="flex gap-2">
                    <Button onClick={selectAllBills} size="sm" variant="ghost">
                      Select All
                    </Button>
                    <Button
                      onClick={deselectAllBills}
                      size="sm"
                      variant="ghost"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              <div className="max-h-[500px] flex-1 space-y-3 overflow-y-auto rounded-lg border bg-muted/20 p-4">
                {isLoading ? (
                  <div className="flex h-64 items-center justify-center">
                    <div className="text-center">
                      <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <p className="text-muted-foreground text-sm">
                        Loading bills...
                      </p>
                    </div>
                  </div>
                ) : billsOnSelectedDate.length === 0 ? (
                  <div className="flex h-64 items-center justify-center">
                    <div className="text-center">
                      <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                      <h4 className="mb-1 font-medium">No bills due</h4>
                      <p className="text-muted-foreground text-sm">
                        Select a different date to view bills
                      </p>
                    </div>
                  </div>
                ) : (
                  billsOnSelectedDate.map((bill) => {
                    const isSelected = selectedBills.has(bill.id);
                    const remainingAmount = bill.amount - bill.scheduledAmount;
                    const paymentAmount =
                      paymentAmounts[bill.id] ?? remainingAmount;

                    return (
                      <Card
                        className={`cursor-pointer p-4 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "hover:border-muted-foreground/30 hover:shadow-sm"
                        }`}
                        key={bill.id}
                        onClick={() => toggleBillSelection(bill.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            className="mt-0.5"
                            onCheckedChange={() => toggleBillSelection(bill.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <div className="mb-1 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {bill.contactName}
                                </span>
                                {(bill.riskLevel === "high" ||
                                  bill.riskLevel === "critical") && (
                                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                                )}
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-lg">
                                  $
                                  {bill.amount.toLocaleString("en-AU", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                                {bill.scheduledAmount > 0 && (
                                  <div className="text-muted-foreground text-xs">
                                    Scheduled: $
                                    {bill.scheduledAmount.toLocaleString(
                                      "en-AU",
                                      {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground text-sm">
                                Invoice #{bill.number}
                              </span>
                              <Badge className="text-xs" variant="outline">
                                {bill.status}
                              </Badge>
                            </div>

                            {isSelected && (
                              <div className="mt-3">
                                <Label
                                  className="text-xs"
                                  htmlFor={`amount-${bill.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Payment Amount
                                </Label>
                                <div className="relative mt-1">
                                  <span className="absolute top-2.5 left-2 text-muted-foreground text-sm">
                                    $
                                  </span>
                                  <Input
                                    className="h-9 pl-6"
                                    id={`amount-${bill.id}`}
                                    max={remainingAmount}
                                    min={0.01}
                                    onChange={(e) => {
                                      const val = Number.parseFloat(
                                        e.target.value
                                      );
                                      if (!Number.isNaN(val)) {
                                        setPaymentAmounts((prev) => ({
                                          ...prev,
                                          [bill.id]: val,
                                        }));
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    step="0.01"
                                    type="number"
                                    value={paymentAmount}
                                  />
                                </div>
                                <div className="mt-1 flex justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    Remaining: $
                                    {remainingAmount.toLocaleString("en-AU", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Selected Bills Summary */}
              {selectedBills.size > 0 && (
                <Card className="mt-4 border-primary/50 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">
                          {selectedBills.size}{" "}
                          {selectedBills.size === 1 ? "bill" : "bills"} selected
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Ready for payment run
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs">
                        Total Amount
                      </p>
                      <p className="font-bold text-2xl">
                        $
                        {totalSelectedAmount.toLocaleString("en-AU", {
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
            <Card className="border-primary bg-primary/5 p-6">
              <h4 className="mb-4 flex items-center gap-2 font-semibold text-lg">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Create Payment Run
              </h4>
              <div className="space-y-4">
                <div>
                  <Label className="font-medium" htmlFor="runName">
                    Payment Run Name *
                  </Label>
                  <Input
                    className="mt-1.5"
                    id="runName"
                    onChange={(e) => setPaymentRunName(e.target.value)}
                    placeholder="e.g., Weekly Payment Run - Week 1"
                    value={paymentRunName}
                  />
                </div>
                <div>
                  <Label className="font-medium" htmlFor="runNotes">
                    Notes (Optional)
                  </Label>
                  <Textarea
                    className="mt-1.5"
                    id="runNotes"
                    onChange={(e) => setPaymentRunNotes(e.target.value)}
                    placeholder="Add any notes about this payment run..."
                    rows={3}
                    value={paymentRunNotes}
                  />
                </div>
              </div>
            </Card>
          )}

          <div className="flex justify-end gap-2 pb-6">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
            {selectedBills.size > 0 && !showCreateForm && (
              <Button onClick={() => setShowCreateForm(true)}>
                Create Payment Run ({selectedBills.size})
              </Button>
            )}
            {showCreateForm && (
              <Button disabled={isCreating} onClick={handleCreatePaymentRun}>
                {isCreating ? "Creating..." : "Confirm Payment Run"}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
