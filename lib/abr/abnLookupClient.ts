import { abnLookupConfig } from "./config";
import { normaliseIdentifier } from "./validate";

function stripJsonp(payload: string): string {
  const trimmed = payload.trim();

  const jsonpMatch = trimmed.match(/^[^(]*\((.*)\)\s*;?$/s);
  if (jsonpMatch?.[1]) {
    return jsonpMatch[1];
  }

  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export class AbnLookupClient {
  private guidOverride?: string;
  private baseUrlOverride?: string;

  constructor(guid?: string, baseUrl?: string) {
    this.guidOverride = guid;
    this.baseUrlOverride = baseUrl;
  }

  async getByAbn(abn: string) {
    const normalised = normaliseIdentifier(abn).digits;
    if (normalised.length !== 11) {
      throw new Error("ABN must contain exactly 11 digits");
    }

    return this.fetchJsonp("AbnDetails.aspx", { abn: normalised });
  }

  async getByAcn(acn: string) {
    const normalised = normaliseIdentifier(acn).digits;
    if (normalised.length !== 9) {
      throw new Error("ACN must contain exactly 9 digits");
    }

    return this.fetchJsonp("SearchByASIC.aspx", { asic: normalised });
  }

  async searchByName(name: string, maxResults = 5) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("Name is required for search");
    }

    return this.fetchJsonp("MatchingNames.aspx", {
      name: trimmed,
      maxResults: String(maxResults),
    });
  }

  private async fetchJsonp(
    path: string,
    params: Record<string, string>
  ): Promise<unknown> {
    if (!abnLookupConfig.enabled) {
      throw new Error("ABN lookup is disabled in configuration");
    }

    const guid = this.guidOverride ?? abnLookupConfig.guid;
    if (!guid) {
      throw new Error("ABN lookup GUID is not configured");
    }

    const baseUrl = (this.baseUrlOverride ?? abnLookupConfig.baseUrl).replace(
      /\/$/,
      ""
    );
    const search = new URLSearchParams({ ...params, guid });
    const url = `${baseUrl}/${path}?${search.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("ABN lookup GUID is invalid or unauthorized");
      }
      throw new Error(`ABN lookup failed with status ${response.status}`);
    }

    const text = await response.text();
    const unwrapped = stripJsonp(text);

    try {
      return JSON.parse(unwrapped);
    } catch (error) {
      throw new Error(
        `Failed to parse ABN lookup response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
