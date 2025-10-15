"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { UsageMetric } from "@/app/(settings)/api/usage/data";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UsageBarChart({ metrics }: { metrics: UsageMetric[] }) {
  const chartData = useMemo(
    () =>
      metrics.map((metric) => ({
        metric: metric.label,
        used: metric.used,
        limit: metric.limit,
        unit: metric.unit,
      })),
    [metrics],
  );

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      used: {
        label: "Used",
        color: "hsl(var(--chart-1))",
      },
      limit: {
        label: "Limit",
        color: "hsl(var(--chart-2))",
      },
    }),
    [],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Usage by metric</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[320px]" config={chartConfig}>
          <ResponsiveContainer>
            <BarChart barSize={24} data={chartData}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="metric"
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <ChartTooltip cursor={{ fill: "hsl(var(--muted) / 0.25)" }} />
              <ChartLegend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 12 }} />
              <Bar dataKey="used" fill="var(--color-used)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="limit" fill="var(--color-limit)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
