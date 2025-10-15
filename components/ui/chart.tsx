"use client";

import * as React from "react";
import type { LegendProps, TooltipProps } from "recharts";
import { Legend, Tooltip } from "recharts";

type LegendPayload = {
  dataKey?: string | number;
  value?: string | number;
  color?: string;
};

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color?: string;
  }
>;

const ChartContext = React.createContext<ChartConfig | null>(null);

function useChartConfig() {
  return React.useContext(ChartContext);
}

export type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  config: ChartConfig;
};

export function ChartContainer({
  config,
  className,
  children,
  style,
  ...props
}: ChartContainerProps) {
  const colorStyles = React.useMemo(() => {
    return Object.entries(config).reduce<React.CSSProperties>(
      (acc, [key, value]) => {
        if (!value?.color) {
          return acc;
        }

        const next = { ...acc } as Record<string, string>;
        next[`--color-${key}`] = value.color;
        return next as React.CSSProperties;
      },
      {}
    );
  }, [config]);

  return (
    <ChartContext.Provider value={config}>
      <div
        className={cn("flex w-full flex-col gap-4", className)}
        style={{ ...colorStyles, ...style }}
        {...props}
      >
        {children}
      </div>
    </ChartContext.Provider>
  );
}

export type ChartTooltipProps = TooltipProps<number, string> & {
  content?: TooltipProps<number, string>["content"];
};

export function ChartTooltip({ content, ...props }: ChartTooltipProps) {
  return <Tooltip {...props} content={content ?? ChartTooltipContent} />;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  const config = useChartConfig();

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-sm">
      {label ? <div className="mb-2 font-medium text-sm">{label}</div> : null}
      <div className="flex flex-col gap-1">
        {payload.map((item) => {
          if (!item || item.value == null) {
            return null;
          }

          const key = item.dataKey ?? item.name ?? "";
          const color =
            item.color ??
            (key && config?.[key]?.color) ??
            "hsl(var(--primary))";
          const displayLabel =
            (key && config?.[key]?.label) || item.name || key;

          return (
            <div className="flex items-center gap-2 text-sm" key={key}>
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-muted-foreground">{displayLabel}</span>
              <span className="ml-auto font-medium text-foreground">
                {typeof item.value === "number"
                  ? item.value.toLocaleString()
                  : item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type ChartLegendProps = LegendProps & {
  content?: LegendProps["content"];
};

export function ChartLegend({ content, ...props }: ChartLegendProps) {
  return (
    <Legend
      {...props}
      content={
        content ??
        ((legendProps: any) => <ChartLegendContent {...legendProps} />)
      }
    />
  );
}

export function ChartLegendContent({ payload }: LegendProps) {
  const config = useChartConfig();

  if (!payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      {payload.map((item) => {
        const data = item as LegendPayload;
        const key = data.dataKey?.toString() ?? data.value?.toString() ?? "";
        const color =
          data.color ?? (key && config?.[key]?.color) ?? "hsl(var(--primary))";
        const displayLabel = (key && config?.[key]?.label) || data.value || key;

        return (
          <div className="flex items-center gap-2" key={key}>
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-muted-foreground">{displayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
