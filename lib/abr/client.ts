import type { AbnStatus, AbrLookupResult } from "@/types/abr";
import { abnLookupConfig } from "./config";
import { normaliseAbn, validateAbnChecksum } from "./utils";

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
  Gst: string | null;
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

function parseAbrDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  // ABR often returns dates like "2023-01-01" or empty string
  if (dateStr.trim() === "") return null;
  return dateStr;
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
  ): Promise<any> {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    url.searchParams.set("guid", this.guid);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    // JSONP endpoint typically ignores Accept header but we set it anyway
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(
        `ABR API request failed: ${response.status} ${response.statusText}`
      );
    }

    const text = await response.text();
    const jsonStr = stripJsonp(text);

    try {
      const data = JSON.parse(jsonStr);
      // ABR API returns a "Message" field on error/no results
      if (
        data.Message &&
        typeof data.Message === "string" &&
        data.Message.length > 0
      ) {
        // Sometimes Message is just a warning, but for simple lookups it often means not found or invalid GUID
        // We'll let the caller handle empty results if it's just "No records found"
        if (data.Message.includes("No record found")) {
          return null;
        }
      }
      return data;
    } catch (e) {
      throw new Error("Failed to parse ABR API response");
    }
  }

  async searchByAbn(
    abn: string,
    includeHistorical = false
  ): Promise<AbrLookupResult | null> {
    const normalised = normaliseAbn(abn);
    if (!validateAbnChecksum(normalised)) {
      throw new Error(`Invalid ABN checksum: ${abn}`);
    }

    const data = (await this.fetchJson("AbnDetails.aspx", {
      abn: normalised,
      includeHistoricalDetails: includeHistorical ? "y" : "n",
    })) as AbrJsonAbnDetails;

    if (!data || !data.Abn) return null;

    return this.mapAbnDetailsToResult(data);
  }

  async searchByName(
    name: string,
    maxResults = 10
  ): Promise<AbrLookupResult[]> {
    const data = (await this.fetchJson("MatchingNames.aspx", {
      name,
      maxResults: String(maxResults),
    })) as AbrJsonNameSearchResponse;

    if (!data || !data.Names) return [];

    // The name search returns summary data.
    // Ideally we might want full details, but that requires N+1 calls.
    // For now, we map what we have.
    // Note: Name search results in JSON API are limited.
    return data.Names.map((n) => ({
      abn: n.Abn,
      abnStatus: n.AbnStatus as AbnStatus,
      abnStatusEffectiveFrom: "", // Not provided in search
      acn: null,
      entityName: n.IsCurrent ? n.Name : "", // Approximate
      entityType: "",
      entityTypeCode: null,
      gst: { status: "Unknown", effectiveFrom: null, effectiveTo: null },
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
    }));
  }

  private mapAbnDetailsToResult(data: AbrJsonAbnDetails): AbrLookupResult {
    // GST Date Parsing (ABR JSON returns typically "2000-07-01")
    const gstRegistered = !!data.Gst;
    let gstEffectiveFrom: string | null = null;
    if (gstRegistered && data.Gst) {
      // data.Gst is often the date string itself in some versions, or an object?
      // Checking ABR docs: "Gst": "2000-07-01"
      gstEffectiveFrom = data.Gst;
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
        status: gstRegistered ? "Registered" : "Not Registered",
        effectiveFrom: gstEffectiveFrom,
        effectiveTo: null,
      },
      dgr: { isDgr: false, effectiveFrom: null, effectiveTo: null }, // JSON API doesn't always expose DGR easily
      businessNames: (data.BusinessName || []).map((bn) => ({
        name: bn,
        isTradingName: true, // JSON API groups them generally
        effectiveFrom: "",
      })),
      mainBusinessLocation: {
        state: data.AddressState,
        postcode: data.AddressPostcode,
      },
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
