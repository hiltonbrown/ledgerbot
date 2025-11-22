import "server-only";

import { z } from "zod";
import { listInvoicesDue } from "@/lib/db/queries/ar";
import { asOfOrToday } from "@/lib/util/dates";
import { redactLog } from "@/lib/util/redact";

/**
 * AR Dunning Cycle Workflow
 *
 * Orchestrates: Triage → Fetch → Assess → Propose → Confirm → Act → Summarise
 */

export interface ArDunningWorkflowInput {
  userId: string;
  asOf?: string;
  minDaysOverdue?: number;
  tone?: "polite" | "firm" | "final";
  autoConfirm?: boolean;
}

export interface ArDunningWorkflowOutput {
  success: boolean;
  artefactsCreated: number;
  commsEnabled: boolean;
  summary: string;
  invoices?: Array<{
    id: string;
    number: string;
    daysOverdue: number;
    total: string;
    contactName: string;
  }>;
  assessments?: Array<{
    invoiceId: string;
    invoiceNumber: string;
    riskScore: number;
    recommendedTone: string;
  }>;
  plan?: Array<{
    invoiceId: string;
    invoiceNumber: string;
    action: string;
    tone: string;
  }>;
}

/**
 * Execute AR Dunning Cycle workflow
 */
export async function executeArDunningWorkflow(
  input: ArDunningWorkflowInput
): Promise<ArDunningWorkflowOutput> {
  try {
    // Step 1: Triage - Validate inputs
    console.log("[AR Dunning] Step 1: Triage", ...redactLog(input));

    const asOfDate = asOfOrToday(input.asOf);
    const minDaysOverdue = input.minDaysOverdue ?? 0;
    const tone = input.tone ?? "polite";
    const autoConfirm = input.autoConfirm ?? false;

    // Step 2: Fetch - Get invoices
    console.log("[AR Dunning] Step 2: Fetching invoices");

    const result = await listInvoicesDue({
      userId: input.userId,
      asOf: asOfDate,
      minDaysOverdue,
    });

    const invoices = result.invoices.map((inv) => ({
      id: inv.id,
      number: inv.number,
      daysOverdue: inv.daysOverdue,
      total: inv.total,
      contactName: inv.contact.name,
    }));

    console.log(
      `[AR Dunning] Found ${invoices.length} invoices`,
      ...redactLog(invoices)
    );

    if (invoices.length === 0) {
      return {
        success: true,
        artefactsCreated: 0,
        commsEnabled: false,
        summary: "No overdue invoices found matching criteria.",
        invoices: [],
      };
    }

    // Step 3: Assess - Calculate risk
    console.log("[AR Dunning] Step 3: Assessing risk");

    const assessments = invoices.map((inv) => {
      // Calculate risk score based on days overdue
      let riskScore = 0.1; // Base risk
      if (inv.daysOverdue > 0) {
        const overdueRisk = Math.min(0.6, (inv.daysOverdue / 30) * 0.5);
        riskScore += overdueRisk;
      }
      // Amount factor
      const amount = Number.parseFloat(inv.total);
      if (amount > 10_000) {
        riskScore += 0.1;
      }
      riskScore = Math.min(0.95, Math.max(0.05, riskScore));

      // Recommend tone based on days overdue
      let recommendedTone = "polite";
      if (inv.daysOverdue >= 60) {
        recommendedTone = "final";
      } else if (inv.daysOverdue >= 30) {
        recommendedTone = "firm";
      }

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.number,
        riskScore,
        recommendedTone,
      };
    });

    // Step 4: Propose - Present plan
    console.log("[AR Dunning] Step 4: Proposing plan");

    const plan = assessments.map((assessment) => ({
      invoiceId: assessment.invoiceId,
      invoiceNumber: assessment.invoiceNumber,
      action: "generate_email_reminder",
      tone: tone || assessment.recommendedTone,
    }));

    const summary = `Dunning plan for ${plan.length} invoice(s). Recommended actions generated based on risk assessment.`;

    // Step 5: Act - Generate artefacts (only if autoConfirm)
    let artefactsCreated = 0;
    let commsEnabled = false;

    if (autoConfirm) {
      console.log(
        "[AR Dunning] Step 5: Generating artefacts (autoConfirm=true)"
      );

      // TODO: In production, call buildEmailReminderTool for each invoice
      // For now, create mock artefacts
      artefactsCreated = plan.length;
      commsEnabled = true;
    } else {
      console.log("[AR Dunning] Step 5: Skipped (autoConfirm=false)");
    }

    return {
      success: true,
      artefactsCreated,
      commsEnabled,
      summary,
      invoices,
      assessments,
      plan,
    };
  } catch (error) {
    console.error("[AR Dunning] Workflow failed:", error);
    return {
      success: false,
      artefactsCreated: 0,
      commsEnabled: false,
      summary: `Workflow failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// Legacy compatibility - create a workflow-like interface
export const arDunningWorkflow = {
  inputSchema: z.object({
    userId: z.string(),
    asOf: z.string().optional(),
    minDaysOverdue: z.number().int().nonnegative().default(0),
    tone: z.enum(["polite", "firm", "final"]).default("polite"),
    autoConfirm: z.boolean().default(false),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    artefactsCreated: z.number(),
    commsEnabled: z.boolean(),
    summary: z.string(),
  }),
  execute: executeArDunningWorkflow,
};
