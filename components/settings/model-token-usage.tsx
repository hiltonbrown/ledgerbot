"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { TokenUsageByModel } from "@/app/(settings)/api/usage/data";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function formatCost(cost: number): string {
  if (!Number.isFinite(cost)) return "$0.0000";
  return `$${cost.toFixed(4)}`;
}

function formatPercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function ModelTokenUsage({ models }: { models: TokenUsageByModel[] }) {
  const [openModels, setOpenModels] = useState<Set<string>>(new Set());

  const totalTokens = models.reduce((sum, m) => sum + m.totalTokens, 0);

  const toggleModel = (modelId: string) => {
    setOpenModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  };

  if (models.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground text-sm">
          No token usage data available yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {models.map((model) => {
        const isOpen = openModels.has(model.modelId);
        const usagePercentage = formatPercentage(
          model.totalTokens,
          totalTokens
        );

        return (
          <Collapsible
            className="rounded-lg border bg-card"
            key={model.modelId}
            onOpenChange={() => toggleModel(model.modelId)}
            open={isOpen}
          >
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base">{model.modelName}</h3>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs">
                    {usagePercentage}%
                  </span>
                </div>
                <div className="flex gap-4 text-muted-foreground text-sm">
                  <span>{formatNumber(model.totalTokens)} tokens</span>
                  <span>{formatCost(model.totalCost)}</span>
                  <span>{formatNumber(model.requestCount)} requests</span>
                </div>
                <Progress className="mt-2" value={usagePercentage} />
              </div>
              <CollapsibleTrigger asChild>
                <Button size="sm" type="button" variant="ghost">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span className="sr-only">Toggle details</span>
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
              <div className="border-t p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="font-medium text-muted-foreground text-xs">
                      Input Tokens
                    </p>
                    <p className="font-semibold text-foreground text-sm">
                      {formatNumber(model.inputTokens)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatPercentage(model.inputTokens, model.totalTokens)}%
                      of total
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-muted-foreground text-xs">
                      Output Tokens
                    </p>
                    <p className="font-semibold text-foreground text-sm">
                      {formatNumber(model.outputTokens)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatPercentage(model.outputTokens, model.totalTokens)}%
                      of total
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-muted-foreground text-xs">
                      Average Cost per Request
                    </p>
                    <p className="font-semibold text-foreground text-sm">
                      {formatCost(
                        model.requestCount > 0
                          ? model.totalCost / model.requestCount
                          : 0
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-muted-foreground text-xs">
                      Total Requests
                    </p>
                    <p className="font-semibold text-foreground text-sm">
                      {formatNumber(model.requestCount)}
                    </p>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
