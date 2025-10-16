"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, CheckCircle2, FileText, ShieldAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

const validationQueue = [
  {
    id: "INV-2045",
    vendor: "Atlas Freight",
    amount: "$1,980.00",
    receivedAt: "12 Nov, 09:24",
    confidence: 58,
    status: "requires-review" as const,
  },
  {
    id: "BAS-Q3",
    vendor: "ATO",
    amount: "$21,540.00",
    receivedAt: "12 Nov, 08:12",
    confidence: 91,
    status: "ready" as const,
  },
  {
    id: "REC-8891",
    vendor: "Neo Retail",
    amount: "$312.45",
    receivedAt: "11 Nov, 17:56",
    confidence: 72,
    status: "requires-review" as const,
  },
  {
    id: "PAY-5542",
    vendor: "Acme Payroll",
    amount: "$18,440.10",
    receivedAt: "11 Nov, 14:22",
    confidence: 86,
    status: "ready" as const,
  },
];

export default function DocumentManagementAgentPage() {
  const [autoValidate, setAutoValidate] = useState(true);
  const [dedupeUploads, setDedupeUploads] = useState(true);
  const [notifySlack, setNotifySlack] = useState(false);

  const averageConfidence = useMemo(() => {
    const total = validationQueue.reduce((acc, item) => acc + item.confidence, 0);
    return Math.round(total / validationQueue.length);
  }, []);

  return (
    <div className="space-y-10">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Live intake overview
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Drop PDFs, images or spreadsheets for the agent to classify, extract, and push through the validation flow.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <label
              className="flex flex-col items-center justify-center rounded-lg border border-dashed border-primary/40 bg-primary/5 p-8 text-center transition hover:border-primary hover:bg-primary/10"
            >
              <Upload className="mb-3 h-8 w-8 text-primary" />
              <span className="font-medium">Upload supporting documents</span>
              <span className="text-muted-foreground text-sm">Drag & drop or click to browse files</span>
              <Input className="hidden" multiple type="file" />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-muted-foreground text-xs uppercase">Today</p>
                <p className="font-semibold text-xl">38 docs</p>
                <p className="text-muted-foreground text-xs">92% processed automatically</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-muted-foreground text-xs uppercase">Extraction latency</p>
                <p className="font-semibold text-xl">34s avg</p>
                <p className="text-muted-foreground text-xs">P95 under 45s</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-muted-foreground text-xs uppercase">Average confidence</p>
                <p className="font-semibold text-xl">{averageConfidence}%</p>
                <p className="text-muted-foreground text-xs">Across last 24 uploads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Automation guardrails</CardTitle>
            <p className="text-muted-foreground text-sm">
              Configure safety checks before extracted data lands in the ledger or hits human review queues.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-4">
              <div>
                <p className="font-medium text-sm">Auto-validate high confidence documents</p>
                <p className="text-muted-foreground text-xs">
                  Approve anything above 85% instantly and forward to reconciliation queues.
                </p>
              </div>
              <Switch checked={autoValidate} onCheckedChange={setAutoValidate} />
            </div>
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-4">
              <div>
                <p className="font-medium text-sm">Detect duplicates on upload</p>
                <p className="text-muted-foreground text-xs">
                  Prevent multiple ledger entries when suppliers resend statements or invoices.
                </p>
              </div>
              <Switch checked={dedupeUploads} onCheckedChange={setDedupeUploads} />
            </div>
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-4">
              <div>
                <p className="font-medium text-sm">Notify finance Slack channel</p>
                <p className="text-muted-foreground text-xs">
                  Send a digest when more than 5 documents require human validation within an hour.
                </p>
              </div>
              <Switch checked={notifySlack} onCheckedChange={setNotifySlack} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-1">
          <CardTitle className="text-lg">Validation queue</CardTitle>
          <p className="text-muted-foreground text-sm">
            Review extractions that need context before they sync into the general ledger.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_1fr]
            text-muted-foreground text-xs uppercase">
            <span>Document</span>
            <span>Amount</span>
            <span>Confidence</span>
            <span>Status</span>
          </div>
          <ScrollArea className="max-h-80">
            <div className="divide-y">
              {validationQueue.map((item) => (
                <div
                  className="grid items-center gap-4 py-4 md:grid-cols-[2fr_1fr_1fr_1fr]"
                  key={item.id}
                >
                  <div>
                    <p className="font-medium text-sm">{item.id}</p>
                    <p className="text-muted-foreground text-xs">{item.vendor}</p>
                    <p className="text-muted-foreground text-xs">Received {item.receivedAt}</p>
                  </div>
                  <p className="text-sm">{item.amount}</p>
                  <div>
                    <Progress className="h-2" value={item.confidence} />
                    <p className="text-muted-foreground text-xs mt-1">
                      {item.confidence}% certainty
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === "ready" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-sm capitalize">
                      {item.status === "ready" ? "Ready to post" : "Needs review"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Extraction metrics</CardTitle>
            <p className="text-muted-foreground text-sm">
              Monitor the quality of parsing engines, classification routing and human-in-the-loop response times.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-muted-foreground text-xs uppercase">Turnaround</p>
              <p className="font-semibold text-2xl">14m</p>
              <p className="text-muted-foreground text-xs">Average from upload to ledger</p>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-muted-foreground text-xs uppercase">Model version</p>
              <p className="font-semibold text-2xl">v1.8</p>
              <p className="text-muted-foreground text-xs">Latest Claude Sonnet fine-tune</p>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-muted-foreground text-xs uppercase">Data quality alerts</p>
              <p className="font-semibold text-2xl">3</p>
              <p className="text-muted-foreground text-xs">Triggered past 24 hours</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Playbooks</CardTitle>
            <p className="text-muted-foreground text-sm">
              Recommended next steps for the operator when exceptions pile up.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-4">
              <p className="font-medium text-sm">Re-run OCR with enhanced vision</p>
              <p className="text-muted-foreground text-xs">
                Applies GPT-5 vision model to low-confidence receipts and merges the diff.
              </p>
              <Button className="mt-3" size="sm" variant="secondary">
                Execute playbook
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="rounded-md border bg-muted/40 p-4">
              <p className="font-medium text-sm">Batch export for accountant review</p>
              <p className="text-muted-foreground text-xs">
                Creates a CSV with extracted data, raw OCR text and document previews.
              </p>
              <Button className="mt-3" size="sm" variant="outline">
                Generate export
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
