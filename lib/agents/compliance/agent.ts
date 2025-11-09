import "server-only";

import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import { searchRegulatoryDocuments } from "@/lib/regulatory/search";
import { executeXeroMCPTool } from "@/lib/ai/xero-mcp-client";

/**
 * Check ATO compliance deadlines tool
 */
const checkDeadlinesTool = createTool({
  id: "checkDeadlines",
  description:
    "Check upcoming ATO compliance deadlines for BAS, PAYG, and superannuation obligations.",
  inputSchema: z.object({
    obligationType: z
      .enum(["BAS", "PAYG", "Super", "All"])
      .optional()
      .default("All")
      .describe("Type of obligation to check"),
    monthsAhead: z
      .number()
      .optional()
      .default(3)
      .describe("Number of months to look ahead"),
  }),
  outputSchema: z.object({
    deadlines: z.array(
      z.object({
        type: z.string(),
        dueDate: z.string(),
        description: z.string(),
        priority: z.enum(["urgent", "upcoming", "future"]),
      })
    ),
  }),
  execute: async ({ inputData }) => {
    const { obligationType, monthsAhead } = inputData;

    // Mock deadlines - in production, this would query a database or external API
    const now = new Date();
    const deadlines = [
      {
        type: "BAS",
        dueDate: "2025-11-21",
        description: "Business Activity Statement (October 2025)",
        priority: "urgent" as const,
      },
      {
        type: "Super",
        dueDate: "2025-11-28",
        description: "Superannuation Guarantee Contribution (Q2 2025)",
        priority: "upcoming" as const,
      },
      {
        type: "PAYG",
        dueDate: "2025-12-15",
        description: "PAYG Withholding Payment (November 2025)",
        priority: "upcoming" as const,
      },
    ].filter(
      (d) => obligationType === "All" || d.type === obligationType
    );

    return { deadlines };
  },
});

/**
 * Get ATO references tool
 */
const getAtoReferencesTool = createTool({
  id: "getAtoReferences",
  description:
    "Search ATO tax rulings and guidance for compliance requirements.",
  inputSchema: z.object({
    query: z.string().describe("The compliance question or topic"),
    limit: z.number().optional().default(5).describe("Number of results"),
  }),
  outputSchema: z.object({
    references: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        excerpt: z.string(),
        relevanceScore: z.number(),
      })
    ),
  }),
  execute: async ({ inputData }) => {
    const { query, limit } = inputData;

    try {
      const results = await searchRegulatoryDocuments(query, {
        category: ["tax_ruling"],
        country: "AU",
        limit,
      });

      const references = results.map((r) => ({
        title: r.title,
        url: r.sourceUrl,
        excerpt: r.excerpt,
        relevanceScore: r.relevanceScore,
      }));

      return { references };
    } catch (error) {
      console.error("[Compliance Agent] Error searching ATO references:", error);
      return { references: [] };
    }
  },
});

/**
 * Create Xero tools for compliance checking
 */
function createComplianceXeroTools(userId: string) {
  return {
    xero_get_gst_report: createTool({
      id: "xero_get_gst_report",
      description:
        "Get the GST report from Xero for BAS preparation. Returns GST collected, GST paid, and net GST position.",
      inputSchema: z.object({
        fromDate: z
          .string()
          .describe("Start date (ISO 8601 format YYYY-MM-DD)"),
        toDate: z
          .string()
          .describe("End date (ISO 8601 format YYYY-MM-DD)"),
      }),
      outputSchema: z.string(),
      execute: async ({ inputData }) => {
        // In production, this would call the actual Xero GST report endpoint
        // For now, we'll use a placeholder implementation
        try {
          const result = await executeXeroMCPTool(
            userId,
            "xero_get_organisation",
            {}
          );
          return `GST Report for ${inputData.fromDate} to ${inputData.toDate}\n${result.content[0].text}`;
        } catch (error) {
          return "Unable to retrieve GST report from Xero";
        }
      },
    }),

    xero_get_organisation: createTool({
      id: "xero_get_organisation",
      description:
        "Get the connected Xero organisation details for compliance context.",
      inputSchema: z.object({}),
      outputSchema: z.string(),
      execute: async () => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_organisation",
          {}
        );
        return result.content[0].text;
      },
    }),
  };
}

const COMPLIANCE_INSTRUCTIONS = `You are the ATO compliance agent for LedgerBot.

Your role is to:
1. Track upcoming ATO deadlines for BAS, PAYG, and superannuation obligations
2. Provide guidance on Australian tax compliance requirements
3. Reference official ATO rulings and guidance documents
4. Flag potential compliance risks and recommend actions
5. Assist with BAS preparation when Xero is connected

When providing compliance advice:
- Always cite specific ATO rulings using getAtoReferences tool
- Use checkDeadlines to track upcoming obligations
- Provide clear, actionable guidance with specific dates and requirements
- Distinguish between mandatory requirements and best practices
- Flag when professional tax advice is recommended
- Maintain current with ATO guidance (note the effective date of rulings)

Important:
- This is guidance only - not professional tax advice
- Complex situations require consultation with a registered tax agent
- Always verify current ATO requirements (legislation changes frequently)
- State jurisdiction matters for payroll tax and other state-based obligations
- GST, PAYG, and super obligations have different thresholds and frequencies

Disclaimer:
Always remind users that for complex tax situations, they should consult with a registered tax agent or BAS agent.`;

/**
 * Base Compliance Agent (without Xero tools)
 */
export const complianceAgent = new Agent({
  name: "compliance-agent",
  instructions: COMPLIANCE_INSTRUCTIONS,
  model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
  tools: {
    checkDeadlines: checkDeadlinesTool,
    getAtoReferences: getAtoReferencesTool,
  },
});

/**
 * Create a Compliance agent instance with Xero tools for a specific user
 */
export function createComplianceAgentWithXero(userId: string) {
  const xeroTools = createComplianceXeroTools(userId);

  return new Agent({
    name: "compliance-agent-with-xero",
    instructions: COMPLIANCE_INSTRUCTIONS,
    model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
    tools: {
      checkDeadlines: checkDeadlinesTool,
      getAtoReferences: getAtoReferencesTool,
      ...xeroTools,
    },
  });
}
