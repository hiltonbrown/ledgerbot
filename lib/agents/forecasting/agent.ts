import { generateText } from "ai";
import { z } from "zod";
import { formatNumberWithCurrency } from "@/lib/agents/forecasting/utils";
import { myProvider } from "@/lib/ai/providers";
import { type ForecastModelId, getModelMeta } from "./config";
import { createForecastingXeroTools } from "./tools";

const RESPONSE_SCHEMA = z.object({
  executiveSummary: z.string().min(1),
  clarifyingQuestions: z.array(z.string()).min(1),
  revenueNarrative: z.array(z.string()).optional(),
  visualizationNotes: z.array(z.string()).optional(),
  scenarios: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().min(1),
        rationale: z.string().optional(),
        assumptions: z.array(z.string()).optional(),
        openingCash: z.number().optional(),
        monthly: z
          .array(
            z.object({
              period: z.string().min(1),
              revenue: z.union([z.number(), z.string()]),
              cogs: z.union([z.number(), z.string()]).optional(),
              operatingExpenses: z.union([z.number(), z.string()]).optional(),
              grossMargin: z.union([z.number(), z.string()]).optional(),
              netCashFlow: z.union([z.number(), z.string()]).optional(),
              endingCash: z.union([z.number(), z.string()]).optional(),
            })
          )
          .min(1),
      })
    )
    .min(1),
});

export type ForecastingAgentVariables = {
  startMonth: string;
  horizonMonths: number;
  currency: string;
  openingCash?: number | null;
  revenueStreams: string[];
  costDrivers: string[];
  notes?: string;
  growthSignals?: string[];
  assumptionOverrides?: Record<string, string>;
};

export type ForecastingAgentRun = {
  csv: string;
  assistantSummary: string;
  clarifyingQuestions: string[];
  visualizationNotes: string[];
  scenarioLabels: string[];
};

function cleanJson(text: string) {
  return text.replace(/```json|```/g, "").trim();
}

function normaliseNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const parsed = Number.parseFloat(cleaned);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function buildScenarioCsv(
  scenarios: z.infer<typeof RESPONSE_SCHEMA>["scenarios"][number][],
  currency: string
) {
  const header = [
    "Scenario",
    "Period",
    `Revenue (${currency})`,
    `COGS (${currency})`,
    `Operating Expenses (${currency})`,
    `Gross Margin (${currency})`,
    `Net Cash Flow (${currency})`,
    `Ending Cash (${currency})`,
  ];

  const rows = [header.join(",")];

  for (const scenario of scenarios) {
    const scenarioLabel = scenario.label;
    for (const month of scenario.monthly) {
      const revenue = normaliseNumber(month.revenue);
      const cogs = normaliseNumber(month.cogs);
      const operatingExpenses = normaliseNumber(month.operatingExpenses);
      const grossMargin = month.grossMargin
        ? normaliseNumber(month.grossMargin)
        : revenue - cogs;
      const netCash = month.netCashFlow
        ? normaliseNumber(month.netCashFlow)
        : revenue - cogs - operatingExpenses;
      const endingCash = month.endingCash
        ? normaliseNumber(month.endingCash)
        : netCash;

      rows.push(
        [
          JSON.stringify(scenarioLabel),
          JSON.stringify(month.period),
          revenue.toFixed(2),
          cogs.toFixed(2),
          operatingExpenses.toFixed(2),
          grossMargin.toFixed(2),
          netCash.toFixed(2),
          endingCash.toFixed(2),
        ].join(",")
      );
    }
  }

  return rows.join("\n");
}

function summariseScenario(
  scenario: z.infer<typeof RESPONSE_SCHEMA>["scenarios"][number],
  currency: string
) {
  const first = scenario.monthly[0];
  const last = scenario.monthly.at(-1)!;
  const openingRevenue = normaliseNumber(first.revenue);
  const closingRevenue = normaliseNumber(last.revenue);
  const endingCash = normaliseNumber(last.endingCash ?? last.netCashFlow ?? 0);
  const numberOfMonths = Math.max(scenario.monthly.length, 1);
  const cagr =
    ((closingRevenue / Math.max(openingRevenue, 1)) ** (12 / numberOfMonths) -
      1) *
    100;

  const highlightParts = [
    `${scenario.label}: ${formatNumberWithCurrency(closingRevenue, currency)} revenue by period end`,
    `ending cash ${formatNumberWithCurrency(endingCash, currency)}`,
    `implied CAGR ${cagr.toFixed(1)}%`,
  ];

  if (scenario.rationale) {
    highlightParts.push(`Driver: ${scenario.rationale}`);
  }

  if (scenario.assumptions?.length) {
    highlightParts.push(`Assumptions: ${scenario.assumptions.join("; ")}`);
  }

  return `- ${highlightParts.join(" · ")}`;
}

