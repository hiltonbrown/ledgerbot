import "server-only";

import { chatModels } from "@/lib/ai/models";
import {
  getTokenUsageByUserId,
  getTokenUsageTimeseries,
} from "@/lib/db/queries";

// Legacy usage metric types (keep for backward compatibility)
export type UsageMetric = {
  id: string;
  label: string;
  used: number;
  limit: number;
  unit: string;
  helpText?: string;
};

export type UsageSummary = {
  billingCycle: string;
  lastUpdated: string;
  metrics: UsageMetric[];
};

// New token usage types
export type TokenUsageByModel = {
  modelId: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
};

export type TokenUsageSummary = {
  billingCycle: string;
  lastUpdated: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  byModel: TokenUsageByModel[];
  timeseries: {
    date: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }[];
};

// Legacy hardcoded data (keep for backward compatibility)
const USAGE_SUMMARY: UsageSummary = {
  billingCycle: "May 01 - May 31, 2024",
  lastUpdated: "2024-05-16T14:23:00.000Z",
  metrics: [
    {
      id: "api",
      label: "API Calls",
      used: 1280,
      limit: 5000,
      unit: "calls",
      helpText: "Tracked across all automations and chat sessions.",
    },
    {
      id: "storage",
      label: "Storage",
      used: 2.3,
      limit: 10,
      unit: "GB",
      helpText: "Includes uploaded files and generated artifacts.",
    },
    {
      id: "seats",
      label: "Seats",
      used: 4,
      limit: 10,
      unit: "users",
    },
  ],
};

export function getUsageSummary(): UsageSummary {
  return USAGE_SUMMARY;
}

function getModelName(modelId: string | null): string {
  if (!modelId) {
    return "Unknown Model";
  }

  const model = chatModels.find((m) => m.vercelId === modelId);
  return model?.name ?? modelId;
}

function calculateDateRange(period: "7d" | "30d" | "90d" | "all"): {
  startDate?: Date;
  endDate?: Date;
} {
  const now = new Date();
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  ); // Start of tomorrow

  switch (period) {
    case "7d":
      return {
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        endDate,
      };
    case "30d":
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate,
      };
    case "90d":
      return {
        startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        endDate,
      };
    case "all":
      return {};
    default:
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate,
      };
  }
}

export async function getTokenUsageSummary(
  userId: string,
  period: "7d" | "30d" | "90d" | "all" = "30d"
): Promise<TokenUsageSummary> {
  try {
    const { startDate, endDate } = calculateDateRange(period);

    // Fetch data from database
    const [usageByModel, timeseries] = await Promise.all([
      getTokenUsageByUserId({ userId, startDate, endDate }),
      getTokenUsageTimeseries({ userId, startDate, endDate }),
    ]);

    // Aggregate totals
    const totalInputTokens = usageByModel.reduce(
      (sum, row) => sum + row.promptTokens,
      0
    );
    const totalOutputTokens = usageByModel.reduce(
      (sum, row) => sum + row.completionTokens,
      0
    );
    const totalTokens = usageByModel.reduce(
      (sum, row) => sum + row.totalTokens,
      0
    );
    const totalCost = usageByModel.reduce((sum, row) => sum + row.cost, 0);

    // Format by model
    const byModel: TokenUsageByModel[] = usageByModel
      .filter((row) => row.modelId)
      .map((row) => ({
        modelId: row.modelId as string,
        modelName: getModelName(row.modelId),
        inputTokens: row.promptTokens,
        outputTokens: row.completionTokens,
        totalTokens: row.totalTokens,
        totalCost: row.cost,
        requestCount: row.chatCount,
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens); // Sort by usage descending

    // Format timeseries
    const formattedTimeseries = timeseries.map((row) => ({
      date: row.date,
      inputTokens: row.promptTokens,
      outputTokens: row.completionTokens,
      cost: row.cost,
    }));

    // Calculate billing cycle
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const billingCycle = `${firstDay.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${lastDay.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    return {
      billingCycle,
      lastUpdated: new Date().toISOString(),
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      totalCost,
      byModel,
      timeseries: formattedTimeseries,
    };
  } catch (error) {
    console.error("Failed to get token usage summary:", error);
    // Return empty data on error
    return {
      billingCycle: "N/A",
      lastUpdated: new Date().toISOString(),
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      byModel: [],
      timeseries: [],
    };
  }
}
