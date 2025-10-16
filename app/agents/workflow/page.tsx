"use client";

import { useState } from "react";
import { ArrowRight, Bot, PlayCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

const workflowRuns = [
  {
    id: "Nightly close",
    status: "Completed",
    duration: "14m",
    lastRun: "12 Nov, 01:00",
    steps: [
      "Document agent ingested 42 invoices",
      "Reconciliation agent matched 397 transactions",
      "Compliance agent generated BAS draft",
    ],
  },
  {
    id: "Weekly board prep",
    status: "Running",
    duration: "7m",
    lastRun: "12 Nov, 09:00",
    steps: [
      "Analytics agent prepared variance summary",
      "Forecasting agent updated runway scenarios",
      "Advisory agent drafted investor memo",
    ],
  },
  {
    id: "Payroll compliance",
    status: "Queued",
    duration: "--",
    lastRun: "11 Nov, 18:10",
    steps: [
      "Document agent validated payroll reports",
      "Compliance agent cross-checked super obligations",
      "Workflow agent awaiting human approval",
    ],
  },
];

const orchestrationLibrary = [
  {
    name: "Month-end close",
    description: "Full cycle of document ingestion, reconciliation, compliance and analytics hand-off.",
    agents: ["Documents", "Reconciliations", "Compliance", "Analytics"],
  },
  {
    name: "Investor update",
    description: "Generate KPI commentary, variance packs and attach forecast scenario diffs.",
    agents: ["Analytics", "Forecasting", "Q&A"],
  },
  {
    name: "ATO audit pack",
    description: "Bundle supporting docs, ledger extracts and compliance explanations for auditors.",
    agents: ["Documents", "Compliance", "Workflow"],
  },
];

export default function WorkflowSupervisorPage() {
  const [autoRetry, setAutoRetry] = useState(true);
  const [observerMode, setObserverMode] = useState(false);

  return (
    <div className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-primary" />
              Workflow supervisor
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Design orchestrations across multiple agents, inspect execution logs and handle escalations.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">Active workflows</p>
                <p className="font-semibold text-2xl">5</p>
                <p className="text-muted-foreground text-xs">3 scheduled nightly</p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">Average latency</p>
                <p className="font-semibold text-2xl">6.2m</p>
                <p className="text-muted-foreground text-xs">Across last 24 runs</p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">Human escalations</p>
                <p className="font-semibold text-2xl">4</p>
                <p className="text-muted-foreground text-xs">Pending approval</p>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/40">
              <div className="grid gap-4 p-4 text-muted-foreground text-xs uppercase md:grid-cols-[2fr_1fr_1fr]">
                <span>Workflow</span>
                <span>Status</span>
                <span>Last run</span>
              </div>
              <div className="divide-y">
                {workflowRuns.map((run) => (
                  <div className="grid gap-4 p-4 md:grid-cols-[2fr_1fr_1fr]" key={run.id}>
                    <div>
                      <p className="font-medium text-sm">{run.id}</p>
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {run.steps.map((step) => (
                          <li className="flex items-start gap-2" key={step}>
                            <ArrowRight className="mt-0.5 h-3 w-3 text-primary" />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-sm">{run.status}</p>
                    <div className="text-sm">
                      <p>{run.lastRun}</p>
                      <p className="text-muted-foreground text-xs">Duration {run.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Execution settings</CardTitle>
            <p className="text-muted-foreground text-sm">
              Configure resilience, retry behaviour and observation mode.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-4">
              <div>
                <p className="font-medium text-sm">Auto-retry failed steps</p>
                <p className="text-muted-foreground text-xs">Retry up to 3 times before escalating to a human reviewer.</p>
              </div>
              <Switch checked={autoRetry} onCheckedChange={setAutoRetry} />
            </div>
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-4">
              <div>
                <p className="font-medium text-sm">Observer mode</p>
                <p className="text-muted-foreground text-xs">Preview actions before they execute in production systems.</p>
              </div>
              <Switch checked={observerMode} onCheckedChange={setObserverMode} />
            </div>
            <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-xs">
              <p className="font-semibold">Tip</p>
              <p className="text-muted-foreground">
                Connect to the analytics agent to auto-generate post-run summaries and share via Slack.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Design new workflow</CardTitle>
            <p className="text-muted-foreground text-sm">
              Start a new LangGraph orchestration by defining trigger, agents and fallbacks.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Workflow name</Label>
              <Input placeholder="e.g. Month end with compliance review" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Trigger</Label>
              <Input placeholder="e.g. Every weekday 9pm AEST" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Agents involved</Label>
              <Input placeholder="Documents, Reconciliations, Compliance" />
            </div>
            <Button className="w-full" variant="secondary">
              Create orchestration
              <PlayCircle className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Library</CardTitle>
            <p className="text-muted-foreground text-sm">
              Reuse proven templates to accelerate automation rollouts.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {orchestrationLibrary.map((workflow) => (
                  <div className="rounded-md border bg-muted/40 p-3" key={workflow.name}>
                    <p className="font-medium text-sm">{workflow.name}</p>
                    <p className="text-muted-foreground text-xs">{workflow.description}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Agents: {workflow.agents.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <p className="font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Human approvals required
              </p>
              <p>
                Ensure compliance and reconciliation agents sign off on adjustments before pushing to production systems.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