export async function runFinancialModelingAgent({
  userId,
  preferredModel,
  variables,
  includeOptimistic,
  includePessimistic,
  xeroContext,
  memorySnippets,
}: {
  userId: string;
  preferredModel: ForecastModelId;
  variables: ForecastingAgentVariables;
  includeOptimistic: boolean;
  includePessimistic: boolean;
  xeroContext?: string;
  memorySnippets?: string[];
}): Promise<ForecastingAgentRun> {
  const modelMeta = getModelMeta(preferredModel);

  const memorySection = memorySnippets?.length
    ? `# Retrieved memory highlights\n${memorySnippets
        .map((item) => `- ${item}`)
        .join("\n")}`
    : "";

  const prompt = `# Schema contract
{
  "executiveSummary": string,
  "clarifyingQuestions": string[],
  "visualizationNotes": string[],
  "scenarios": [
    {
      "id": string,
      "label": string,
      "rationale": string,
      "assumptions": string[],
      "openingCash": number,
      "monthly": [
        {
          "period": "YYYY-MM",
          "revenue": number,
          "cogs": number,
          "operatingExpenses": number,
          "grossMargin": number,
          "netCashFlow": number,
          "endingCash": number
        }
      ]
    }
  ]
}

# Engagement details
User: ${userId}
Requested template: ${modelMeta.label}
Template guidance: ${modelMeta.guidance}

# Timeframe
Start month: ${variables.startMonth}
Horizon: ${variables.horizonMonths} months
Currency: ${variables.currency}
Opening cash: ${formatNumberWithCurrency(
    variables.openingCash ?? 0,
    variables.currency
  )}

# Revenue streams
${variables.revenueStreams.length > 0 ? variables.revenueStreams.map((item) => `- ${item}`).join("\n") : "- None provided"}

# Cost structure inputs
${variables.costDrivers.length > 0 ? variables.costDrivers.map((item) => `- ${item}`).join("\n") : "- None provided"}

# Additional notes
${variables.notes ?? "-"}

# Growth or monitoring signals
${variables.growthSignals?.length ? variables.growthSignals.map((signal) => `- ${signal}`).join("\n") : "- None provided"}

# Assumption overrides
${
  variables.assumptionOverrides
    ? Object.entries(variables.assumptionOverrides)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join("\n")
    : "- No overrides"
}

# Scenario toggles
Always return the base/likely scenario. Include an Upside scenario if includeOptimistic=${includeOptimistic}. Include a Downside scenario if includePessimistic=${includePessimistic}.

# Connected Xero context
${xeroContext ?? "No live Xero data was available. Use internal best practice heuristics."}
${memorySection}

# Output format
Return ONLY valid JSON that matches the schema described above.
 - Numeric fields should be numbers (no currency symbols).
 - Period values should use YYYY-MM format.
 - Provide between 6 and 18 monthly rows per scenario, aligned to the requested horizon.
 - Clarifying questions should be actionable follow ups you would ask the operator.
`;

  const { text } = await generateText({
    model: myProvider.languageModel("openai-gpt-5-chat"),
    system:
      "You are the financial modeling agent for LedgerBot. Create rigorous financial forecasts blending provided inputs with accounting best practice. Tie recommendations back to revenue, cost, and cash flow levers. Maintain Australian accounting tone when discussing compliance or GST.",
    prompt,
  });

  const parsed = RESPONSE_SCHEMA.safeParse(JSON.parse(cleanJson(text)));

  if (!parsed.success) {
    throw new Error(
      `Unable to parse financial modeling response: ${parsed.error.message}`
    );
  }

  const response = parsed.data;
  const csv = buildScenarioCsv(response.scenarios, variables.currency);
  const scenarioSummaries = response.scenarios.map((scenario) =>
    summariseScenario(scenario, variables.currency)
  );

  const assistantSummary = `## Executive overview
${response.executiveSummary.trim()}

### Scenario highlights
${scenarioSummaries.join("\n")}

### Follow-up questions
${response.clarifyingQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n")}
`;

  return {
    csv,
    assistantSummary,
    clarifyingQuestions: response.clarifyingQuestions,
    visualizationNotes: response.visualizationNotes ?? [],
    scenarioLabels: response.scenarios.map((scenario) => scenario.label),
  };
}

const FORECASTING_INSTRUCTIONS = `You are the financial modeling agent for LedgerBot.

Your role is to:
1. Create rigorous financial forecasts blending provided inputs with accounting best practice
2. Generate multiple scenarios (base/likely, upside/best, downside/worst) based on user preferences
3. Tie recommendations back to revenue, cost, and cash flow levers
4. Maintain Australian accounting tone when discussing compliance or GST
5. Ask clarifying questions to sharpen forecast accuracy

When forecasting:
- Use Xero historical data when available to inform assumptions
- Apply industry benchmarks and best practices for unknown parameters
- Be conservative with revenue projections and realistic with cost assumptions
- Flag key risks and opportunities in each scenario
- Explain your reasoning for major assumptions

Output requirements:
- Monthly projections with revenue, COGS, operating expenses, gross margin, net cash flow, ending cash
- Executive summary highlighting key insights
- Scenario rationales and assumptions
- Actionable clarifying questions to refine the model
- Visualization suggestions for charts and graphs`;

/**
 * Get base Forecasting agent tools (without Xero integration)
 */
export function getForecastingAgentTools() {
  return {};
}

/**
 * Get Forecasting agent tools with Xero integration for a specific user
 */
export function getForecastingAgentToolsWithXero(userId: string) {
  const xeroTools = createForecastingXeroTools(userId);
  return xeroTools;
}

/**
 * Get Forecasting agent system prompt
 */
export function getForecastingAgentSystemPrompt(): string {
  return FORECASTING_INSTRUCTIONS;
}
