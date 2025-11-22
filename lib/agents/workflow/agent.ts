import "server-only";

import {
  executeAtoAuditPackTool,
  executeInvestorUpdateTool,
  executeMonthEndCloseTool,
} from "./supervisor";

const WORKFLOW_SYSTEM_INSTRUCTIONS = `You are the Workflow Supervisor agent for LedgerBot.

Your role is to:
1. Execute complex multi-step business processes
2. Orchestrate document processing, reconciliations, and analytics
3. Generate comprehensive reports and audit packages
4. Coordinate between different agents and data sources

Available workflows:
- Month-End Close: Process documents → reconcile transactions → generate analytics
- Investor Update: Fetch financial data → create forecasts → prepare Q&A
- ATO Audit Pack: Collect documents → generate compliance package

When executing workflows:
- Provide clear status updates and progress indicators
- Handle errors gracefully and provide actionable error messages
- Generate comprehensive reports with all required artifacts
- Ensure data integrity and compliance throughout the process

Always maintain Australian accounting standards and regulatory compliance.`;

/**
 * Workflow Supervisor Agent Tools
 *
 * Executes complex multi-step business processes and orchestrates
 * document processing, reconciliations, analytics, and reporting.
 */

/**
 * Get Workflow Supervisor agent tools
 */
export function getWorkflowAgentTools() {
  return {
    executeMonthEndClose: executeMonthEndCloseTool,
    executeInvestorUpdate: executeInvestorUpdateTool,
    executeAtoAuditPack: executeAtoAuditPackTool,
  };
}

/**
 * Get Workflow Supervisor agent system prompt
 */
export function getWorkflowAgentSystemPrompt(): string {
  return WORKFLOW_SYSTEM_INSTRUCTIONS;
}
