import {
  Activity,
  BarChart3,
  ClipboardList,
  FileText,
  Gauge,
  Network,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { AgentSummaryCard } from "@/components/agents/agent-summary-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const agentSnapshots = [
  {
    title: "Document Processing",
    description:
      "AI-assisted intake for invoices, receipts and bank statements with automated OCR and validation queues.",
    href: "/agents/docmanagement",
    icon: <FileText className="h-5 w-5" />,
    metrics: [
      { label: "Docs processed (7d)", value: "128", helper: "92% auto-approved" },
      { label: "Human escalations", value: "6", helper: "All queued for review" },
    ],
  },
  {
    title: "Reconciliations",
    description:
      "Continuous bank feed matching, fuzzy logic suggestions and ledger adjustment proposals.",
    href: "/agents/reconciliations",
    icon: <ClipboardList className="h-5 w-5" />,
    metrics: [
      { label: "Match rate", value: "97.4%", helper: "Goal > 95%" },
      { label: "Open exceptions", value: "14", helper: "5 flagged urgent" },
    ],
  },
  {
    title: "Compliance",
    description:
      "ATO-aware co-pilot for BAS, payroll and super obligations with automatic reminders and disclaimers.",
    href: "/agents/compliance",
    icon: <ShieldCheck className="h-5 w-5" />,
    metrics: [
      { label: "Upcoming lodgements", value: "3 due", helper: "Next: BAS (21 Nov)" },
      { label: "Knowledge base hits", value: "42", helper: "Last 14 days" },
    ],
  },
  {
    title: "Analytics",
    description:
      "Narrative-rich reporting with KPI annotations, drill-down tables and presentation-ready exports.",
    href: "/agents/analytics",
    icon: <BarChart3 className="h-5 w-5" />,
    metrics: [
      { label: "Reports generated", value: "18", helper: "Last month" },
      { label: "Stakeholder shares", value: "9", helper: "3 pending comments" },
    ],
  },
  {
    title: "Forecasting",
    description:
      "Scenario modelling, runway projections and automated assumption tracking with LangGraph workflows.",
    href: "/agents/forecasting",
    icon: <Gauge className="h-5 w-5" />,
    metrics: [
      { label: "Forecast horizon", value: "9 months", helper: "Updated 2 days ago" },
      { label: "Confidence bands", value: "±8%", helper: "Median variance" },
    ],
  },
  {
    title: "Advisory Q&A",
    description:
      "Conversational assistant for policies, ledger context and structured follow-up tasks.",
    href: "/agents/qanda",
    icon: <Activity className="h-5 w-5" />,
    metrics: [
      { label: "Avg. confidence", value: "88%", helper: "Streaming responses enabled" },
      { label: "Escalations", value: "2", helper: "Awaiting reviewer sign-off" },
    ],
  },
  {
    title: "Workflow Supervisor",
    description:
      "Graph orchestrations across document, reconciliation and compliance agents with traceability.",
    href: "/agents/workflow",
    icon: <Network className="h-5 w-5" />,
    metrics: [
      { label: "Active workflows", value: "5", helper: "3 scheduled nightly" },
      { label: "Step success", value: "99.1%", helper: "Last 50 executions" },
    ],
  },
];

export default function AgentsOverviewPage() {
  return (
    <div className="space-y-10">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">Automation summary</CardTitle>
            <p className="text-muted-foreground text-sm">
              Review aggregate health signals across every AI assistant before diving into a dedicated workspace.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/settings/agents">Manage configuration</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Automation coverage</p>
            <h3 className="font-semibold text-3xl">76%</h3>
            <p className="text-muted-foreground text-sm">
              Percentage of bookkeeping workflows now delegated to specialist AI agents across the organisation.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Human review queue</p>
            <h3 className="font-semibold text-3xl">28 items</h3>
            <p className="text-muted-foreground text-sm">
              Escalations span document validation (14), reconciliation mismatches (9) and compliance clarifications (5).
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-semibold text-xl">Agent workspaces</h2>
          <p className="text-muted-foreground text-sm">
            Jump directly into the operational view for each specialised assistant and monitor its live workload.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {agentSnapshots.map((snapshot) => (
            <AgentSummaryCard key={snapshot.title} {...snapshot} />
          ))}
        </div>
      </section>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg font-semibold">Change management</CardTitle>
          <p className="text-muted-foreground text-sm">
            Track upcoming releases, dependency upgrades and policy shifts that may affect agent decision-making.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-xs uppercase">Next release train</p>
              <p className="font-semibold text-base">v2.4 agents stack</p>
              <p className="text-muted-foreground text-sm">Scheduled for 4 December including LangGraph upgrades.</p>
            </div>
            <Separator orientation="vertical" className="hidden md:block" />
            <div>
              <p className="text-muted-foreground text-xs uppercase">Risk register</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" aria-hidden />
                  <span>ATO API sandbox rate limits flagged for compliance queries.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  <span>Document OCR accuracy trending upward after model refresh.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500" aria-hidden />
                  <span>Workflow supervisor retry budget nearing threshold for nightly runs.</span>
                </li>
              </ul>
            </div>
            <Separator orientation="vertical" className="hidden md:block" />
            <div>
              <p className="text-muted-foreground text-xs uppercase">Recommended actions</p>
              <ul className="space-y-2 text-sm">
                <li>Audit escalation routing for compliance agent before BAS deadline.</li>
                <li>Align forecasting agent assumptions with updated hiring plan.</li>
                <li>Roll out new reconciliation auto-approve threshold to pilot entities.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
