"use client";

import {
  ArrowRight,
  CheckCircle2,
  Link2,
  ListChecks,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

const reconciliationBatches = [
  {
    id: "Nightly Sync",
    processed: 412,
    matched: 397,
    autoApproved: 361,
    lastRun: "12 Nov, 02:00",
  },
  {
    id: "Payroll Clearing",
    processed: 58,
    matched: 55,
    autoApproved: 40,
    lastRun: "11 Nov, 18:45",
  },
  {
    id: "Stripe Payouts",
    processed: 134,
    matched: 129,
    autoApproved: 102,
    lastRun: "11 Nov, 15:10",
  },
];

const exceptionQueue = [
  {
    id: "BANK-99102",
    description: "Vendor payment missing ledger entry",
    amount: "$2,450.00",
    suggestedAction: "Create bill from receipt",
    severity: "high" as const,
  },
  {
    id: "BANK-99103",
    description: "Stripe fee variance exceeds tolerance",
    amount: "$48.17",
    suggestedAction: "Apply FX adjustment",
    severity: "medium" as const,
  },
  {
    id: "BANK-99111",
    description: "Duplicated payroll batch detected",
    amount: "$18,240.00",
    suggestedAction: "Ignore duplicate ledger entry",
    severity: "high" as const,
  },
  {
    id: "BANK-99115",
    description: "Interest income classification pending",
    amount: "$132.54",
    suggestedAction: "Categorise as Other Income",
    severity: "low" as const,
  },
];

export default function ReconciliationsAgentPage() {
  const [autoApprove, setAutoApprove] = useState(true);
  const [createAdjustments, setCreateAdjustments] = useState(false);

  const aggregateStats = useMemo(() => {
    const totals = reconciliationBatches.reduce(
      (acc, batch) => {
        acc.processed += batch.processed;
        acc.matched += batch.matched;
        acc.autoApproved += batch.autoApproved;
        return acc;
      },
      { processed: 0, matched: 0, autoApproved: 0 }
    );
    return {
      matchRate: Number(((totals.matched / totals.processed) * 100).toFixed(1)),
      autoApproveRate: Number(
        ((totals.autoApproved / totals.matched) * 100).toFixed(1)
      ),
    };
  }, []);

  return (
    <div className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="h-5 w-5 text-primary" />
              Bank feed synchronisation
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Monitor nightly batch performance, approval thresholds and
              residual items needing human eyes.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">
                  Match rate
                </p>
                <p className="font-semibold text-2xl">
                  {aggregateStats.matchRate}%
                </p>
                <p className="text-muted-foreground text-xs">Goal &gt; 95%</p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">
                  Auto-approved
                </p>
                <p className="font-semibold text-2xl">
                  {aggregateStats.autoApproveRate}%
                </p>
                <p className="text-muted-foreground text-xs">
                  Of matched transactions
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">
                  Exceptions
                </p>
                <p className="font-semibold text-2xl">
                  {exceptionQueue.length}
                </p>
                <p className="text-muted-foreground text-xs">Awaiting review</p>
              </div>
            </div>
            <div className="rounded-xl border bg-muted/40">
              <div className="grid gap-4 p-4 text-muted-foreground text-xs uppercase md:grid-cols-4">
                <span>Batch</span>
                <span>Processed</span>
                <span>Matched</span>
                <span>Auto-approved</span>
              </div>
              <div className="divide-y">
                {reconciliationBatches.map((batch) => (
                  <div className="grid gap-4 p-4 md:grid-cols-4" key={batch.id}>
                    <div>
                      <p className="font-medium text-sm">{batch.id}</p>
                      <p className="text-muted-foreground text-xs">
                        Last run {batch.lastRun}
                      </p>
                    </div>
                    <p className="font-medium text-sm">
                      {batch.processed.toLocaleString()}
                    </p>
                    <p className="font-medium text-sm">
                      {batch.matched.toLocaleString()}
                    </p>
                    <p className="font-medium text-sm">
                      {batch.autoApproved.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Automation levers</CardTitle>
            <p className="text-muted-foreground text-sm">
              Adjust tolerances before the agent syncs changes back to the
              ledger.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-4">
              <div>
                <p className="font-medium text-sm">
                  Auto-approve perfect matches
                </p>
                <p className="text-muted-foreground text-xs">
                  Instantly approve when bank description and ledger memo are
                  identical.
                </p>
              </div>
              <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
            </div>
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-4">
              <div>
                <p className="font-medium text-sm">
                  Create proposed adjustments
                </p>
                <p className="text-muted-foreground text-xs">
                  Draft journals for FX fees, rounding differences and delayed
                  payouts.
                </p>
              </div>
              <Switch
                checked={createAdjustments}
                onCheckedChange={setCreateAdjustments}
              />
            </div>
            <div className="rounded-md border border-primary/40 border-dashed bg-primary/5 p-4 text-sm">
              <p className="font-semibold">Tip: connect compliance agent</p>
              <p className="text-muted-foreground text-xs">
                Route payroll and super transactions directly into the
                compliance queue for second layer review.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-1">
          <CardTitle className="text-lg">Exception queue</CardTitle>
          <p className="text-muted-foreground text-sm">
            Prioritise unresolved matches, apply suggested actions and escalate
            high-risk discrepancies.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 text-muted-foreground text-xs uppercase md:grid-cols-[2fr_1fr_1fr]">
            <span>Transaction</span>
            <span>Amount</span>
            <span>Suggested action</span>
          </div>
          <ScrollArea className="max-h-80">
            <div className="divide-y">
              {exceptionQueue.map((item) => (
                <div
                  className="grid gap-4 py-4 md:grid-cols-[2fr_1fr_1fr]"
                  key={item.id}
                >
                  <div>
                    <p className="font-medium text-sm">{item.id}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.description}
                    </p>
                  </div>
                  <p className="text-sm">{item.amount}</p>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      {item.severity === "high" ? (
                        <TriangleAlert className="h-4 w-4 text-red-500" />
                      ) : item.severity === "medium" ? (
                        <TriangleAlert className="h-4 w-4 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                      <span className="capitalize">
                        {item.severity} priority
                      </span>
                    </div>
                    <Button size="sm" variant="secondary">
                      {item.suggestedAction}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Timeline insights</CardTitle>
            <p className="text-muted-foreground text-sm">
              Understand why the agent applied (or rejected) a given match
              suggestion.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                "Merchant similarity score 0.97",
                "Narrative context matched",
                "Amount delta under $5 tolerance",
              ].map((explanation) => (
                <div
                  className="flex items-start gap-3 rounded-md border bg-muted/40 p-3"
                  key={explanation}
                >
                  <ListChecks className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{explanation}</p>
                    <p className="text-muted-foreground text-xs">
                      Applied in 214 transactions last week.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">SLA tracking</CardTitle>
            <p className="text-muted-foreground text-sm">
              Keep the operations squad on top of review commitments when
              volumes spike.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-muted-foreground text-xs uppercase">
                Open queue ageing
              </p>
              <Progress className="h-2" value={64} />
              <p className="mt-1 text-muted-foreground text-xs">
                64% cleared within 24 hours
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-muted-foreground text-xs uppercase">
                Oldest item
              </p>
              <p className="font-semibold text-xl">36 hours</p>
              <p className="text-muted-foreground text-xs">
                Payroll duplicate awaiting approval
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-muted-foreground text-xs uppercase">
                Team load
              </p>
              <p className="font-semibold text-xl">3 reviewers</p>
              <p className="text-muted-foreground text-xs">
                Average capacity 8 items/hour
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
