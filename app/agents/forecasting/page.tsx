"use client";

import { CalendarRange, RefreshCw } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/toast";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { forecastModelLibrary } from "@/lib/agents/forecasting/config";

const forecastSeries = [
  { month: "Nov", base: 280_000, best: 310_000, worst: 240_000 },
  { month: "Dec", base: 292_000, best: 332_000, worst: 238_000 },
  { month: "Jan", base: 276_000, best: 325_000, worst: 225_000 },
  { month: "Feb", base: 268_000, best: 320_000, worst: 219_000 },
  { month: "Mar", base: 260_000, best: 318_000, worst: 210_000 },
  { month: "Apr", base: 254_000, best: 315_000, worst: 204_000 },
  { month: "May", base: 247_000, best: 308_000, worst: 197_000 },
  { month: "Jun", base: 241_000, best: 302_000, worst: 191_000 },
  { month: "Jul", base: 236_000, best: 296_000, worst: 185_000 },
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
  const router = useRouter();
  const currentMonth = useMemo(
    () => new Date().toISOString().slice(0, 7),
    []
  );
  const [modelId, setModelId] = useState(forecastModelLibrary[0].id);
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [horizonMonths, setHorizonMonths] = useState("12");
  const [currency, setCurrency] = useState("AUD");
  const [openingCash, setOpeningCash] = useState("");
  const [revenueNotes, setRevenueNotes] = useState("");
  const [costNotes, setCostNotes] = useState("");
  const [growthSignals, setGrowthSignals] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [includeBestCase, setIncludeBestCase] = useState(true);
  const [includeWorstCase, setIncludeWorstCase] = useState(true);
  const [assumptions, setAssumptions] = useState(assumptionDefaults);

  const selectedModel = useMemo(
    () =>
      forecastModelLibrary.find((model) => model.id === modelId) ??
      forecastModelLibrary[0],
    [modelId]
  );

  const parseList = (value: string) =>
    value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const horizonValue = Number.parseInt(horizonMonths, 10);
    if (!Number.isFinite(horizonValue) || horizonValue < 3) {
      toast({
        type: "error",
        description: "Please provide a horizon between 3 and 36 months.",
      });
      return;
    }

    const openingCashValue = openingCash.trim()
      ? Number.parseFloat(openingCash.replace(/[^0-9.-]/g, ""))
      : null;

    if (openingCash.trim() && !Number.isFinite(openingCashValue ?? undefined)) {
      toast({
        type: "error",
        description: "Opening cash must be a valid number.",
      });
      return;
    }

    const assumptionOverrides = Object.fromEntries(
      Object.entries(assumptions).filter(([, value]) => value.trim())
    );

    const payload = {
      modelId,
      includeOptimistic: includeBestCase,
      includePessimistic: includeWorstCase,
      variables: {
        startMonth,
        horizonMonths: horizonValue,
        currency: currency.trim() || "AUD",
        openingCash: openingCashValue,
        revenueStreams: parseList(revenueNotes),
        costDrivers: parseList(costNotes),
        notes: additionalNotes.trim() || undefined,
        growthSignals: parseList(growthSignals),
        assumptionOverrides,
      },
    } as const;

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/agents/forecasting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = "Failed to start the forecasting agent.";
        try {
          const data = await response.json();
          if (data?.error) {
            message = JSON.stringify(data.error);
          }
        } catch (_) {
          message = `${message} (unexpected response)`;
        }
        toast({ type: "error", description: message });
        return;
      }

      const data = await response.json();
      toast({
        type: "success",
        description: "Forecast workspace created. Redirecting to the chat…",
      });
      router.push(`/chat/${data.chatId}`);
    } catch (error) {
      const description =
        error instanceof Error
          ? error.message
          : "Unable to launch the forecasting agent.";
      toast({ type: "error", description });
    } finally {
      setIsSubmitting(false);
    }
  };

  const latestRun = useMemo(() => forecastSeries[0], []);
  const runSummary = `Latest run ${latestRun.month}: base $${latestRun.base.toLocaleString()} · upside $${latestRun.best.toLocaleString()} · downside $${latestRun.worst.toLocaleString()}`;

  return (
    <div className="space-y-10">
      <Card>
        <CardHeader className="flex flex-col gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="h-5 w-5 text-primary" />
            Launch Mastra financial forecast
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Provide the key drivers and we will spin up a dedicated forecasting
            chat. The agent will pull Xero context when available and deliver a
            spreadsheet artifact with scenarios.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase">
                  Financial model
                </Label>
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {forecastModelLibrary.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {selectedModel.description}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase">
                  Start month
                </Label>
                <Input
                  required
                  type="month"
                  value={startMonth}
                  onChange={(event) => setStartMonth(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase">
                  Horizon (months)
                </Label>
                <Input
                  required
                  min={3}
                  max={36}
                  type="number"
                  value={horizonMonths}
                  onChange={(event) => setHorizonMonths(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase">
                  Currency code
                </Label>
                <Input
                  value={currency}
                  onChange={(event) =>
                    setCurrency(event.target.value.toUpperCase())
                  }
                  placeholder="AUD"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-muted-foreground text-xs uppercase">
                  Opening cash balance
                </Label>
                <Input
                  inputMode="decimal"
                  placeholder="e.g. 250000"
                  value={openingCash}
                  onChange={(event) => setOpeningCash(event.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Leave blank to let the agent read the latest balance sheet
                  figure from Xero.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase">
                  Revenue streams & drivers
                </Label>
                <Textarea
                  rows={4}
                  value={revenueNotes}
                  placeholder="One per line e.g. Enterprise ARR: $180k average deal"
                  onChange={(event) => setRevenueNotes(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase">
                  Cost structure & investments
                </Label>
                <Textarea
                  rows={4}
                  value={costNotes}
                  placeholder="One per line e.g. Cloud infra: $48k/month"
                  onChange={(event) => setCostNotes(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase">
                  Growth signals or targets
                </Label>
                <Textarea
                  rows={3}
                  value={growthSignals}
                  placeholder="One per line e.g. Net revenue retention 118%"
                  onChange={(event) => setGrowthSignals(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase">
                  Additional notes
                </Label>
                <Textarea
                  rows={3}
                  value={additionalNotes}
                  placeholder="Board expectations, capital plans, or risk notes"
                  onChange={(event) => setAdditionalNotes(event.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md border border-primary/40 border-dashed bg-primary/5 p-3 text-xs">
              <p className="font-semibold">Template guidance</p>
              <p className="text-muted-foreground">{selectedModel.guidance}</p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-muted-foreground text-xs">
                Upside and downside toggles below will be honoured when the chat
                starts.
              </p>
              <Button
                className="md:w-auto"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    Preparing
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Launch forecasting chat
                    <RefreshCw className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarRange className="h-5 w-5 text-primary" />
              Forecast runway
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Confidence bands and scenario planning powered by the forecasting
              agent with LangGraph orchestration.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">
                  Current runway
                </p>
                <p className="font-semibold text-2xl">13.4 months</p>
                <p className="text-muted-foreground text-xs">Likely scenario</p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">
                  Cash out date
                </p>
                <p className="font-semibold text-2xl">Jul 2026</p>
                <p className="text-muted-foreground text-xs">
                  Based on blended assumptions
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-muted-foreground text-xs uppercase">
                  Confidence band
                </p>
                <p className="font-semibold text-2xl">±8%</p>
                <p className="text-muted-foreground text-xs">
                  Updated 2 days ago
                </p>
              </div>
            </div>

            <ChartContainer className="h-[320px]" config={scenarioConfig}>
              <ResponsiveContainer>
                <AreaChart data={forecastSeries}>
                  <defs>
                    <linearGradient id="base" x1="0" x2="0" y1="0" y2="1">
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
                    <linearGradient id="best" x1="0" x2="0" y1="0" y2="1">
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
                    <linearGradient id="worst" x1="0" x2="0" y1="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--chart-3))"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--chart-3))"
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
                  <Tooltip
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                  />
                  <ChartLegend />
                  <Area
                    dataKey="base"
                    fill="url(#base)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    type="monotone"
                  />
                  {includeBestCase ? (
                    <Area
                      dataKey="best"
                      fill="url(#best)"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      type="monotone"
                    />
                  ) : null}
                  {includeWorstCase ? (
                    <Area
                      dataKey="worst"
                      fill="url(#worst)"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      type="monotone"
                    />
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
              Focus on the scenarios that matter for upcoming board and investor
              reviews.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-4">
              <div>
                <p className="font-medium text-sm">Include upside scenario</p>
                <p className="text-muted-foreground text-xs">
                  Assumes accelerated enterprise deals close in Q1.
                </p>
              </div>
              <Switch
                checked={includeBestCase}
                onCheckedChange={setIncludeBestCase}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-4">
              <div>
                <p className="font-medium text-sm">Include downside scenario</p>
                <p className="text-muted-foreground text-xs">
                  Models churn spike and slower hiring.
                </p>
              </div>
              <Switch
                checked={includeWorstCase}
                onCheckedChange={setIncludeWorstCase}
              />
            </div>
            <Button className="w-full" variant="secondary">
              Refresh forecast run
              <RefreshCw className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-center text-muted-foreground text-xs">
              {runSummary}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Key assumptions</CardTitle>
            <p className="text-muted-foreground text-sm">
              Edit the variables feeding the agent’s regression and scenario
              generators.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(assumptions).map(([key, value]) => (
              <div className="space-y-2" key={key}>
                <Label className="text-muted-foreground text-xs uppercase">
                  {key.replace(/([A-Z])/g, " $1")}
                </Label>
                <Input
                  className="text-sm"
                  onChange={(event) =>
                    setAssumptions((prev) => ({
                      ...prev,
                      [key]: event.target.value,
                    }))
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
              <p className="text-muted-foreground text-xs">
                Impact: -2.5 months runway
              </p>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="font-medium">Enterprise deal push-outs</p>
              <p className="text-muted-foreground text-xs">
                Impact: -$120k cash by Mar
              </p>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="font-medium">Cloud cost overrun</p>
              <p className="text-muted-foreground text-xs">
                Impact: -0.9 months runway
              </p>
            </div>
            <div className="rounded-md border border-primary/40 border-dashed bg-primary/5 p-3 text-xs">
              <p className="font-semibold">Connect workflow agent</p>
              <p className="text-muted-foreground">
                Auto-create follow-up tasks when risk thresholds breach
                tolerance bands.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
