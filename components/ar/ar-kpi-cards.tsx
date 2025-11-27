"use client";

import { Calendar, DollarSign, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

export type ARKPIs = {
  totalOutstanding: number;
  activeDebtors: number;
  daysReceivableOutstanding: number;
  overdueInvoices?: number;
  overdueAmount?: number;
};

type ARKPICardsProps = {
  kpis: ARKPIs | null;
  isLoading?: boolean;
};

export function ARKPICards({ kpis, isLoading }: ARKPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card className="p-6" key={i}>
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="h-8 w-1/2 rounded bg-muted" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!kpis) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Total Outstanding */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-muted-foreground text-sm">
              Total Outstanding
            </p>
            <p className="mt-2 font-bold text-3xl">
              $
              {kpis.totalOutstanding.toLocaleString("en-AU", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            {kpis.overdueAmount !== undefined && kpis.overdueAmount > 0 && (
              <p className="mt-1 text-red-600 text-sm">
                $
                {kpis.overdueAmount.toLocaleString("en-AU", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                overdue
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
        </div>
      </Card>

      {/* Active Debtors */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-muted-foreground text-sm">
              Active Debtors
            </p>
            <p className="mt-2 font-bold text-3xl">{kpis.activeDebtors}</p>
            {kpis.overdueInvoices !== undefined && kpis.overdueInvoices > 0 && (
              <p className="mt-1 text-red-600 text-sm">
                {kpis.overdueInvoices} overdue{" "}
                {kpis.overdueInvoices === 1 ? "invoice" : "invoices"}
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </Card>

      {/* Days Receivable Outstanding (DRO) */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-muted-foreground text-sm">
              Days Receivable Outstanding
            </p>
            <p className="mt-2 font-bold text-3xl">
              {kpis.daysReceivableOutstanding}
            </p>
            <p className="mt-1 text-muted-foreground text-sm">
              Average days to collect
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <Calendar className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </Card>
    </div>
  );
}
