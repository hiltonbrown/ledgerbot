import { format } from "date-fns";
import { abnLookupConfig } from "./config";
import { normaliseIdentifier } from "./validate";

export function ensureAbnLookupEnabled() {
  if (!abnLookupConfig.enabled) {
    throw new Error(
      "ABN lookup is disabled. Enable ABN_LOOKUP_ENABLED to use this tool."
    );
  }
}

const NUMERIC_REGEX = /^\d+$/;
const MS_DATE_REGEX = /^\/Date\((-?\d+)([+-]\d{4})?\)\/$/;

export function parseAbrDate(value?: string): Date | undefined {
  if (!value) {
    return;
  }

  // Handle Microsoft JSON Date format: /Date(123456789000)/
  const msMatch = value.match(MS_DATE_REGEX);
  if (msMatch) {
    const timestamp = Number.parseInt(msMatch[1], 10);
    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp);
    }
  }

  // First, try to parse as a standard date string (e.g., ISO 8601)
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  // If parsing failed, check if the entire value is numeric (Unix timestamp)
  if (NUMERIC_REGEX.test(value)) {
    const timestamp = Number(value);
    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp);
    }
  }
  return;
}

function formatDate(value?: string): string | undefined {
  const date = parseAbrDate(value);
  if (!date) return;
  return format(date, "dd MMM yyyy");
}

export function mapAbrEntity(raw: any) {
  const abn =
    normaliseIdentifier(raw?.Abn || raw?.ABN || raw?.AbnNumber || "").digits ||
    undefined;
  const acnCandidate = normaliseIdentifier(
    raw?.Acn || raw?.ACN || raw?.AsicNumber || raw?.ASICNumber || ""
  ).digits;
  const acn = acnCandidate.length === 9 ? acnCandidate : undefined;

  const gst = raw?.GoodsAndServicesTax || raw?.GST || raw?.goodsAndServicesTax;
  const gstStatus = gst?.Status || gst?.status;

  const gstDateRaw =
    gst?.EffectiveFrom ||
    gst?.effectiveFrom ||
    gst?.StartDate ||
    gst?.startDate ||
    undefined;
  const gstStatusFrom = formatDate(gstDateRaw);

  const abnStatus = raw?.AbnStatus || raw?.ABNStatus || raw?.abnStatus;
  const abnDateRaw =
    raw?.AbnStatusEffectiveFrom ||
    raw?.abnStatusFrom ||
    raw?.abnStatusEffectiveFrom;
  const abnStatusFrom = formatDate(abnDateRaw);

  const entityName =
    raw?.EntityName ||
    raw?.entityName ||
    raw?.MainName?.OrganisationName ||
    raw?.MainTradingName?.OrganisationName ||
    raw?.OrganisationName ||
    undefined;

  const mainBusinessLocation =
    raw?.MainBusinessPhysicalAddress ||
    raw?.mainBusinessLocation ||
    raw?.MainBusinessLocation;

  const entityType =
    raw?.EntityTypeText ||
    raw?.entityTypeText ||
    raw?.EntityType ||
    raw?.entityType;

  // Extract Business Names
  const businessNames: string[] = [];
  const rawBusinessNames = raw?.BusinessName || raw?.businessName || [];
  if (Array.isArray(rawBusinessNames)) {
    businessNames.push(
      ...rawBusinessNames.filter((n: any) => typeof n === "string")
    );
  } else if (typeof rawBusinessNames === "string") {
    businessNames.push(rawBusinessNames);
  }

  const firstBusinessName =
    businessNames.length > 0 ? businessNames[0] : undefined;

  // Format Address
  let address: string | undefined;
  if (mainBusinessLocation) {
    const parts = [
      mainBusinessLocation.State,
      mainBusinessLocation.Postcode,
    ].filter(Boolean);
    if (parts.length > 0) {
      address = parts.join(" ");
    }
  }

  const addressDateRaw = raw?.AddressDate || raw?.addressDate;
  const addressDate = formatDate(addressDateRaw);

  // Extract DGR (Deductible Gift Recipient)
  const dgr =
    raw?.DeductibleGiftRecipient || raw?.DGR || raw?.deductibleGiftRecipient;
  const dgrStatus = dgr?.Status || dgr?.status;
  const dgrDateRaw =
    dgr?.EffectiveFrom ||
    dgr?.effectiveFrom ||
    dgr?.StartDate ||
    dgr?.startDate;
  const dgrStatusFrom = formatDate(dgrDateRaw);

  // Extract Charity (ACNC Registration)
  const charity =
    raw?.Charity ||
    raw?.ACNCRegistration ||
    raw?.charity ||
    raw?.acncRegistration;
  const charityStatus = charity?.Status || charity?.status;
  const charityDateRaw =
    charity?.EffectiveFrom ||
    charity?.effectiveFrom ||
    charity?.StartDate ||
    charity?.startDate;
  const charityStatusFrom = formatDate(charityDateRaw);

  return {
    abn,
    acn,
    abnStatus,
    abnStatusFrom,
    gstStatus,
    gstStatusFrom,
    dgrStatus,
    dgrStatusFrom,
    charityStatus,
    charityStatusFrom,
    entityName,
    entityType,
    address,
    addressDate,
    firstBusinessName,
    businessNames,
    mainBusinessLocation,
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
      return result as { kind: "ABN" | "ACN"; digits: string };
    }
  }

  const matches = fallback
    .flatMap((value) =>
      typeof value === "string" ? (value.match(/\d{9,11}/g) ?? []) : []
    )
    .filter(Boolean);

  for (const match of matches) {
    const result = normaliseIdentifier(match);
    if (result.kind === "ABN" || result.kind === "ACN") {
      return result as { kind: "ABN" | "ACN"; digits: string };
    }
  }

  return;
}

export function isActiveStatus(status?: string): boolean {
  if (!status) {
    return false;
  }
  const normalized = status.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return normalized === "active";
}
