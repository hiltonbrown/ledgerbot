import type { AbrSearchResult } from "@/types/abr";
import { AbrError, getAbrClient } from "./client";
import { classifyAbrQuery } from "./utils";

export class AbrService {
  async lookup(
    query: string,
    includeHistorical = false
  ): Promise<AbrSearchResult> {
    const classification = classifyAbrQuery(query);

    // 1. Handle ABN/ACN
    if (classification.kind === "ABN") {
      try {
        const result = await getAbrClient().searchByAbn(
          classification.value,
          includeHistorical
        );
        return {
          query,
          kind: "ABN",
          results: result ? [result] : [],
        };
      } catch (error) {
        return {
          query,
          kind: "ABN",
          results: [],
          error:
            error instanceof AbrError
              ? { code: error.code, message: error.message }
              : {
                  code: "API_ERROR",
                  message:
                    error instanceof Error
                      ? error.message
                      : "ABN Lookup Failed",
                },
        };
      }
    }

    if (classification.kind === "ACN") {
      return {
        query,
        kind: "ACN",
        results: [],
        error: {
          code: "API_ERROR", // Or NOT_FOUND if we consider it "not supported"
          message: "ACN lookup not fully implemented in this version",
        },
      };
    }

    // 2. Handle Business Name (or Unknown fallback)
    if (
      classification.kind === "BusinessName" ||
      classification.kind === "Unknown"
    ) {
      try {
        const results = await getAbrClient().searchByName(query);
        return {
          query,
          kind: "BusinessName",
          results,
        };
      } catch (error) {
        return {
          query,
          kind: "BusinessName",
          results: [],
          error:
            error instanceof AbrError
              ? { code: error.code, message: error.message }
              : {
                  code: "API_ERROR",
                  message:
                    error instanceof Error
                      ? error.message
                      : "Name Search Failed",
                },
        };
      }
    }

    return {
      query,
      kind: "Unknown",
      results: [],
    };
  }
}

export const abrService = new AbrService();
