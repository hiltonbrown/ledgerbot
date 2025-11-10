import "server-only";

import { Mastra } from "@mastra/core";
import { analyticsAgent } from "@/lib/agents/analytics/agent";
import { apAgent } from "@/lib/agents/ap/agent";
import { arAgent } from "@/lib/agents/ar/agent";
import { forecastingAgent } from "@/lib/agents/forecasting/agent";
import { qandaAgent } from "@/lib/agents/qanda/agent";
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
    analytics: analyticsAgent,
    workflow: workflowSupervisorAgent,
    ap: apAgent,
    ar: arAgent,
  },
});

/**
 * Helper to get an agent by name with type safety
 */
type AgentNames =
  | "qanda"
  | "forecasting"
  | "analytics"
  | "workflow"
  | "ap"
  | "ar";

export function getAgent<T extends AgentNames>(name: T) {
  return mastra.getAgent(name);
}

/**
 * Export all agents for direct use when needed
 */
export {
  qandaAgent,
  forecastingAgent,
  analyticsAgent,
  workflowSupervisorAgent,
  apAgent,
  arAgent,
};
