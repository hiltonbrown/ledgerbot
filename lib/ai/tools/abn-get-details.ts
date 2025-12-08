import { tool } from "ai";
import { z } from "zod";
import { AbnLookupClient } from "@/lib/abr/abnLookupClient";
import { abnLookupConfig } from "@/lib/abr/config";
import { isValidAbn, normaliseIdentifier } from "@/lib/abr/validate";

function ensureAbnLookupEnabled() {
  if (!abnLookupConfig.enabled) {
    throw new Error("ABN lookup is disabled. Enable ABN_LOOKUP_ENABLED to use this tool.");
  }
}

function extractAbrEntity(raw: any) {
  const entityName =
    raw?.EntityName ||
    raw?.entityName ||
    raw?.MainName?.OrganisationName ||
    raw?.MainTradingName?.OrganisationName ||
    raw?.OrganisationName ||
    undefined;

  const abn = normaliseIdentifier(raw?.Abn || raw?.ABN || raw?.AbnNumber || "").digits || undefined;
  const acnCandidate = normaliseIdentifier(
    raw?.Acn || raw?.ACN || raw?.AsicNumber || raw?.ASICNumber || ""
  ).digits;
  const acn = acnCandidate.length === 9 ? acnCandidate : undefined;

  const gst = raw?.GoodsAndServicesTax || raw?.GST || raw?.goodsAndServicesTax;
  const gstStatus = gst?.Status || gst?.status;
  const gstStatusFrom =
    gst?.EffectiveFrom || gst?.effectiveFrom || gst?.StartDate || gst?.startDate || undefined;

  const mainBusinessLocation = raw?.MainBusinessPhysicalAddress || raw?.mainBusinessLocation;
  const abnStatus = raw?.AbnStatus || raw?.ABNStatus || raw?.abnStatus;
  const abnStatusFrom =
    raw?.AbnStatusEffectiveFrom || raw?.abnStatusFrom || raw?.abnStatusEffectiveFrom;

  return {
    abn,
    acn,
    entityName,
    entityType: raw?.EntityType || raw?.entityType,
    abnStatus,
    abnStatusFrom,
    gstStatus,
    gstStatusFrom,
    mainBusinessLocation,
  };
}

export const abn_get_details = tool({
  description: "Get entity details from ABR by ABN or ACN.",
  inputSchema: z.object({
    identifier: z.string().min(1, "Identifier is required"),
    kind: z.enum(["ABN", "ACN", "AUTO"]).optional().default("AUTO"),
  }),
  execute: async ({ identifier, kind }) => {
    ensureAbnLookupEnabled();
    const client = new AbnLookupClient();
    const { digits, kind: resolvedKind } = normaliseIdentifier(identifier);

    const targetKind = kind && kind !== "AUTO" ? kind : resolvedKind;
    const lookupKind: "ABN" | "ACN" | null =
      targetKind === "AUTO"
        ? digits.length === 11
          ? "ABN"
          : digits.length === 9
            ? "ACN"
            : null
        : targetKind === "UNKNOWN"
          ? null
          : targetKind;

    if (!lookupKind) {
      return {
        error: {
          code: "INVALID_IDENTIFIER",
          message: "Identifier must be a 9-digit ACN or 11-digit ABN.",
        },
      };
    }

    if (lookupKind === "ABN") {
      if (!isValidAbn(digits)) {
        return {
          error: {
            code: "INVALID_ABN",
            message: "Invalid ABN format or checksum.",
          },
        };
      }

      const entity = extractAbrEntity(await client.getByAbn(digits));
      return { entity };
    }

    if (digits.length !== 9) {
      return {
        error: {
          code: "INVALID_ACN",
          message: "ACN must contain exactly 9 digits.",
        },
      };
    }

    const entity = extractAbrEntity(await client.getByAcn(digits));
    return { entity };
  },
});
