import "server-only";

import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import {
  monthEndCloseWorkflow,
  investorUpdateWorkflow,
  atoAuditPackWorkflow,
} from "./workflows";

/**
 * Execute Month-End Close workflow tool
 */
const executeMonthEndCloseTool = createTool({
  id: "executeMonthEndClose",
  description:
    "Execute the Month-End Close workflow which processes documents, reconciles transactions, runs compliance checks, and generates analytics.",
  inputSchema: z.object({
    month: z.string().describe("Month to close (YYYY-MM format)"),
    userId: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    stepsCompleted: z.number(),
    reportId: z.string().optional(),
    errors: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    console.log(
      `[Workflow Supervisor] Executing Month-End Close for ${inputData.month}`
    );

    try {
      const result = await monthEndCloseWorkflow.start(inputData);
      return result;
    } catch (error) {
      console.error("[Workflow Supervisor] Month-End Close failed:", error);
      return {
        success: false,
        stepsCompleted: 0,
        errors: [
          error instanceof Error ? error.message : "Unknown error occurred",
        ],
      };
    }
  },
});

/**
 * Execute Investor Update workflow tool
 */
const executeInvestorUpdateTool = createTool({
  id: "executeInvestorUpdate",
  description:
    "Execute the Investor Update workflow which gathers financial data, creates forecasts, and prepares Q&A.",
  inputSchema: z.object({
    period: z.string().describe("Reporting period"),
    userId: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    reportId: z.string().optional(),
    forecastId: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    console.log(
      `[Workflow Supervisor] Executing Investor Update for ${inputData.period}`
    );

    try {
      const result = await investorUpdateWorkflow.start(inputData);
      return result;
    } catch (error) {
      console.error("[Workflow Supervisor] Investor Update failed:", error);
      return {
        success: false,
      };
    }
  },
});

/**
 * Execute ATO Audit Pack workflow tool
 */
const executeAtoAuditPackTool = createTool({
  id: "executeAtoAuditPack",
  description:
    "Execute the ATO Audit Pack workflow which collects documents, verifies compliance, and generates the audit package.",
  inputSchema: z.object({
    period: z.string().describe("Audit period"),
    userId: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    packId: z.string().optional(),
    fileUrl: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    console.log(
      `[Workflow Supervisor] Executing ATO Audit Pack for ${inputData.period}`
    );

    try {
      const result = await atoAuditPackWorkflow.start(inputData);
      return result;
    } catch (error) {
      console.error("[Workflow Supervisor] ATO Audit Pack failed:", error);
      return {
        success: false,
      };
    }
  },
});

const SUPERVISOR_INSTRUCTIONS = `You are the Workflow Supervisor agent for LedgerBot.

Your role is to:
1. Orchestrate multi-agent workflows for complex accounting processes
2. Coordinate between document processing, reconciliation, compliance, analytics, and forecasting agents
3. Track workflow execution status and handle failures gracefully
4. Provide visibility into multi-step operations

Available Workflows:
1. **Month-End Close** (executeMonthEndClose): Processes documents → reconciles transactions → runs compliance checks → generates analytics report
2. **Investor Update** (executeInvestorUpdate): Gathers financial data → creates forecasts → prepares Q&A
3. **ATO Audit Pack** (executeAtoAuditPack): Collects documents → verifies compliance → generates audit package

When executing workflows:
- Determine which workflow the user needs based on their request
- Use the appropriate workflow tool to execute
- Monitor workflow progress and report status
- If a workflow fails, explain which step failed and why
- Suggest corrective actions for failures
- Provide estimated completion times when possible

Workflow Selection Guide:
- Month-end accounting tasks → Month-End Close
- Board updates, fundraising → Investor Update
- ATO audit, compliance review → ATO Audit Pack

Best Practices:
- Run workflows during off-peak hours when possible
- Validate prerequisites before starting (e.g., Xero connection, documents uploaded)
- Provide clear progress updates
- Flag dependencies and blockers early
- Offer manual alternatives if automated workflow isn't appropriate`;

/**
 * Workflow Supervisor Agent
 */
export const workflowSupervisorAgent = new Agent({
  name: "workflow-supervisor",
  instructions: SUPERVISOR_INSTRUCTIONS,
  model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
  tools: {
    executeMonthEndClose: executeMonthEndCloseTool,
    executeInvestorUpdate: executeInvestorUpdateTool,
    executeAtoAuditPack: executeAtoAuditPackTool,
  },
});
