"use client";

import { GitBranch, Network, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function WorkflowAgentPage() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-3xl">
            <Network className="h-8 w-8 text-primary" />
            Workflow Supervisor Agent
          </h1>
          <p className="text-muted-foreground">
            Graph orchestrations across document, reconciliation, and compliance
            agents with Mastra workflows and traceability
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2" disabled variant="outline">
            <GitBranch className="h-4 w-4" />
            View Workflows
          </Button>
          <Button className="gap-2" disabled>
            <Play className="h-4 w-4" />
            Run Workflow
          </Button>
        </div>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Network className="mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 font-semibold text-xl">
              Workflow Supervisor Coming Soon
            </h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              The Workflow Supervisor workspace is under development. This agent
              will orchestrate multi-step processes across document management,
              reconciliation, and compliance agents using Mastra workflows with
              full traceability.
            </p>
            <p className="text-muted-foreground text-sm">
              Configure settings via{" "}
              <a
                className="font-medium text-primary hover:underline"
                href="/settings/agents"
              >
                Settings → Agents
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
