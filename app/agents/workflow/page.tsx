"use client";

import { Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WorkflowAgentPage() {
  return (
    <div className="space-y-10">
      <Card>
        <CardHeader className="flex flex-col gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Network className="h-5 w-5 text-primary" />
            Workflow supervisor
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Graph orchestrations across document, reconciliation and compliance
            agents with traceability.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-primary/40 border-dashed bg-primary/5 p-6 text-center">
            <p className="font-semibold text-sm">Coming soon</p>
            <p className="mt-2 text-muted-foreground text-sm">
              The Workflow Supervisor workspace is under development. Configure
              settings via Settings → Agents.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
