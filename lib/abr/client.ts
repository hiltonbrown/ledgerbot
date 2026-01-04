import type {
  AbnStatus,
  AbrErrorCode,
  AbrLookupResult,
  GstStatus,
} from "@/types/abr";
import { abnLookupConfig } from "./config";
import { normaliseAbn, validateAbnChecksum } from "./utils";

export class AbrError extends Error {
  code: AbrErrorCode;
  constructor(code: AbrErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AbrError";
  }
}

// Internal types for raw ABR JSON responses
interface AbrJsonAbnDetails {
  Abn: string;
  AbnStatus: string;
  AbnStatusEffectiveFrom: string;
  Acn: string;
  AddressDate: string;
  AddressPostcode: string;
  AddressState: string;
  BusinessName: string[];
  EntityName: string;
  EntityTypeCode: string;
  EntityTypeName: string;
  Gst: any; // Can be string, object, or array depending on history
  Message: string;
}

interface AbrJsonNameResult {
  Abn: string;
  AbnStatus: string;
  IsCurrent: boolean;
  Name: string;
  NameType: string;
  Postcode: string;
  Score: number;
  State: string;
}

interface AbrJsonNameSearchResponse {
  Message: string;
  Names: AbrJsonNameResult[];
}

function stripJsonp(payload: string): string {
  const trimmed = payload.trim();
  // Remove callback wrapper: callback({...}) -> {...}
  const match = trimmed.match(/^[^(]*\((.*)\)\s*;?$/s);
  if (match?.[1]) {
    return match[1];
  }
  return trimmed;
}

export class AbrClient {
  private guid: string;
  private baseUrl: string;

  constructor() {
    if (!abnLookupConfig.enabled) {
      throw new Error("ABN Lookup is disabled in environment configuration.");
    }
    const guid = abnLookupConfig.guid;
    if (!guid) {
      throw new Error("ABR_GUID is missing in environment variables.");
    }
    this.guid = guid;
    this.baseUrl = abnLookupConfig.baseUrl.replace(/\/$/, "");
  }

  private async fetchJson(
    endpoint: string,
    params: Record<string, string>
  ): Promise<{ data: any; rawResponse: string }> {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    url.searchParams.set("guid", this.guid);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new AbrError(
          "API_ERROR",
          `ABR API request failed: ${response.status} ${response.statusText}`
        );
      }

      const text = await response.text();
      // Store raw response for Prompt 6 (JSONP stripped or not, prompt says "remove JSONP... Persist original raw...").
      // Actually Prompt 1 says: "Persists the **original raw response string**".
      // But stripping is needed to parse. I'll store the text I received from fetch.
      const rawResponse = text;
      const jsonStr = stripJsonp(text);

      try {
        const data = JSON.parse(jsonStr);
        // ABR API returns a "Message" field on error/no results
        if (
          data.Message &&
          typeof data.Message === "string" &&
          data.Message.length > 0 &&
          data.Message.includes("No record found")
        ) {
          return { data: null, rawResponse };
        }
        return { data, rawResponse };
      } catch (e) {
        throw new AbrError("API_ERROR", "Failed to parse ABR API response");
      }
    } catch (e) {
      if (e instanceof AbrError) throw e;
      throw new AbrError(
        "API_ERROR",
        e instanceof Error ? e.message : "Network error"
      );
    }
  }

  async searchByAbn(
    abn: string,
    includeHistorical = false // Kept for signature, but we force true mostly? Prompt 2 says "always include...".
    // I'll use the prompt's instruction: "Enhance... to always include...".
    // But I'll defer to the param if it's explicitly passed, defaulting to true if I change default?
    // The prompt says "Enhance... to always include". I'll force it to 'Y'.
  ): Promise<AbrLookupResult | null> {
    const normalised = normaliseAbn(abn);
    if (!validateAbnChecksum(normalised)) {
      throw new AbrError("INVALID_FORMAT", `Invalid ABN checksum: ${abn}`);
    }

    const { data, rawResponse } = await this.fetchJson("AbnDetails.aspx", {
      abn: normalised,
      includeHistoricalDetails: "Y", // Prompt 2: Always Y
    });

    if (!data) {
      // Prompt 4: NOT_FOUND
      throw new AbrError("NOT_FOUND", `ABN not found: ${abn}`);
    }

    if (!data.Abn) {
      // Sometimes data is returned but empty or just Message?
      // fetchJson returns null if "No record found".
      // If we are here, we have data. If Abn missing, it's weird.
      throw new AbrError("NOT_FOUND", `ABN not found: ${abn}`);
    }

    return this.mapAbnDetailsToResult(data as AbrJsonAbnDetails, rawResponse);
  }

  async searchByName(
    name: string,
    maxResults = 10
  ): Promise<AbrLookupResult[]> {
    const { data, rawResponse } = await this.fetchJson("MatchingNames.aspx", {
      name,
      maxResults: String(maxResults),
    });

    if (!data || !data.Names) return [];

    const lookupTimestamp = new Date().toISOString();

    return (data as AbrJsonNameSearchResponse).Names.map((n) => ({
      abn: n.Abn,
      abnStatus: n.AbnStatus as AbnStatus,
      abnStatusEffectiveFrom: "",
      acn: null,
      entityName: n.IsCurrent ? n.Name : "",
      entityType: "",
      entityTypeCode: null,
      gst: {
        status: "Unknown",
        effectiveFrom: null,
        effectiveTo: null,
      },
      dgr: { isDgr: false, effectiveFrom: null, effectiveTo: null },
      businessNames: [
        {
          name: n.Name,
          isTradingName: n.NameType === "Trading Name",
          effectiveFrom: "",
        },
      ],
      mainBusinessLocation: { state: n.State, postcode: n.Postcode },
      score: n.Score,
      rawResponse, // We share the same raw response for all list items
      lookupTimestamp,
    }));
  }

  private mapAbnDetailsToResult(
    data: AbrJsonAbnDetails,
    rawResponse: string
  ): AbrLookupResult {
    // Prompt 3: GST Logic
    // Structure:
    // data.Gst can be null, string (date), object { EffectiveFrom, EffectiveTo }, or Array of objects.
    // If "IncludeHistoricalDetails=Y", it is likely an array if multiple periods exist.

    let gstStatus: GstStatus = "Not Registered";
    let gstEffectiveFrom: string | null = null;
    let gstEffectiveTo: string | null = null;

    let gstRecords: any[] = [];

    if (data.Gst) {
      if (Array.isArray(data.Gst)) {
        gstRecords = data.Gst;
      } else if (typeof data.Gst === "object") {
        gstRecords = [data.Gst];
      } else if (typeof data.Gst === "string") {
        // Legacy simple format: just effective date
        gstRecords = [{ EffectiveFrom: data.Gst }];
      }
    }

    // Sort records by EffectiveFrom desc to get latest?
    // We want to determine current status.
    // Logic:
    // - If no records -> Never Registered (or Not Registered if explicitly no GST data)
    // - Iterate records. Look for one where EffectiveTo is null (current).
    // - If found, Currently Registered.
    // - If all have EffectiveTo, Previously Registered.

    // Note: ABR JSON keys are PascalCase usually.
    // Let's normalize keys if needed, but assuming PascalCase from `AbrJsonAbnDetails`.

    if (gstRecords.length === 0) {
      gstStatus = "Never Registered"; // Or Not Registered. Prompt 3 says "If no GST effectiveFrom -> neverRegistered"
    } else {
      // Check for current registration
      const current = gstRecords.find(
        (r) => r.EffectiveFrom && (!r.EffectiveTo || r.EffectiveTo === "")
      );

      if (current) {
        gstStatus = "Registered"; // Prompt 3 says "currentlyRegistered" (I mapped to "Registered" in type? No, I added "Currently Registered"? Check types/abr.ts)
        // types/abr.ts has "Registered".
        // Wait, prompt 3 says: "GST status (`neverRegistered`, `currentlyRegistered`, `previouslyRegistered`)"
        // My type update in types/abr.ts had: `"Registered" | "Not Registered" | "Unknown" | "Never Registered" | "Previously Registered"`
        // I should map "currentlyRegistered" to "Registered" to be consistent with existing or use "Currently Registered"?
        // Existing was "Registered". I'll use "Registered" as "Currently Registered".
        gstEffectiveFrom = current.EffectiveFrom;
        gstEffectiveTo = null;
      } else {
        // No current found, but records exist -> Previously Registered
        gstStatus = "Previously Registered";
        // Find the most recent period?
        // Sort by EffectiveTo desc
        gstRecords.sort((a, b) => {
          const da = a.EffectiveTo ? new Date(a.EffectiveTo).getTime() : 0;
          const db = b.EffectiveTo ? new Date(b.EffectiveTo).getTime() : 0;
          return db - da;
        });
        const latest = gstRecords[0];
        gstEffectiveFrom = latest.EffectiveFrom;
        gstEffectiveTo = latest.EffectiveTo;
      }
    }

    return {
      abn: data.Abn,
      abnStatus: (data.AbnStatus === "Active"
        ? "Active"
        : "Cancelled") as AbnStatus,
      abnStatusEffectiveFrom: data.AbnStatusEffectiveFrom,
      acn: data.Acn || null,
      entityName: data.EntityName,
      entityType: data.EntityTypeName,
      entityTypeCode: data.EntityTypeCode,
      gst: {
        status: gstStatus,
        effectiveFrom: gstEffectiveFrom,
        effectiveTo: gstEffectiveTo,
      },
      dgr: { isDgr: false, effectiveFrom: null, effectiveTo: null },
      businessNames: (data.BusinessName || []).map((bn) => ({
        name: bn,
        isTradingName: true,
        effectiveFrom: "",
      })),
      mainBusinessLocation: {
        state: data.AddressState,
        postcode: data.AddressPostcode,
      },
      rawResponse,
      lookupTimestamp: new Date().toISOString(),
    };
  }
}

// Lazy instantiation to avoid errors during build time when ABR_GUID is missing
let _abrClient: AbrClient | null = null;

export const getAbrClient = (): AbrClient => {
  if (!_abrClient) {
    _abrClient = new AbrClient();
  }
  return _abrClient;
};
