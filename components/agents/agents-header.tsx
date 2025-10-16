"use client";

import {
  Activity,
  BarChart3,
  ClipboardList,
  FileText,
  Gauge,
  Network,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const agentLinks = [
  {
    href: "/agents",
    label: "Overview",
    description: "Snapshots for every automation assistant",
    icon: Sparkles,
  },
  {
    href: "/agents/docmanagement",
    label: "Documents",
    description: "Ingestion, OCR and validation",
    icon: FileText,
  },
  {
    href: "/agents/reconciliations",
    label: "Reconciliations",
    description: "Match ledger and bank activity",
    icon: ClipboardList,
  },
  {
    href: "/agents/compliance",
    label: "Compliance",
    description: "Tax, GST and payroll guardrails",
    icon: ShieldCheck,
  },
  {
    href: "/agents/analytics",
    label: "Analytics",
    description: "Financial reporting insights",
    icon: BarChart3,
  },
  {
    href: "/agents/forecasting",
    label: "Forecasting",
    description: "Scenario planning & cash runway",
    icon: Gauge,
  },
  {
    href: "/agents/qanda",
    label: "Q&A Assistant",
    description: "Conversational advisory workspace",
    icon: Activity,
  },
  {
    href: "/agents/workflow",
    label: "Workflows",
    description: "Multi-agent orchestration",
    icon: Network,
  },
] as const;

const labelsByPath: Record<string, { title: string; blurb: string }> = {
  "/agents": {
    title: "AI Agent Control Centre",
    blurb:
      "Monitor capabilities, review performance highlights and jump into dedicated workspaces for every assistant.",
  },
  "/agents/docmanagement": {
    title: "Document Processing Agent",
    blurb:
      "Upload statements and invoices, review extraction confidence and manage human validation queues.",
  },
  "/agents/reconciliations": {
    title: "Reconciliation Agent",
    blurb:
      "Track matching accuracy, clear exceptions and approve proposed ledger adjustments with confidence.",
  },
  "/agents/compliance": {
    title: "Compliance Agent",
    blurb:
      "Stay ahead of lodgement deadlines, GST obligations and payroll compliance with built-in guardrails.",
  },
  "/agents/analytics": {
    title: "Analytics Agent",
    blurb:
      "Generate investor-ready reports, benchmarking insights and real-time KPIs for stakeholders.",
  },
  "/agents/forecasting": {
    title: "Forecasting Agent",
    blurb:
      "Model multiple scenarios, monitor assumptions and keep the runway forecast aligned with live data.",
  },
  "/agents/qanda": {
    title: "Advisory Q&A Agent",
    blurb:
      "Ask contextual questions about your books, surface knowledge base answers and capture follow-up tasks.",
  },
  "/agents/workflow": {
    title: "Workflow Supervisor",
    blurb:
      "Design orchestrations across agents, watch live execution state and resolve human review escalations.",
  },
};

export function AgentsHeader() {
  const pathname = usePathname();
  const activeLink =
    [...agentLinks]
      .sort((a, b) => b.href.length - a.href.length)
      .find((link) => pathname.startsWith(link.href)) ?? agentLinks[0];
  const meta = labelsByPath[activeLink.href] ?? labelsByPath["/agents"];

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
          <li>
            <Link className="transition-colors hover:text-foreground" href="/">
              Home
            </Link>
          </li>
          <li className="text-muted-foreground">/</li>
          <li>
            <Link
              className={cn(
                "transition-colors",
                pathname === "/agents"
                  ? "text-foreground"
                  : "hover:text-foreground"
              )}
              href="/agents"
            >
              Agents
            </Link>
          </li>
          {activeLink.href !== "/agents" ? (
            <>
              <li className="text-muted-foreground">/</li>
              <li className="font-medium text-foreground">
                {activeLink.label}
              </li>
            </>
          ) : null}
        </ol>
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        {agentLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              href={link.href}
              key={link.href}
            >
              <Icon className="h-4 w-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="space-y-1">
        <h1 className="font-semibold text-2xl text-foreground tracking-tight">
          {meta.title}
        </h1>
        <p className="text-muted-foreground text-sm">{meta.blurb}</p>
      </div>
    </div>
  );
}
