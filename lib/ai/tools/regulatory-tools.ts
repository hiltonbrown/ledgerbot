import { tool } from "ai";
import { z } from "zod";
import { searchRegulatoryDocuments } from "../../regulatory/search";

export const regulatorySearch = tool({
  description: `Searches the Australian regulatory knowledge base for information on employment law, taxation, and payroll. 
    Use this tool to answer compliance questions and provide citations to official sources. 
    Good queries are specific, like "what is the minimum wage for a retail worker?" or "superannuation guarantee percentage".`,
  inputSchema: z.object({
    query: z.string().describe("The specific question or topic to search for."),
    category: z
      .enum(["award", "tax_ruling", "payroll_tax", "all"])
      .optional()
      .default("all")
      .describe("The category to search within."),
    limit: z
      .number()
      .max(10)
      .optional()
      .default(5)
      .describe("The maximum number of results to return."),
  }),
  execute: async (args) => {
    const { query, category, limit } = args;
    try {
      console.log(`[Regulatory Tool] Searching for: "${query}"`);
      const results = await searchRegulatoryDocuments(query, {
        category: category === "all" ? undefined : [category!],
        country: "AU",
        limit,
      });

      if (results.length === 0) {
        return {
          success: true,
          count: 0,
          results: [],
          message: "No results found.",
        };
      }

      const formattedResults = results.map((r) => ({
        title: r.title,
        url: r.sourceUrl,
        category: r.category,
        excerpt: r.excerpt,
        relevanceScore: r.relevanceScore,
      }));

      return {
        success: true,
        count: formattedResults.length,
        results: formattedResults,
      };
    } catch (error) {
      console.error("[Regulatory Tool] Error:", error);
      return {
        success: false,
        message: "An error occurred during the search.",
      };
    }
  },
});

export const regulatoryTools = {
  regulatorySearch,
};

export const REGULATORY_TOOL_NAMES = Object.keys(regulatoryTools);
