import "server-only";

import { createStep, createWorkflow } from "@mastra/core";
import { z } from "zod";
import { listInvoicesDue } from "@/lib/db/queries/ar";
import { asOfOrToday } from "@/lib/util/dates";
import { redactLog } from "@/lib/util/redact";

/**
 * Workflow: AR Dunning Cycle
 *
 * Orchestrates: Triage → Fetch → Assess → Propose → Confirm → Act → Summarise
 */

// Step 1: Triage - Validate inputs
const triageStep = createStep({
  id: "ar-triage",
  inputSchema: z.object({
    userId: z.string(),
    asOf: z.string().optional(),
    minDaysOverdue: z.number().int().nonnegative().default(0),
    tone: z.enum(["polite", "firm", "final"]).default("polite"),
    autoConfirm: z.boolean().default(false),
  }),
  outputSchema: z.object({
    userId: z.string(),
    asOf: z.string(),
    minDaysOverdue: z.number(),
    tone: z.string(),
    autoConfirm: z.boolean(),
    status: z.enum(["ready", "invalid"]),
  }),
  execute: async ({ inputData }) => {
    console.log("[AR Dunning] Step 1: Triage", ...redactLog(inputData));

    const asOfDate = asOfOrToday(inputData.asOf);

    return {
      userId: inputData.userId,
      asOf: asOfDate.toISOString(),
      minDaysOverdue: inputData.minDaysOverdue,
      tone: inputData.tone,
      autoConfirm: inputData.autoConfirm,
      status: "ready" as const,
    };
  },
});

// Step 2: Fetch - Get invoices
const fetchInvoicesStep = createStep({
  id: "ar-fetch",
  inputSchema: z.object({
    userId: z.string(),
    asOf: z.string(),
    minDaysOverdue: z.number(),
    tone: z.string(),
    autoConfirm: z.boolean(),
    status: z.enum(["ready", "invalid"]),
  }),
  outputSchema: z.object({
    invoices: z.array(
      z.object({
        id: z.string(),
        number: z.string(),
        daysOverdue: z.number(),
        total: z.string(),
        contactName: z.string(),
      })
    ),
    count: z.number(),
    status: z.enum(["found", "empty"]),
  }),
  execute: async ({ inputData }) => {
    if (inputData.status !== "ready") {
      return { invoices: [], count: 0, status: "empty" as const };
    }

    console.log("[AR Dunning] Step 2: Fetching invoices");

    const result = await listInvoicesDue({
      userId: inputData.userId,
      asOf: new Date(inputData.asOf),
      minDaysOverdue: inputData.minDaysOverdue,
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

    return {
      invoices,
      count: invoices.length,
      status: invoices.length > 0 ? ("found" as const) : ("empty" as const),
    };
  },
});

// Step 3: Assess - Calculate risk
const assessRiskStep = createStep({
  id: "ar-assess",
  inputSchema: z.object({
    invoices: z.array(
      z.object({
        id: z.string(),
        number: z.string(),
        daysOverdue: z.number(),
        total: z.string(),
        contactName: z.string(),
      })
    ),
    count: z.number(),
    status: z.enum(["found", "empty"]),
  }),
  outputSchema: z.object({
    assessments: z.array(
      z.object({
        invoiceId: z.string(),
        invoiceNumber: z.string(),
        riskScore: z.number(),
        recommendedTone: z.string(),
      })
    ),
    status: z.enum(["assessed", "skipped"]),
  }),
  execute: async ({ inputData }) => {
    if (inputData.status !== "found") {
      return { assessments: [], status: "skipped" as const };
    }

    console.log("[AR Dunning] Step 3: Assessing risk");

    const assessments = inputData.invoices.map((inv) => {
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

    return {
      assessments,
      status: "assessed" as const,
    };
  },
});

// Step 4: Propose - Present plan
const proposePlanStep = createStep({
  id: "ar-propose",
  inputSchema: z.object({
    assessments: z.array(
      z.object({
        invoiceId: z.string(),
        invoiceNumber: z.string(),
        riskScore: z.number(),
        recommendedTone: z.string(),
      })
    ),
    status: z.enum(["assessed", "skipped"]),
  }),
  outputSchema: z.object({
    plan: z.array(
      z.object({
        invoiceId: z.string(),
        invoiceNumber: z.string(),
        action: z.string(),
        tone: z.string(),
      })
    ),
    summary: z.string(),
    status: z.enum(["proposed", "skipped"]),
  }),
  execute: async ({ inputData, getInitData }) => {
    if (inputData.status !== "assessed") {
      return {
        plan: [],
        summary: "No invoices to process",
        status: "skipped" as const,
      };
    }

    console.log("[AR Dunning] Step 4: Proposing plan");

    const workflowInput = getInitData();

    const plan = inputData.assessments.map((assessment) => ({
      invoiceId: assessment.invoiceId,
      invoiceNumber: assessment.invoiceNumber,
      action: "generate_email_reminder",
      tone: workflowInput.tone || assessment.recommendedTone,
    }));

    const summary = `Dunning plan for ${plan.length} invoice(s). Recommended actions generated based on risk assessment.`;

    return {
      plan,
      summary,
      status: "proposed" as const,
    };
  },
});

// Step 5: Act - Generate artefacts (only if autoConfirm or explicit confirmation)
const generateArtefactsStep = createStep({
  id: "ar-act",
  inputSchema: z.object({
    plan: z.array(
      z.object({
        invoiceId: z.string(),
        invoiceNumber: z.string(),
        action: z.string(),
        tone: z.string(),
      })
    ),
    summary: z.string(),
    status: z.enum(["proposed", "skipped"]),
  }),
  outputSchema: z.object({
    artefacts: z.array(
      z.object({
        invoiceId: z.string(),
        artefactId: z.string(),
        channel: z.string(),
      })
    ),
    status: z.enum(["complete", "skipped"]),
  }),
  execute: async ({ inputData, getInitData }) => {
    const workflowInput = getInitData();

    // Only proceed if autoConfirm is true
    if (!workflowInput.autoConfirm || inputData.status !== "proposed") {
      console.log(
        "[AR Dunning] Step 5: Skipped (autoConfirm=false or no plan)"
      );
      return { artefacts: [], status: "skipped" as const };
    }

    console.log("[AR Dunning] Step 5: Generating artefacts (autoConfirm=true)");

    // TODO: In production, call buildEmailReminderTool for each invoice
    // For now, create mock artefacts
    const artefacts = inputData.plan.map((item) => ({
      invoiceId: item.invoiceId,
      artefactId: `artefact-${item.invoiceId}`,
      channel: "email",
    }));

    return {
      artefacts,
      status: "complete" as const,
    };
  },
});

// Create the workflow
export const arDunningWorkflow = createWorkflow({
  id: "ar-dunning-cycle",
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
})
  .then(triageStep)
  .then(fetchInvoicesStep)
  .then(assessRiskStep)
  .then(proposePlanStep)
  .then(generateArtefactsStep)
  .commit();

export type ArDunningWorkflowInput = z.infer<
  typeof arDunningWorkflow.inputSchema
>;
export type ArDunningWorkflowOutput = z.infer<
  typeof arDunningWorkflow.outputSchema
>;
