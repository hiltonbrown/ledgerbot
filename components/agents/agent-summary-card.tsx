import { ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type AgentSummaryMetric = {
  label: string;
  value: string;
  helper?: string;
};

type AgentSummaryCardProps = {
  title: string;
  description: string;
  href: string;
  status?: "online" | "degraded" | "offline";
  badge?: string;
  icon?: ReactNode;
  metrics?: AgentSummaryMetric[];
  footer?: ReactNode;
};

const statusCopy: Record<
  NonNullable<AgentSummaryCardProps["status"]>,
  string
> = {
  online: "Operational",
  degraded: "Attention required",
  offline: "Disabled",
};

export function AgentSummaryCard({
  title,
  description,
  href,
  status = "online",
  badge,
  icon,
  metrics,
  footer,
}: AgentSummaryCardProps) {
  return (
    <Card className="h-full border-border/60">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              {icon ?? <Sparkles className="h-5 w-5" />}
            </div>
            <div className="space-y-1">
              <CardTitle className="font-semibold text-base">{title}</CardTitle>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {description}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <Badge
              className="rounded-full px-2.5 py-0.5 text-xs"
              variant={status === "online" ? "secondary" : "destructive"}
            >
              {statusCopy[status]}
            </Badge>
            {badge ? (
              <Badge
                className="rounded-full bg-primary/10 text-primary"
                variant="outline"
              >
                {badge}
              </Badge>
            ) : null}
          </div>
        </div>
        {metrics && metrics.length > 0 ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            {metrics.map((metric) => (
              <div className="space-y-1" key={metric.label}>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">
                  {metric.label}
                </dt>
                <dd className="font-semibold text-lg">{metric.value}</dd>
                {metric.helper ? (
                  <p className="text-muted-foreground text-xs">
                    {metric.helper}
                  </p>
                ) : null}
              </div>
            ))}
          </dl>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <Button asChild className="w-full" variant="secondary">
          <Link href={href}>
            Open workspace
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        {footer}
      </CardContent>
    </Card>
  );
}
