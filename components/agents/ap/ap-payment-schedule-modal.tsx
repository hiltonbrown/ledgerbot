"use client";

import { useState } from "react";
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
import { Calendar as CalendarIcon, DollarSign } from "lucide-react";

interface PaymentScheduleModalProps {
  open: boolean;
  onClose: () => void;
}

export function APPaymentScheduleModal({
  open,
  onClose,
}: PaymentScheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Payment Schedule
          </DialogTitle>
          <DialogDescription>
            View and manage scheduled payments, cash flow projections, and payment runs
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Calendar */}
          <div>
            <h4 className="mb-4 font-medium text-sm">Select Payment Date</h4>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </div>

          {/* Scheduled Payments */}
          <div>
            <h4 className="mb-4 font-medium text-sm">
              Payments Due {selectedDate ? `on ${selectedDate.toLocaleDateString("en-AU")}` : ""}
            </h4>

            <div className="space-y-3">
              {/* Placeholder for payment items */}
              <Card className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">Example Supplier Pty Ltd</span>
                  <Badge variant="outline">Due</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Invoice #12345</span>
                  <span className="font-semibold">$2,500.00</span>
                </div>
              </Card>

              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <p>No payments scheduled for this date</p>
                <p className="mt-1 text-sm">Select a different date to view scheduled payments</p>
              </div>
            </div>

            {/* Summary */}
            <Card className="mt-6 bg-muted p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Total for Selected Date</span>
                </div>
                <span className="font-bold text-lg">$0.00</span>
              </div>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button disabled>
            Create Payment Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
