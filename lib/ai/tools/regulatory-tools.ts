import { tool } from "ai";
import { z } from "zod";
import { searchRegulatoryDocuments } from "../../regulatory/search";

/**
 * Regulatory Search Tool for AI SDK
 * Provides access to Australian regulatory documents for compliance questions
 */

export const regulatorySearch = tool({
  description: `Search Australian regulatory documents including employment law (Fair Work awards, minimum wages), tax rulings (ATO guidance, PAYG withholding, superannuation), and state payroll tax regulations.

Use this tool when users ask questions about:
- Australian employment law and modern awards
- Minimum wage rates and pay conditions
- Tax obligations and ATO rulings
- PAYG withholding requirements
- Superannuation guarantee rates
- State payroll tax thresholds and rates
- Compliance requirements for Australian businesses

The tool returns citations to official government sources with relevant excerpts and relevance scores. Results are ranked by relevance to help you provide accurate, authoritative answers.

Example queries:
- "minimum wage rates 2024"
- "superannuation guarantee percentage"
- "NSW payroll tax threshold"
- "PAYG withholding tax tables"
- "casual loading rates"`,

  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The search query. Use natural language describing what regulatory information you need. Examples: 'minimum wage', 'superannuation rates', 'payroll tax NSW'"
      ),
    category: z
      .enum(["award", "tax_ruling", "payroll_tax", "all"])
      .optional()
      .default("all")
      .describe(
        "Filter by document category: 'award' for employment law, 'tax_ruling' for ATO guidance, 'payroll_tax' for state taxes, or 'all' for everything"
      ),
    limit: z
      .number()
      .optional()
      .default(5)
      .describe("Maximum number of results to return (1-10, default: 5)"),
  }),

  execute: async ({ query, category, limit }) => {
    try {
      console.log("🤖 AI tool: regulatorySearch");
      console.log(`  Query: "${query}"`);
      console.log(`  Category: ${category}`);
      console.log(`  Limit: ${limit}`);

      // Cap limit at 10
      const cappedLimit = Math.min(limit || 5, 10);

      // Build category filter (undefined if "all")
      const categoryFilter =
        category === "all" ? undefined : [category as string];

      // Execute search (always filter to Australia)
      const results = await searchRegulatoryDocuments(query, {
        country: "AU",
        category: categoryFilter,
        limit: cappedLimit,
      });

      console.log(`  ✅ Found ${results.length} results`);

      // Format results for AI
      const formattedResults = results.map((r) => ({
        title: r.title,
        url: r.sourceUrl,
        category: r.category,
        excerpt: r.excerpt,
        relevanceScore: r.relevanceScore,
        effectiveDate: r.effectiveDate?.toISOString() ?? null,
      }));

      return {
        success: true,
        count: results.length,
        results: formattedResults,
        message:
          results.length === 0
            ? `No regulatory documents found matching "${query}". Try broadening your search terms.`
            : `Found ${results.length} relevant regulatory document${results.length === 1 ? "" : "s"}. Use these official sources to provide accurate compliance information.`,
      };
    } catch (error) {
      console.error("❌ Error in regulatorySearch tool:", error);
      return {
        success: false,
        count: 0,
        results: [],
        message: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

/**
 * Regulatory tools object for AI SDK
 */
export const regulatoryTools = {
  regulatorySearch,
};

/**
 * List of regulatory tool names for experimental_activeTools
 */
export const REGULATORY_TOOL_NAMES = Object.keys(regulatoryTools);
