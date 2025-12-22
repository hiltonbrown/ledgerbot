import { tool } from "ai";
import { z } from "zod";
import { abrService } from "@/lib/abr/service";

export const abn_search_entity = tool({
  description: "Search for an ABN/ACN by entity name via the ABR.",
  inputSchema: z.object({
    query: z.string().min(1, "Query is required"),
    maxResults: z
      .number()
      .int()
      .positive()
      .optional()
      .default(5)
      .describe("Maximum number of entities to return"),
  }),
  execute: async ({ query, maxResults }) => {
    // We leverage the service which handles Name vs ABN, but this tool is specifically "Search Entity" (usually by name)
    // but users might type an ABN here too.
    const result = await abrService.lookup(query);

    // We limit results manually if needed, though client does it too
    const limitedResults = result.results.slice(0, maxResults);

    const formattedResults = limitedResults.map((entry) => {
      return {
        entityName: entry.entityName,
        abn: entry.abn,
        acn: entry.acn,
        abnStatus: entry.abnStatus,
        gstStatus: entry.gst.status,
        gstStatusFrom: entry.gst.effectiveFrom,
        mainLocation: entry.mainBusinessLocation,
        // Map new fields
        dgrStatus: entry.dgr.isDgr ? "Registered" : "Not Registered",
        dgrStatusFrom: entry.dgr.effectiveFrom,
        entityType: entry.entityType,
        businessNames: entry.businessNames.map((bn) => bn.name),
      };
    });

    return { results: formattedResults };
  },
});
