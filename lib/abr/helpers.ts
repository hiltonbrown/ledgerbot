import { abnLookupConfig } from "./config";
import { normaliseIdentifier } from "./validate";

export function ensureAbnLookupEnabled() {
  if (!abnLookupConfig.enabled) {
    throw new Error("ABN lookup is disabled. Enable ABN_LOOKUP_ENABLED to use this tool.");
  }
}

export function parseAbrDate(value?: string): Date | undefined {
  if (!value) return;
  // First, try to parse as a standard date string (e.g., ISO 8601)
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  // If parsing failed, check if the entire value is numeric (Unix timestamp)
  if (/^\d+$/.test(value)) {
    const timestamp = Number(value);
    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp);
    }
  }
  return undefined;
}

export function mapAbrEntity(raw: any) {
  const abn = normaliseIdentifier(raw?.Abn || raw?.ABN || raw?.AbnNumber || "").digits || undefined;
  const acnCandidate = normaliseIdentifier(
    raw?.Acn || raw?.ACN || raw?.AsicNumber || raw?.ASICNumber || ""
  ).digits;
  const acn = acnCandidate.length === 9 ? acnCandidate : undefined;

  const gst = raw?.GoodsAndServicesTax || raw?.GST || raw?.goodsAndServicesTax;
  const gstStatus = gst?.Status || gst?.status;
  const gstStatusFrom =
    gst?.EffectiveFrom || gst?.effectiveFrom || gst?.StartDate || gst?.startDate || undefined;

  const abnStatus = raw?.AbnStatus || raw?.ABNStatus || raw?.abnStatus;
  const abnStatusFrom = raw?.AbnStatusEffectiveFrom || raw?.abnStatusFrom || raw?.abnStatusEffectiveFrom;

  const entityName =
    raw?.EntityName ||
    raw?.entityName ||
    raw?.MainName?.OrganisationName ||
    raw?.MainTradingName?.OrganisationName ||
    raw?.OrganisationName ||
    undefined;

  const mainBusinessLocation =
    raw?.MainBusinessPhysicalAddress || raw?.mainBusinessLocation || raw?.MainBusinessLocation;

  const entityType = raw?.EntityType || raw?.entityType;

  return {
    abn,
    acn,
    abnStatus,
    abnStatusFrom,
    gstStatus,
    gstStatusFrom,
    entityName,
    mainBusinessLocation,
    entityType,
  };
}

export function extractIdentifierFromCandidates(
  preferred: Array<string | null | undefined>,
  fallback: Array<string | null | undefined> = []
): { kind: "ABN" | "ACN"; digits: string } | undefined {
  for (const value of preferred) {
    if (!value || typeof value !== "string") continue;
    const result = normaliseIdentifier(value);
    if (result.kind === "ABN" || result.kind === "ACN") {
      return result;
    }
  }

  const matches = fallback
    .flatMap((value) => (typeof value === "string" ? value.match(/\d{9,11}/g) ?? [] : []))
    .filter(Boolean);

  for (const match of matches) {
    const result = normaliseIdentifier(match);
    if (result.kind === "ABN" || result.kind === "ACN") {
      return result;
    }
  }

  return undefined;
}

export function isActiveStatus(status?: string): boolean {
  if (!status) return false;
  const normalized = status.trim().toLowerCase();
  if (!normalized) return false;
  return normalized === "active";
}
