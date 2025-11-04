export const forecastModelLibrary = [
  {
    id: "three-statement" as const,
    label: "Three-statement driver model",
    description:
      "Integrates revenue, expense, and balance sheet drivers to project cash with a classic P&L/BS/CF structure.",
    guidance:
      "Use when you need a holistic operating model anchored in driver-based assumptions that roll into all three financial statements.",
  },
  {
    id: "saas-cohort" as const,
    label: "SaaS retention & cohort model",
    description:
      "Focuses on ARR, logo churn, expansion, and cohort retention dynamics for subscription businesses.",
    guidance:
      "Ideal for subscription products where net revenue retention, seat additions, and churn cohorts are key planning inputs.",
  },
  {
    id: "marketplace" as const,
    label: "Marketplace GMV flywheel",
    description:
      "Models take rates, GMV growth, liquidity incentives, and supply/demand acquisition costs.",
    guidance:
      "Use for marketplace or network businesses where GMV, take rates, and incentive spend drive margins.",
  },
  {
    id: "services-capacity" as const,
    label: "Services capacity planning",
    description:
      "Maps billable capacity, utilization, blended rates, and staffing plans to forecast revenue and delivery costs.",
    guidance:
      "Best for professional services teams balancing utilisation, headcount mix, and delivery margins.",
  },
] as const;

export type ForecastModelId =
  (typeof forecastModelLibrary)[number]["id"];

export const forecastModelIds = forecastModelLibrary.map(
  (item) => item.id
) as [ForecastModelId, ...ForecastModelId[]];

export function getModelMeta(modelId: ForecastModelId) {
  const model = forecastModelLibrary.find((item) => item.id === modelId);
  if (!model) {
    const fallback = forecastModelLibrary[0];
    return {
      ...fallback,
      note:
        "Requested model not found. Defaulting to the three-statement driver template.",
    };
  }
  return model;
}
