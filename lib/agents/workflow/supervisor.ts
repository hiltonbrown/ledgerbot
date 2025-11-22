import "server-only";

import { tool } from "ai";
import { z } from "zod";
import {
  atoAuditPackWorkflow,
  investorUpdateWorkflow,
  monthEndCloseWorkflow,
} from "./workflows";

/**
 * Execute Month-End Close workflow tool
 */
export const executeMonthEndCloseTool = tool({
  description:
    "Execute the Month-End Close workflow which processes documents, reconciles transactions, and generates analytics.",
  parameters: z.object({
    month: z.string().describe("Month to close (YYYY-MM format)"),
    userId: z.string(),
  }),
  execute: async ({ month, userId }) => {
    console.log(`[Workflow Supervisor] Executing Month-End Close for ${month}`);

    try {
      const run = await monthEndCloseWorkflow.createRunAsync();
      const workflowResult = await run.start({
        inputData: { month, userId },
      });

      // Extract success status and steps from workflow result
      if (workflowResult.status === "success") {
        const result = workflowResult.result;
        return {
          success: result.status === "complete",
          stepsCompleted: Object.keys(workflowResult.steps || {}).length,
          reportId: result.reportId,
          errors: [],
        };
      }

      // Workflow failed
      const errorMessage =
        "error" in workflowResult
          ? workflowResult.error.message
          : "Workflow execution failed";

      return {
        success: false,
        stepsCompleted: Object.keys(workflowResult.steps || {}).length,
        errors: [errorMessage],
      };
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
export const executeInvestorUpdateTool = tool({
  description:
    "Execute the Investor Update workflow which gathers financial data, creates forecasts, and prepares Q&A.",
  parameters: z.object({
    period: z.string().describe("Reporting period"),
    userId: z.string(),
  }),
  execute: async ({ period, userId }) => {
    console.log(
      `[Workflow Supervisor] Executing Investor Update for ${period}`
    );

    try {
      const run = await investorUpdateWorkflow.createRunAsync();
      const workflowResult = await run.start({
        inputData: { period, userId },
      });

      // Extract success status from workflow result
      if (workflowResult.status === "success") {
        const result = workflowResult.result;
        return {
          success: true,
          reportId: "investor-report-123", // Mock ID for now
          forecastId: "forecast-123", // Mock ID for now
        };
      }

      return {
        success: false,
      };
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
export const executeAtoAuditPackTool = tool({
  description:
    "Execute the ATO Audit Pack workflow which collects documents, and generates the audit package.",
  parameters: z.object({
    period: z.string().describe("Audit period"),
    userId: z.string(),
  }),
  execute: async ({ period, userId }) => {
    console.log(`[Workflow Supervisor] Executing ATO Audit Pack for ${period}`);

    try {
      const run = await atoAuditPackWorkflow.createRunAsync();
      const workflowResult = await run.start({
        inputData: { period, userId },
      });

      // Extract success status from workflow result
      if (workflowResult.status === "success") {
        const result = workflowResult.result;
        return {
          success: true,
          packId: result.packId,
          fileUrl: result.fileUrl,
        };
      }

      return {
        success: false,
      };
    } catch (error) {
      console.error("[Workflow Supervisor] ATO Audit Pack failed:", error);
      return {
        success: false,
      };
    }
  },
});
