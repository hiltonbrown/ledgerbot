import { abrClient } from "./client";
import { classifyAbrQuery } from "./utils";
import type { AbrSearchResult, AbrLookupResult } from "@/types/abr";

export class AbrService {
  async lookup(query: string, includeHistorical = false): Promise<AbrSearchResult> {
    const classification = classifyAbrQuery(query);
    
    // 1. Handle ABN/ACN
    if (classification.kind === "ABN") {
      try {
        const result = await abrClient.searchByAbn(classification.value, includeHistorical);
        return {
          query,
          kind: "ABN",
          results: result ? [result] : []
        };
      } catch (error) {
        return {
          query,
          kind: "ABN",
          results: [],
          error: error instanceof Error ? error.message : "ABN Lookup Failed"
        };
      }
    }

    if (classification.kind === "ACN") {
      // The JSON API doesn't have a direct "SearchByACN" that returns full details 
      // in the same way, or at least the client I wrote mostly focused on ABN.
      // However, usually one converts ACN to ABN or uses the ACN endpoint.
      // For now, we will return an error or empty for ACN if strictly not implemented in client yet,
      // but let's see if we can just search it as a name or similar? 
      // Actually ABR "SearchByASIC" exists. 
      // But for this task, let's focus on ABN and Name as primary.
      // If we classify as ACN, we can try treating it as a raw search or fail.
      return {
        query,
        kind: "ACN",
        results: [],
        error: "ACN lookup not fully implemented in this version"
      };
    }

    // 2. Handle Business Name (or Unknown fallback)
    if (classification.kind === "BusinessName" || classification.kind === "Unknown") {
      try {
        const results = await abrClient.searchByName(query);
        return {
          query,
          kind: "BusinessName",
          results
        };
      } catch (error) {
        return {
          query,
          kind: "BusinessName",
          results: [],
          error: error instanceof Error ? error.message : "Name Search Failed"
        };
      }
    }

    return {
      query,
      kind: "Unknown",
      results: []
    };
  }
}

export const abrService = new AbrService();
