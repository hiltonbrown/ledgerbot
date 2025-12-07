"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { TokenUsageSummary } from "@/app/(settings)/api/usage/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export function TokenUsageChart({
  timeseries,
}: {
  timeseries: TokenUsageSummary["timeseries"];
}) {
  const chartData = useMemo(
    () =>
      timeseries.map((entry) => ({
        date: new Date(entry.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        cost: entry.cost,
      })),
    [timeseries]
  );

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      inputTokens: {
        label: "Input Tokens",
        color: "hsl(var(--chart-1))",
      },
      outputTokens: {
        label: "Output Tokens",
        color: "hsl(var(--chart-2))",
      },
    }),
    []
  );

  if (timeseries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-semibold text-base">
            Token Usage Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground text-sm">
              No usage data available yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold text-base">
          Token Usage Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[320px]" config={chartConfig}>
          <ResponsiveContainer>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="date"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={false}
              />
              <ChartTooltip />
              <ChartLegend
                align="right"
                content={<ChartLegendContent />}
                verticalAlign="top"
                wrapperStyle={{ paddingBottom: 12 }}
              />
              <Area
                dataKey="inputTokens"
                fill={chartConfig.inputTokens.color}
                fillOpacity={0.6}
                stackId="tokens"
                stroke={chartConfig.inputTokens.color}
                strokeWidth={2}
                type="monotone"
              />
              <Area
                dataKey="outputTokens"
                fill={chartConfig.outputTokens.color}
                fillOpacity={0.6}
                stackId="tokens"
                stroke={chartConfig.outputTokens.color}
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
