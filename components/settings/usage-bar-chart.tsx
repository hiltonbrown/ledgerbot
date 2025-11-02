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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export function UsageBarChart({ metrics }: { metrics: UsageMetric[] }) {
  const chartData = useMemo(
    () =>
      metrics.map((metric) => ({
        metric: metric.label,
        used: metric.used,
        limit: metric.limit,
        unit: metric.unit,
      })),
    [metrics]
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
    []
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold text-base">
          Usage by metric
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[320px]" config={chartConfig}>
          <ResponsiveContainer>
            <BarChart barSize={24} data={chartData}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="metric"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={false}
              />
              <ChartTooltip cursor={{ fill: "hsl(var(--muted) / 0.25)" }} />
              <ChartLegend
                align="right"
                verticalAlign="top"
                wrapperStyle={{ paddingBottom: 12 }}
              />
              <Bar
                dataKey="used"
                fill={chartConfig.used.color}
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="limit"
                fill={chartConfig.limit.color}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
