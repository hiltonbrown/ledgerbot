import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import type { UsageSummary } from "@/app/(settings)/api/usage/data";

function formatPercentage(used: number, limit: number) {
  return Math.min(100, Math.round((used / limit) * 100));
}

export function UsageSummary({ summary }: { summary: UsageSummary }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-muted-foreground text-sm">
        <span>Billing cycle: {summary.billingCycle}</span>
        <span>
          Last updated {format(new Date(summary.lastUpdated), "MMM d, yyyy 'at' h:mm a")}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {summary.metrics.map((metric) => {
          const percent = formatPercentage(metric.used, metric.limit);
          return (
            <div
              className="flex flex-col gap-3 rounded-lg border bg-card p-4"
              key={metric.id}
            >
              <div>
                <p className="font-medium text-foreground text-sm">{metric.label}</p>
                <p className="text-muted-foreground text-xs">
                  {metric.helpText ?? `Usage tracked in ${metric.unit}.`}
                </p>
              </div>
              <div className="font-semibold text-foreground text-2xl">
                {metric.used.toLocaleString()} <span className="text-muted-foreground text-sm">{metric.unit}</span>
              </div>
              <p className="text-muted-foreground text-xs">
                Limit: {metric.limit.toLocaleString()} {metric.unit} ({percent}% used)
              </p>
              <Progress value={percent} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
