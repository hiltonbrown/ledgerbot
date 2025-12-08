import { tool } from "ai";
import { z } from "zod";
import { AbnLookupClient } from "@/lib/abr/abnLookupClient";
import { ensureAbnLookupEnabled, mapAbrEntity } from "@/lib/abr/helpers";
import { normaliseIdentifier } from "@/lib/abr/validate";

// Extraction functions removed; use mapAbrEntity from lib/abr/helpers.ts instead.

function normaliseResults(raw: unknown): any[] {
  if (Array.isArray(raw)) {
    return raw.map(mapAbrEntity);
  }
  if (raw && typeof raw === "object") {
    const container = raw as Record<string, any>;
    if (Array.isArray(container.Names)) return container.Names.map(mapAbrEntity);
    if (Array.isArray(container.results)) return container.results.map(mapAbrEntity);
    if (Array.isArray(container.Results)) return container.Results.map(mapAbrEntity);
  }
  return [];
}

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
    ensureAbnLookupEnabled();
    const client = new AbnLookupClient();
    const response = await client.searchByName(query, maxResults);
    const entries = normaliseResults(response);

    const results = entries.map((entry) => {
      const gst = extractGstStatus(entry);
      return {
        entityName: extractEntityName(entry),
        abn: extractAbn(entry),
        acn: extractAcn(entry),
        abnStatus: extractAbnStatus(entry),
        gstStatus: gst.status,
        gstStatusFrom: gst.from,
        mainLocation: extractMainLocation(entry),
      };
    });

    return { results };
  },
});
