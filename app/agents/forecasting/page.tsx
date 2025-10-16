"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarRange, RefreshCw } from "lucide-react";
import { ChartContainer, ChartLegend } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const forecastSeries = [
  { month: "Nov", base: 280000, best: 310000, worst: 240000 },
  { month: "Dec", base: 292000, best: 332000, worst: 238000 },
  { month: "Jan", base: 276000, best: 325000, worst: 225000 },
  { month: "Feb", base: 268000, best: 320000, worst: 219000 },
  { month: "Mar", base: 260000, best: 318000, worst: 210000 },
  { month: "Apr", base: 254000, best: 315000, worst: 204000 },
  { month: "May", base: 247000, best: 308000, worst: 197000 },
  { month: "Jun", base: 241000, best: 302000, worst: 191000 },
  { month: "Jul", base: 236000, best: 296000, worst: 185000 },
];

const scenarioConfig = {
  base: { label: "Likely", color: "hsl(var(--primary))" },
  best: { label: "Upside", color: "hsl(var(--chart-2))" },
  worst: { label: "Downside", color: "hsl(var(--chart-3))" },
} as const;

const assumptionDefaults = {
  growthRate: "6%",
  hiringPlan: "3 engineers in Feb",
  marketingSpend: "$120k/qtr",
  churnRate: "3.2%",
};

export default function ForecastingAgentPage() {
  const [includeBestCase, setIncludeBestCase] = useState(true);
  const [includeWorstCase, setIncludeWorstCase] = useState(true);
  const [assumptions, setAssumptions] = useState(assumptionDefaults);

  const latestRun = useMemo(() => forecastSeries[0], []);
  const runSummary = `Latest run ${latestRun.month}: base $${latestRun.base.toLocaleString()} · upside $${latestRun.best.toLocaleString()} · downside $${latestRun.worst.toLocaleString()}`;

  return (
    <div className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarRange className="h-5 w-5 text-primary" />
              Forecast runway
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Confidence bands and scenario planning powered by the forecasting agent with LangGraph orchestration.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">Current runway</p>
                <p className="font-semibold text-2xl">13.4 months</p>
                <p className="text-muted-foreground text-xs">Likely scenario</p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">Cash out date</p>
                <p className="font-semibold text-2xl">Jul 2026</p>
                <p className="text-muted-foreground text-xs">Based on blended assumptions</p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">Confidence band</p>
                <p className="font-semibold text-2xl">±8%</p>
                <p className="text-muted-foreground text-xs">Updated 2 days ago</p>
              </div>
            </div>

            <ChartContainer className="h-[320px]" config={scenarioConfig}>
              <ResponsiveContainer>
                <AreaChart data={forecastSeries}>
                  <defs>
                    <linearGradient id="base" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="best" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="worst" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--muted-foreground)/0.3)" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <ChartLegend />
                  <Area dataKey="base" fill="url(#base)" stroke="hsl(var(--primary))" strokeWidth={2} type="monotone" />
                  {includeBestCase ? (
                    <Area dataKey="best" fill="url(#best)" stroke="hsl(var(--chart-2))" strokeWidth={2} type="monotone" />
                  ) : null}
                  {includeWorstCase ? (
                    <Area dataKey="worst" fill="url(#worst)" stroke="hsl(var(--chart-3))" strokeWidth={2} type="monotone" />
                  ) : null}
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Scenario toggles</CardTitle>
            <p className="text-muted-foreground text-sm">
              Focus on the scenarios that matter for upcoming board and investor reviews.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-4">
              <div>
                <p className="font-medium text-sm">Include upside scenario</p>
                <p className="text-muted-foreground text-xs">Assumes accelerated enterprise deals close in Q1.</p>
              </div>
              <Switch checked={includeBestCase} onCheckedChange={setIncludeBestCase} />
            </div>
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-4">
              <div>
                <p className="font-medium text-sm">Include downside scenario</p>
                <p className="text-muted-foreground text-xs">Models churn spike and slower hiring.</p>
              </div>
              <Switch checked={includeWorstCase} onCheckedChange={setIncludeWorstCase} />
            </div>
            <Button className="w-full" variant="secondary">
              Refresh forecast run
              <RefreshCw className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-muted-foreground text-xs text-center">{runSummary}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Key assumptions</CardTitle>
            <p className="text-muted-foreground text-sm">
              Edit the variables feeding the agent’s regression and scenario generators.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(assumptions).map(([key, value]) => (
              <div className="space-y-2" key={key}>
                <Label className="text-xs uppercase text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</Label>
                <Input
                  className="text-sm"
                  onChange={(event) =>
                    setAssumptions((prev) => ({ ...prev, [key]: event.target.value }))
                  }
                  value={value}
                />
              </div>
            ))}
            <Button className="w-full" variant="outline">
              Save assumptions
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Risk heat map</CardTitle>
            <p className="text-muted-foreground text-sm">
              Highlights the first three triggers likely to derail the forecast.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="font-medium">Hiring plan slips by 60 days</p>
              <p className="text-muted-foreground text-xs">Impact: -2.5 months runway</p>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="font-medium">Enterprise deal push-outs</p>
              <p className="text-muted-foreground text-xs">Impact: -$120k cash by Mar</p>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="font-medium">Cloud cost overrun</p>
              <p className="text-muted-foreground text-xs">Impact: -0.9 months runway</p>
            </div>
            <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-xs">
              <p className="font-semibold">Connect workflow agent</p>
              <p className="text-muted-foreground">
                Auto-create follow-up tasks when risk thresholds breach tolerance bands.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
