import "server-only";

import { createWorkflow, createStep } from "@mastra/core";
import { z } from "zod";
import { mastra } from "@/lib/mastra";

/**
 * Workflow: Month-End Close
 *
 * Orchestrates: Documents → Reconciliations → Compliance → Analytics
 */

// Step 1: Process and validate documents
const processDocumentsStep = createStep({
  id: "process-documents",
  inputSchema: z.object({
    month: z.string().describe("Month to process (YYYY-MM)"),
    userId: z.string(),
  }),
  outputSchema: z.object({
    documentsProcessed: z.number(),
    validationErrors: z.array(z.string()),
    status: z.enum(["complete", "partial", "failed"]),
  }),
  execute: async ({ inputData }) => {
    console.log(
      `[Month-End Close] Step 1: Processing documents for ${inputData.month}`
    );

    // In production, this would trigger the document management agent
    // to process all uploaded invoices, receipts, and bank statements

    return {
      documentsProcessed: 0,
      validationErrors: [],
      status: "complete",
    };
  },
});

// Step 2: Reconcile bank transactions
const reconcileTransactionsStep = createStep({
  id: "reconcile-transactions",
  inputSchema: z.object({
    month: z.string(),
    userId: z.string(),
  }),
  outputSchema: z.object({
    matchedCount: z.number(),
    exceptionsCount: z.number(),
    autoApprovedCount: z.number(),
    status: z.enum(["complete", "review_required", "failed"]),
  }),
  execute: async ({ inputData }) => {
    console.log(
      `[Month-End Close] Step 2: Reconciling transactions for ${inputData.month}`
    );

    // In production, this would run the reconciliation agent
    // to match bank feeds with ledger entries

    return {
      matchedCount: 0,
      exceptionsCount: 0,
      autoApprovedCount: 0,
      status: "complete",
    };
  },
});

// Step 3: Compliance checks
const complianceCheckStep = createStep({
  id: "compliance-check",
  inputSchema: z.object({
    month: z.string(),
    userId: z.string(),
  }),
  outputSchema: z.object({
    upcomingDeadlines: z.array(
      z.object({
        type: z.string(),
        dueDate: z.string(),
        priority: z.string(),
      })
    ),
    issues: z.array(z.string()),
    status: z.enum(["compliant", "warnings", "critical"]),
  }),
  execute: async ({ inputData }) => {
    console.log(
      `[Month-End Close] Step 3: Running compliance checks for ${inputData.month}`
    );

    // In production, this would run the compliance agent
    // to check BAS, PAYG, and super obligations

    return {
      upcomingDeadlines: [],
      issues: [],
      status: "compliant",
    };
  },
});

// Step 4: Generate analytics report
const generateAnalyticsStep = createStep({
  id: "generate-analytics",
  inputSchema: z.object({
    month: z.string(),
    userId: z.string(),
  }),
  outputSchema: z.object({
    reportId: z.string(),
    kpis: z.object({
      grossMargin: z.number(),
      netBurn: z.number(),
      runway: z.number(),
      revenueGrowth: z.number(),
    }),
    status: z.enum(["complete", "failed"]),
  }),
  execute: async ({ inputData }) => {
    console.log(
      `[Month-End Close] Step 4: Generating analytics for ${inputData.month}`
    );

    // In production, this would run the analytics agent
    // to create the financial report with KPIs and narrative

    return {
      reportId: "report-123",
      kpis: {
        grossMargin: 0,
        netBurn: 0,
        runway: 0,
        revenueGrowth: 0,
      },
      status: "complete",
    };
  },
});

export const monthEndCloseWorkflow = createWorkflow({
  id: "month-end-close",
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
})
  .then(processDocumentsStep)
  .then(reconcileTransactionsStep)
  .then(complianceCheckStep)
  .then(generateAnalyticsStep)
  .commit();

/**
 * Workflow: Investor Update
 *
 * Orchestrates: Analytics → Forecasting → Q&A
 */

