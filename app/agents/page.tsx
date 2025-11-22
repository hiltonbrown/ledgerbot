import {
  Activity,
  BarChart3,
  CreditCard,
  DollarSign,
  FileText,
  Gauge,
  Network,
} from "lucide-react";
import Link from "next/link";
import { AgentSummaryCard } from "@/components/agents/agent-summary-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const agentSnapshots = [
  {
    title: "Document Processing",
    description:
      "AI-assisted intake for invoices, receipts and bank statements with automated OCR and validation queues.",
    href: "/agents/docmanagement",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    title: "Analytics",
    description:
      "Narrative-rich reporting with KPI annotations, drill-down tables and presentation-ready exports.",
    href: "/agents/analytics",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    title: "Forecasting",
    description:
      "Scenario modelling, runway projections and automated assumption tracking with AI workflows.",
    href: "/agents/forecasting",
    icon: <Gauge className="h-5 w-5" />,
  },
  {
    title: "Accounts Payable",
    description:
      "Vendor intake, bill coding with GST validation, approval workflows and payment run proposals for Australian businesses.",
    href: "/agents/ap",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    title: "Accounts Receivable",
    description:
      "Customer invoice management with payment reminders, late risk prediction and DSO reduction for Australian businesses.",
    href: "/agents/ar",
    icon: <DollarSign className="h-5 w-5" />,
  },
  {
    title: "Advisory Q&A",
    description:
      "Conversational assistant for policies, ledger context and structured follow-up tasks.",
    href: "/agents/qanda",
    icon: <Activity className="h-5 w-5" />,
  },
  {
    title: "Workflow Supervisor",
    description:
      "Graph orchestrations across document, reconciliation and compliance agents with traceability.",
    href: "/agents/workflow",
    icon: <Network className="h-5 w-5" />,
  },
];

export default function AgentsOverviewPage() {
  return (
    <div className="space-y-10">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-semibold text-lg">
              Agent workspaces
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Jump directly into the operational view for each specialised AI
              assistant to interact with your accounting data.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/settings/agents">Manage configuration</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {agentSnapshots.map((snapshot) => (
              <AgentSummaryCard key={snapshot.title} {...snapshot} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
