import "server-only";

import { Mastra } from "@mastra/core";
import { qandaAgent } from "@/lib/agents/qanda/agent";
import { forecastingAgent } from "@/lib/agents/forecasting/agent";
import { reconciliationAgent } from "@/lib/agents/reconciliations/agent";
import { complianceAgent } from "@/lib/agents/compliance/agent";
import { analyticsAgent } from "@/lib/agents/analytics/agent";
import { workflowSupervisorAgent } from "@/lib/agents/workflow/supervisor";

/**
 * Shared Mastra instance for LedgerBot agents
 *
 * This centralizes all agent configurations, tools, and integrations.
 * Agents should be accessed via mastra.getAgent() rather than direct imports
 * to ensure proper runtime context and shared resources.
 */
export const mastra = new Mastra({
  agents: {
    qanda: qandaAgent,
    forecasting: forecastingAgent,
    reconciliation: reconciliationAgent,
    compliance: complianceAgent,
    analytics: analyticsAgent,
    workflow: workflowSupervisorAgent,
  },
});

/**
 * Helper to get an agent by name with type safety
 */
export function getAgent<T extends keyof typeof mastra.agents>(name: T) {
  return mastra.getAgent(name);
}

/**
 * Export all agents for direct use when needed
 */
export {
  qandaAgent,
  forecastingAgent,
  reconciliationAgent,
  complianceAgent,
  analyticsAgent,
  workflowSupervisorAgent,
};