const fetchFinancialDataStep = createStep({
  id: "fetch-financial-data",
  inputSchema: z.object({
    period: z.string(),
    userId: z.string(),
  }),
  outputSchema: z.object({
    revenue: z.array(z.number()),
    expenses: z.array(z.number()),
    cash: z.number(),
  }),
  execute: async ({ inputData }) => {
    console.log(
      `[Investor Update] Fetching financial data for ${inputData.period}`
    );

    // In production, fetch from Xero or database
    return {
      revenue: [100000, 110000, 120000],
      expenses: [80000, 85000, 90000],
      cash: 500000,
    };
  },
});

const createForecastStep = createStep({
  id: "create-forecast",
  inputSchema: z.object({
    period: z.string(),
    userId: z.string(),
    historicalData: z.object({
      revenue: z.array(z.number()),
      expenses: z.array(z.number()),
      cash: z.number(),
    }),
  }),
  outputSchema: z.object({
    forecastId: z.string(),
    scenarios: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    console.log(`[Investor Update] Creating forecast for ${inputData.period}`);

    // In production, run forecasting agent
    return {
      forecastId: "forecast-123",
      scenarios: ["Base", "Upside", "Downside"],
    };
  },
});

const prepareInvestorQAStep = createStep({
  id: "prepare-investor-qa",
  inputSchema: z.object({
    period: z.string(),
    userId: z.string(),
  }),
  outputSchema: z.object({
    qaPairs: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
  }),
  execute: async ({ inputData }) => {
    console.log(
      `[Investor Update] Preparing Q&A for ${inputData.period}`
    );

    // In production, use Q&A agent to generate anticipated investor questions
    return {
      qaPairs: [],
    };
  },
});

export const investorUpdateWorkflow = createWorkflow({
  id: "investor-update",
  inputSchema: z.object({
    period: z.string(),
    userId: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    reportId: z.string().optional(),
    forecastId: z.string().optional(),
  }),
})
  .then(fetchFinancialDataStep)
  .then(createForecastStep)
  .then(prepareInvestorQAStep)
  .commit();

/**
 * Workflow: ATO Audit Pack
 *
 * Orchestrates: Documents → Compliance → Workflow
 */

const collectAuditDocumentsStep = createStep({
  id: "collect-audit-documents",
  inputSchema: z.object({
    period: z.string(),
    userId: z.string(),
  }),
  outputSchema: z.object({
    documentIds: z.array(z.string()),
    documentCount: z.number(),
  }),
  execute: async ({ inputData }) => {
    console.log(`[ATO Audit Pack] Collecting documents for ${inputData.period}`);

    // In production, use document management agent to gather required documents
    return {
      documentIds: [],
      documentCount: 0,
    };
  },
});

const verifyComplianceStep = createStep({
  id: "verify-compliance",
  inputSchema: z.object({
    period: z.string(),
    userId: z.string(),
  }),
  outputSchema: z.object({
    compliant: z.boolean(),
    issues: z.array(z.string()),
    references: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    console.log(
      `[ATO Audit Pack] Verifying compliance for ${inputData.period}`
    );

    // In production, run compliance agent to verify all requirements
    return {
      compliant: true,
      issues: [],
      references: [],
    };
  },
});

const generateAuditPackStep = createStep({
  id: "generate-audit-pack",
  inputSchema: z.object({
    period: z.string(),
    userId: z.string(),
    documentIds: z.array(z.string()),
  }),
  outputSchema: z.object({
    packId: z.string(),
    fileUrl: z.string(),
  }),
  execute: async ({ inputData }) => {
    console.log(
      `[ATO Audit Pack] Generating audit pack for ${inputData.period}`
    );

    // In production, compile all documents into a PDF package
    return {
      packId: "audit-pack-123",
      fileUrl: "/files/audit-pack-123.pdf",
    };
  },
});

export const atoAuditPackWorkflow = createWorkflow({
  id: "ato-audit-pack",
  inputSchema: z.object({
    period: z.string(),
    userId: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    packId: z.string().optional(),
    fileUrl: z.string().optional(),
  }),
})
  .then(collectAuditDocumentsStep)
  .then(verifyComplianceStep)
  .then(generateAuditPackStep)
  .commit();
