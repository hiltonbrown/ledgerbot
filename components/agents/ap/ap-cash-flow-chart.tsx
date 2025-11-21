"use client";

import { Card } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";

interface CashFlowDataPoint {
  date: string;
  billsDue: number;
  amountDue: number;
  cumulativeAmount: number;
}

interface APCashFlowChartProps {
  data: CashFlowDataPoint[];
  isLoading?: boolean;
}

export function APCashFlowChart({ data, isLoading }: APCashFlowChartProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/3 rounded bg-muted" />
          <div className="h-48 w-full rounded bg-muted" />
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 font-semibold text-lg">Cash Flow Forecast</h3>
        <p className="text-center text-muted-foreground">No forecast data available</p>
      </Card>
    );
  }

  // Calculate max value for scaling
  const maxAmount = Math.max(...data.map((d) => d.cumulativeAmount), 1);

  // Get total cumulative for period
  const totalCumulative = data[data.length - 1]?.cumulativeAmount || 0;
  const avgDaily = totalCumulative / data.length;

  // Find peak day
  const peakDay = data.reduce((max, d) =>
    d.amountDue > max.amountDue ? d : max, data[0]
  );

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">Cash Flow Forecast</h3>
          <p className="text-muted-foreground text-sm">
            Cumulative payment obligations
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-sm">Total Period</p>
          <p className="font-bold text-2xl">
            ${totalCumulative.toLocaleString("en-AU", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6 space-y-2">
        {data.map((point, idx) => {
          const percentage = maxAmount > 0 ? (point.cumulativeAmount / maxAmount) * 100 : 0;
          const hasPayments = point.amountDue > 0;
          const date = new Date(point.date);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <div key={point.date} className="group">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className={`font-medium ${isWeekend ? "text-muted-foreground" : ""}`}>
                  {date.toLocaleDateString("en-AU", {
                    month: "short",
                    day: "numeric"
                  })}
                  {isWeekend && <span className="ml-1 text-muted-foreground">(Weekend)</span>}
                </span>
                <div className="flex items-center gap-2">
                  {hasPayments && (
                    <span className="text-muted-foreground">
                      {point.billsDue} {point.billsDue === 1 ? "bill" : "bills"}
                    </span>
                  )}
                  <span className={hasPayments ? "font-semibold" : "text-muted-foreground"}>
                    ${point.cumulativeAmount.toLocaleString("en-AU")}
                  </span>
                </div>
              </div>
              <div className="relative h-6 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all duration-500 ${
                    hasPayments
                      ? point.amountDue > avgDaily * 1.5
                        ? "bg-red-500"
                        : point.amountDue > avgDaily
                          ? "bg-orange-500"
                          : "bg-blue-500"
                      : "bg-muted"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
                {hasPayments && (
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-white text-xs font-medium drop-shadow-md">
                      +${point.amountDue.toLocaleString("en-AU")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 border-t pt-4">
        <div>
          <div className="mb-1 flex items-center gap-1 text-muted-foreground text-sm">
            <TrendingUp className="h-4 w-4" />
            Average Daily
          </div>
          <p className="font-semibold text-lg">
            ${avgDaily.toLocaleString("en-AU", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1 text-muted-foreground text-sm">
            <TrendingDown className="h-4 w-4 text-orange-500" />
            Peak Day
          </div>
          <p className="font-semibold text-lg">
            ${peakDay.amountDue.toLocaleString("en-AU", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-muted-foreground text-xs">
            {new Date(peakDay.date).toLocaleDateString("en-AU", {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    </Card>
  );
}
