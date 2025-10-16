"use client";

import { ArrowUpRight, Download, FileBarChart2 } from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
} from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";

const revenueData = [
  { month: "Apr", revenue: 182_000, expenses: 142_000 },
  { month: "May", revenue: 190_000, expenses: 150_000 },
  { month: "Jun", revenue: 205_000, expenses: 158_000 },
  { month: "Jul", revenue: 212_000, expenses: 161_000 },
  { month: "Aug", revenue: 223_000, expenses: 168_000 },
  { month: "Sep", revenue: 231_000, expenses: 174_000 },
  { month: "Oct", revenue: 246_000, expenses: 181_000 },
];

const expenseBreakdown = [
  { category: "Payroll", current: 94_000, previous: 88_000 },
  { category: "Cloud", current: 28_000, previous: 25_500 },
  { category: "Marketing", current: 36_000, previous: 41_000 },
  { category: "Logistics", current: 18_000, previous: 17_200 },
  { category: "Professional services", current: 12_200, previous: 11_000 },
];

const kpiHighlights = [
  {
    label: "Gross margin",
    value: "32.7%",
    change: "+1.2pp",
    helper: "Margin improved due to shipping renegotiations.",
  },
  {
    label: "Runway",
    value: "13.4 months",
    change: "+0.8",
    helper: "Extended after reducing discretionary marketing spend.",
  },
  {
    label: "Net burn",
    value: "$74.8k",
    change: "-6.5%",
    helper: "Forecast agent aligned with actual cash movements.",
  },
];

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",
  },
} as const;

export default function AnalyticsAgentPage() {
  const totalRevenue = useMemo(
    () => revenueData.reduce((acc, entry) => acc + entry.revenue, 0),
    []
  );
  const totalExpenses = useMemo(
    () => revenueData.reduce((acc, entry) => acc + entry.expenses, 0),
    []
  );

  return (
    <div className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileBarChart2 className="h-5 w-5 text-primary" />
              Reporting control room
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Generate narrative-rich reporting packs, analyse anomalies and
              export ready-to-share dashboards.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">
                  Total revenue
                </p>
                <p className="font-semibold text-2xl">
                  ${totalRevenue.toLocaleString()}
                </p>
                <p className="text-muted-foreground text-xs">
                  Apr – Oct period
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">
                  Total expenses
                </p>
                <p className="font-semibold text-2xl">
                  ${totalExpenses.toLocaleString()}
                </p>
                <p className="text-muted-foreground text-xs">
                  Apr – Oct period
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">
                  Reports shipped
                </p>
                <p className="font-semibold text-2xl">18</p>
                <p className="text-muted-foreground text-xs">Last 30 days</p>
              </div>
            </div>

            <ChartContainer className="h-[320px]" config={chartConfig}>
              <ResponsiveContainer>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="colorExpenses"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--chart-2))"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--chart-2))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="hsl(var(--muted-foreground)/0.3)"
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    dataKey="month"
                    fontSize={12}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    fontSize={12}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <ChartTooltip />
                  <ChartLegend />
                  <Area
                    dataKey="revenue"
                    fill="url(#colorRevenue)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    type="monotone"
                  />
                  <Area
                    dataKey="expenses"
                    fill="url(#colorExpenses)"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Narrative prompts</CardTitle>
            <p className="text-muted-foreground text-sm">
              Kick off AI-authored commentary with suggested prompts.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Explain the variance between forecast and actual cash",
              "Summarise top anomalies for the board pack",
              "Draft a KPI commentary for investors",
            ].map((prompt) => (
              <Button
                className="w-full justify-between"
                key={prompt}
                variant="outline"
              >
                {prompt}
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            ))}
            <Separator />
            <Button className="w-full" variant="secondary">
              Export latest pack
              <Download className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Expense spotlight</CardTitle>
            <p className="text-muted-foreground text-sm">
              Track how the agent surfaces savings opportunities and benchmark
              shifts.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChartContainer
              className="h-[280px]"
              config={{
                current: { label: "Current", color: "hsl(var(--primary))" },
                previous: { label: "Previous", color: "hsl(var(--chart-2))" },
              }}
            >
              <ResponsiveContainer>
                <BarChart data={expenseBreakdown}>
                  <CartesianGrid
                    stroke="hsl(var(--muted-foreground)/0.3)"
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    dataKey="category"
                    fontSize={12}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    fontSize={12}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <ChartTooltip />
                  <ChartLegend />
                  <Bar
                    dataKey="current"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="previous"
                    fill="hsl(var(--chart-2))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="grid gap-3 sm:grid-cols-3">
              {kpiHighlights.map((kpi) => (
                <div
                  className="rounded-lg border bg-card p-4 shadow-sm"
                  key={kpi.label}
                >
                  <p className="text-muted-foreground text-xs uppercase">
                    {kpi.label}
                  </p>
                  <p className="font-semibold text-xl">{kpi.value}</p>
                  <p className="text-emerald-500 text-xs">{kpi.change}</p>
                  <p className="text-muted-foreground text-xs">{kpi.helper}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Distribution log</CardTitle>
            <p className="text-muted-foreground text-sm">
              Watch which stakeholders consumed the latest analytics pack.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-3">
              {[
                "Board pack sent to directors",
                "Finance summary shared with CFO",
                "Investor update delivered to VCs",
              ].map((entry, index) => (
                <div className="rounded-md border bg-muted/40 p-3" key={entry}>
                  <p className="font-medium">{entry}</p>
                  <p className="text-muted-foreground text-xs">
                    Delivered {index + 1} days ago
                  </p>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs uppercase">
                Upcoming schedules
              </p>
              <ul className="space-y-2">
                <li className="flex items-center justify-between">
                  <span>Monthly board pack</span>
                  <span className="text-muted-foreground text-xs">
                    Due 28 Nov
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Weekly finance digest</span>
                  <span className="text-muted-foreground text-xs">
                    Due Friday 9am
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Investor call summary</span>
                  <span className="text-muted-foreground text-xs">
                    Due 4 Dec
                  </span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
