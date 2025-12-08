import { tool } from "ai";
import { z } from "zod";
import { AbnLookupClient } from "@/lib/abr/abnLookupClient";
import { abnLookupConfig } from "@/lib/abr/config";
import { normaliseIdentifier } from "@/lib/abr/validate";

function ensureAbnLookupEnabled() {
  if (!abnLookupConfig.enabled) {
    throw new Error("ABN lookup is disabled. Enable ABN_LOOKUP_ENABLED to use this tool.");
  }
}

function extractEntityName(entry: any): string | undefined {
  return (
    entry?.EntityName ||
    entry?.Name ||
    entry?.entityName ||
    entry?.MainName?.OrganisationName ||
    entry?.MainTradingName?.OrganisationName ||
    entry?.organisationName ||
    undefined
  );
}

function extractAbn(entry: any): string | undefined {
  const value = entry?.Abn || entry?.ABN || entry?.AbnNumber || entry?.identifierValue;
  if (typeof value === "string") {
    return normaliseIdentifier(value).digits || undefined;
  }
  return undefined;
}

function extractAcn(entry: any): string | undefined {
  const value = entry?.Acn || entry?.ACN || entry?.AsicNumber || entry?.ASICNumber;
  if (typeof value === "string") {
    const digits = normaliseIdentifier(value).digits;
    return digits.length === 9 ? digits : undefined;
  }
  return undefined;
}

function extractAbnStatus(entry: any): string | undefined {
  return entry?.AbnStatus || entry?.ABNStatus || entry?.status || undefined;
}

function extractGstStatus(entry: any): {
  status?: string;
  from?: string;
} {
  const gst = entry?.GoodsAndServicesTax || entry?.GST || entry?.goodsAndServicesTax;
  const status = typeof gst?.status === "string" ? gst.status : gst?.Status;
  const from =
    gst?.EffectiveFrom ||
    gst?.FromDate ||
    gst?.effectiveFrom ||
    gst?.StartDate ||
    gst?.startDate;

  return { status, from };
}

function extractMainLocation(entry: any): string | undefined {
  const location =
    entry?.MainBusinessPhysicalAddress || entry?.MainBusinessLocation || entry?.mainBusinessLocation;
  if (!location || typeof location !== "object") {
    return undefined;
  }
  const parts = [
    location.City || location.city,
    location.State || location.state,
    location.Postcode || location.postcode,
    location.CountryCode || location.countryCode,
  ].filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }
  return parts.join(", ");
}

function normaliseResults(raw: unknown): any[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && typeof raw === "object") {
    const container = raw as Record<string, any>;
    if (Array.isArray(container.Names)) return container.Names;
    if (Array.isArray(container.results)) return container.results;
    if (Array.isArray(container.Results)) return container.Results;
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
    const response = await client.searchByName(query, maxResults ?? 5);
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
