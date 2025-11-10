"use client";

import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsAgentPage() {
  return (
    <div className="space-y-10">
      <Card>
        <CardHeader className="flex flex-col gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Analytics assistant
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Narrative-rich reporting with KPI annotations, drill-down tables and
            presentation-ready exports.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-primary/40 border-dashed bg-primary/5 p-6 text-center">
            <p className="font-semibold text-sm">Coming soon</p>
            <p className="mt-2 text-muted-foreground text-sm">
              The Analytics agent workspace is under development. Configure
              settings via Settings → Agents.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
