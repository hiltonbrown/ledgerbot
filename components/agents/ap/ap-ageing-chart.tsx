"use client";

import { Card } from "@/components/ui/card";

export interface AgeingBucket {
  bucket: string;
  count: number;
  total: number;
}

interface APAgeingChartProps {
  ageingSummary: AgeingBucket[];
  isLoading?: boolean;
}

export function APAgeingChart({ ageingSummary, isLoading }: APAgeingChartProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/3 rounded bg-muted" />
          <div className="h-64 w-full rounded bg-muted" />
        </div>
      </Card>
    );
  }

  if (!ageingSummary || ageingSummary.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 font-semibold text-lg">Ageing Summary</h3>
        <p className="text-muted-foreground">No data available</p>
      </Card>
    );
  }

  // Calculate max value for scaling
  const maxTotal = Math.max(...ageingSummary.map((b) => b.total), 1);

  // Calculate total
  const grandTotal = ageingSummary.reduce((sum, b) => sum + b.total, 0);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="font-semibold text-lg">Ageing Summary</h3>
        <p className="text-muted-foreground text-sm">
          Outstanding bills by age
        </p>
      </div>

      <div className="space-y-4">
        {ageingSummary.map((bucket) => {
          const percentage = maxTotal > 0 ? (bucket.total / maxTotal) * 100 : 0;
          const shareOfTotal = grandTotal > 0 ? (bucket.total / grandTotal) * 100 : 0;

          // Determine color based on bucket
          let colorClass = "bg-green-500";
          if (bucket.bucket === "1-30") {
            colorClass = "bg-yellow-500";
          } else if (bucket.bucket === "31-60") {
            colorClass = "bg-orange-500";
          } else if (bucket.bucket === "61-90" || bucket.bucket === "90+") {
            colorClass = "bg-red-500";
          }

          return (
            <div key={bucket.bucket} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {bucket.bucket === "current" ? "Current" : `${bucket.bucket} days`}
                </span>
                <span className="text-muted-foreground">
                  {bucket.count} {bucket.count === 1 ? "bill" : "bills"} • $
                  {bucket.total.toLocaleString("en-AU", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="relative h-8 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all duration-500 ${colorClass}`}
                  style={{ width: `${percentage}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-medium text-sm text-white drop-shadow-md">
                    {shareOfTotal.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t pt-4">
        <div className="flex items-center justify-between font-semibold">
          <span>Total</span>
          <span>
            $
            {grandTotal.toLocaleString("en-AU", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
    </Card>
  );
}
