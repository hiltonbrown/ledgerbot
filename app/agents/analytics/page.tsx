"use client";

import { BarChart3, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AnalyticsAgentPage() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-3xl">
            <BarChart3 className="h-8 w-8 text-primary" />
            Analytics Agent
          </h1>
          <p className="text-muted-foreground">
            Narrative-rich reporting with KPI annotations, drill-down tables,
            and presentation-ready exports
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2" disabled variant="outline">
            <RefreshCw className="h-4 w-4" />
            Sync Data
          </Button>
          <Button className="gap-2" disabled>
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <BarChart3 className="mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 font-semibold text-xl">
              Analytics Workspace Coming Soon
            </h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              The Analytics agent workspace is under development. This agent
              will provide narrative-rich reporting with KPI calculations,
              drill-down tables, and presentation-ready exports.
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
