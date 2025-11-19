"use client";

import { DollarSign, FileText, User, X } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ArContextBannerProps = {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  summary: {
    totalOutstanding: number;
    invoiceCount: number;
    oldestInvoiceDays: number;
  };
  onClose?: () => void;
};

export function ArContextBanner({
  customer,
  summary,
  onClose,
}: ArContextBannerProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const getRiskBadge = (daysOverdue: number) => {
    if (daysOverdue <= 30) {
      return { label: "Low Risk", variant: "secondary" as const };
    }
    if (daysOverdue <= 60) {
      return { label: "Medium Risk", variant: "default" as const };
    }
    if (daysOverdue <= 90) {
      return { label: "High Risk", variant: "destructive" as const };
    }
    return { label: "Critical Risk", variant: "destructive" as const };
  };

  const risk = getRiskBadge(summary.oldestInvoiceDays);

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="flex items-center justify-between py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <div>
              <p className="font-semibold text-sm">{customer.name}</p>
              <p className="text-muted-foreground text-xs">AR Context Active</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-semibold text-sm">
                {formatCurrency(summary.totalOutstanding)}
              </p>
              <p className="text-muted-foreground text-xs">Outstanding</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-semibold text-sm">
                {summary.invoiceCount} invoice
                {summary.invoiceCount !== 1 ? "s" : ""}
              </p>
              <p className="text-muted-foreground text-xs">
                {summary.oldestInvoiceDays} days overdue
              </p>
            </div>
          </div>

          <Badge variant={risk.variant}>{risk.label}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/agents/ar/customer/${customer.id}`}>
            <Button size="sm" variant="outline">
              View Details
            </Button>
          </Link>
          {onClose && (
            <Button onClick={onClose} size="sm" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
