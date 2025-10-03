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
