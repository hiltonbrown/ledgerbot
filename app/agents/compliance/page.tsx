"use client";

import { useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

const upcomingDeadlines = [
  {
    title: "BAS Q1 Lodgement",
    due: "21 November 2025",
    risk: "High",
    owner: "Amelia (Finance)",
  },
  {
    title: "Super Guarantee Payment",
    due: "28 November 2025",
    risk: "Medium",
    owner: "Josh (Payroll)",
  },
  {
    title: "PAYG Withholding",
    due: "15 December 2025",
    risk: "Medium",
    owner: "Amelia (Finance)",
  },
];

const complianceChecklist = [
  {
    id: 1,
    title: "GST codes verified",
    description: "Agent cross-checked GST codes for 128 transactions this fortnight.",
    complete: true,
  },
  {
    id: 2,
    title: "Payroll audit trail exported",
    description: "Next export scheduled prior to the superannuation lodgement.",
    complete: false,
  },
  {
    id: 3,
    title: "ATO ruling references updated",
    description: "Recent Rulings: GSTR 2000/24, PS LA 2011/4",
    complete: true,
  },
  {
    id: 4,
    title: "Disclaimers acknowledged",
    description: "Last legal review logged on 2 November 2025.",
    complete: false,
  },
];

export default function ComplianceAgentPage() {
  const [autoDisclaimers, setAutoDisclaimers] = useState(true);
  const [humanEscalation, setHumanEscalation] = useState(true);
  const [jurisdiction, setJurisdiction] = useState("australia");

  return (
    <div className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Compliance console
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Agent responses are grounded in official Australian legislation and require human confirmation for high-risk calls.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">ATO references cited</p>
                <p className="font-semibold text-2xl">26</p>
                <p className="text-muted-foreground text-xs">Past 14 days</p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">Escalations</p>
                <p className="font-semibold text-2xl">5</p>
                <p className="text-muted-foreground text-xs">Awaiting review</p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">Knowledge base freshness</p>
                <p className="font-semibold text-2xl">98%</p>
                <p className="text-muted-foreground text-xs">Last synced 3 hours ago</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="font-medium text-sm">Default disclaimer</p>
                <p className="text-muted-foreground text-xs">
                  “This insight is general in nature and should not replace advice from a registered tax agent.”
                </p>
              </div>
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="font-medium text-sm">Latest legal guidance</p>
                <p className="text-muted-foreground text-xs">
                  Reviewed by <strong>Lex & Co</strong> – coverage includes GST, PAYG, Super and payroll tax.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Safeguards</CardTitle>
            <p className="text-muted-foreground text-sm">
              Tailor when to inject disclaimers, escalate to humans and which jurisdiction the agent references.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-4">
              <div>
                <p className="font-medium text-sm">Include legal disclaimer automatically</p>
                <p className="text-muted-foreground text-xs">
                  Display the approved disclaimer on every response unless suppressed manually.
                </p>
              </div>
              <Switch checked={autoDisclaimers} onCheckedChange={setAutoDisclaimers} />
            </div>
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-4">
              <div>
                <p className="font-medium text-sm">Escalate sensitive queries</p>
                <p className="text-muted-foreground text-xs">
                  Require human review for payroll, superannuation or penalties above $5k.
                </p>
              </div>
              <Switch checked={humanEscalation} onCheckedChange={setHumanEscalation} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Jurisdiction</Label>
              <Input
                className="text-sm"
                onChange={(event) => setJurisdiction(event.target.value)}
                value={jurisdiction}
              />
              <p className="text-muted-foreground text-xs">
                Default focus is Australia. Update to customise disclaimers and references for other regions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-1">
          <CardTitle className="text-lg">Upcoming deadlines</CardTitle>
          <p className="text-muted-foreground text-sm">
            Sync compliance milestones with the forecasting agent to balance tax, payroll and BAS requirements.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 text-muted-foreground text-xs uppercase md:grid-cols-[2fr_1fr_1fr]">
            <span>Task</span>
            <span>Due date</span>
            <span>Owner</span>
          </div>
          <ScrollArea className="max-h-72">
            <div className="divide-y">
              {upcomingDeadlines.map((deadline) => (
                <div className="grid gap-4 py-4 md:grid-cols-[2fr_1fr_1fr]" key={deadline.title}>
                  <div>
                    <p className="font-medium text-sm">{deadline.title}</p>
                    <p className="text-muted-foreground text-xs">Risk: {deadline.risk}</p>
                  </div>
                  <p className="text-sm">{deadline.due}</p>
                  <p className="text-sm">{deadline.owner}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Audit checklist</CardTitle>
            <p className="text-muted-foreground text-sm">
              Track progress on compliance hygiene tasks across the month.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {complianceChecklist.map((item) => (
                <div
                  className="flex items-start gap-3 rounded-md border bg-muted/40 p-3"
                  key={item.id}
                >
                  {item.complete ? (
                    <ShieldCheck className="mt-1 h-5 w-5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="mt-1 h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-muted-foreground text-xs">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Knowledge base usage</CardTitle>
            <p className="text-muted-foreground text-sm">
              Identify the legislation and rulings referenced most often by the agent this week.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-muted-foreground text-xs uppercase">Top citations</p>
              <ul className="mt-2 space-y-2 text-sm">
                <li>ATO QC 63919 – PAYG withholding for employees</li>
                <li>ATO QC 21544 – BAS reporting obligations</li>
                <li>ATO QC 20243 – Superannuation guarantee charge</li>
              </ul>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-muted-foreground text-xs uppercase">Suggested updates</p>
              <ul className="mt-2 space-y-2 text-sm">
                <li>Upload state payroll tax matrix for NSW and VIC.</li>
                <li>Enable ABN lookup integration for vendor onboarding.</li>
                <li>Review fringe benefits tax thresholds for FY26.</li>
              </ul>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-muted-foreground text-xs uppercase">Legal notes</p>
              <p className="mt-2 text-sm">
                Agent outputs are informational. Confirm advice with a registered tax agent before acting on high-risk matters.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
