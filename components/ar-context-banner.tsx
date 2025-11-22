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

  // Canonical risk calculation function
  const getRiskLevel = (
    daysOverdue: number
  ): "low" | "medium" | "high" | "critical" => {
    if (daysOverdue <= 30) {
      return "low";
    }
    if (daysOverdue <= 60) {
      return "medium";
    }
    if (daysOverdue <= 90) {
      return "high";
    }
    return "critical";
  };

  // Mapping from risk level to label and badge variant
  const riskLevelMap: Record<
    "low" | "medium" | "high" | "critical",
    { label: string; variant: "secondary" | "default" | "destructive" }
  > = {
    low: { label: "Low Risk", variant: "secondary" },
    medium: { label: "Medium Risk", variant: "default" },
    high: { label: "High Risk", variant: "destructive" },
    critical: { label: "Critical Risk", variant: "destructive" },
  };

  const riskLevel = getRiskLevel(summary.oldestInvoiceDays);
  const risk = riskLevelMap[riskLevel];
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
            <Button
              aria-label="Close AR context banner"
              onClick={onClose}
              size="sm"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
