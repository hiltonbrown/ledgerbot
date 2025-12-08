import { tool } from "ai";
import { z } from "zod";
import type { Contact } from "xero-node";
import { AbnLookupClient } from "@/lib/abr/abnLookupClient";
import { abnLookupConfig } from "@/lib/abr/config";
import { isValidAbn, normaliseIdentifier } from "@/lib/abr/validate";
import { getRobustXeroClient } from "@/lib/xero/client-helpers";

function ensureAbnLookupEnabled() {
  if (!abnLookupConfig.enabled) {
    throw new Error("ABN lookup is disabled. Enable ABN_LOOKUP_ENABLED to use this tool.");
  }
}

function parseAbrDate(value?: string): Date | undefined {
  if (!value) return;
  const numeric = String(value).match(/\d+/);
  if (numeric?.[0]) {
    const timestamp = Number(numeric[0]);
    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp);
    }
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function mapAbrEntity(raw: any) {
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
  const abnStatusFrom =
    raw?.AbnStatusEffectiveFrom || raw?.abnStatusFrom || raw?.abnStatusEffectiveFrom;

  const entityName =
    raw?.EntityName ||
    raw?.entityName ||
    raw?.MainName?.OrganisationName ||
    raw?.MainTradingName?.OrganisationName ||
    raw?.OrganisationName ||
    undefined;

  const mainBusinessLocation =
    raw?.MainBusinessPhysicalAddress || raw?.mainBusinessLocation || raw?.MainBusinessLocation;

  return {
    abn,
    acn,
    abnStatus,
    abnStatusFrom,
    gstStatus,
    gstStatusFrom,
    entityName,
    mainBusinessLocation,
  };
}

function extractIdentifierFromContact(contact: Contact):
  | { kind: "ABN" | "ACN"; digits: string }
  | undefined {
  const candidates: string[] = [];
  if (contact.taxNumber) candidates.push(contact.taxNumber);
  if (contact.accountNumber) candidates.push(contact.accountNumber);
  if (contact.companyNumber) candidates.push(contact.companyNumber);
  if (contact.contactNumber) candidates.push(contact.contactNumber);
  if (contact.name) candidates.push(contact.name);

  for (const address of contact.addresses || []) {
    if (address.addressLine1) candidates.push(address.addressLine1);
    if (address.addressLine2) candidates.push(address.addressLine2);
    if (address.city) candidates.push(address.city);
    if (address.postalCode) candidates.push(address.postalCode);
  }

  const matches = candidates
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

async function fetchXeroContact(userId: string, contactId: string): Promise<Contact | null> {
  const { client, connection } = await getRobustXeroClient(userId);
  const response = await client.accountingApi.getContact(connection.tenantId, contactId);
  return response.body.contacts?.[0] ?? null;
}

function isActiveStatus(status?: string): boolean {
  if (!status) return false;
  return !/cancel/i.test(status);
}

function isEntityNameMatch(contactName?: string | null, abrName?: string | null): boolean {
  if (!contactName || !abrName) return false;
  const a = contactName.trim().toLowerCase();
  const b = abrName.trim().toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

export const abn_validate_xero_contact = ({ userId }: { userId: string }) =>
  tool({
    description: "Validate a Xero contact's ABN/ACN against the ABR.",
    inputSchema: z.object({
      xeroContactId: z.string().min(1, "Xero contact ID is required"),
      asOfDate: z
        .string()
        .optional()
        .describe("Optional date (YYYY-MM-DD) to check ABN/GST status against"),
    }),
    execute: async ({ xeroContactId, asOfDate }) => {
      ensureAbnLookupEnabled();
      let contact: Contact | null = null;
      try {
        contact = await fetchXeroContact(userId, xeroContactId);
      } catch (error) {
        return {
          status: "invalid" as const,
          message: error instanceof Error ? error.message : "Failed to fetch Xero contact",
        };
      }

      if (!contact) {
        return { status: "not_found" as const, message: "Contact not found in Xero" };
      }

      const identifier = extractIdentifierFromContact(contact);
      const asOf = asOfDate ? new Date(asOfDate) : new Date();

      if (!identifier) {
        return {
          status: "not_found" as const,
          storedAbn: undefined,
          abr: undefined,
          checks: {
            numbersMatch: false,
            abnActiveOnDate: false,
            gstRegisteredOnDate: false,
            entityNameMatch: false,
          },
          message: "No ABN or ACN found on the contact",
        };
      }

      if (identifier.kind === "ABN" && !isValidAbn(identifier.digits)) {
        return { status: "invalid" as const, message: "Invalid ABN format" };
      }

      if (identifier.kind === "ACN" && identifier.digits.length !== 9) {
        return { status: "invalid" as const, message: "Invalid ACN format" };
      }

      const client = new AbnLookupClient();
      const abrRaw =
        identifier.kind === "ABN"
          ? await client.getByAbn(identifier.digits)
          : await client.getByAcn(identifier.digits);

      const abr = mapAbrEntity(abrRaw);
      const numbersMatch =
        identifier.kind === "ABN" && abr.abn
          ? abr.abn === identifier.digits
          : identifier.kind === "ACN" && abr.acn
            ? abr.acn === identifier.digits
            : false;

      const abnEffectiveDate = parseAbrDate(abr.abnStatusFrom);
      const abnActiveOnDate =
        identifier.kind === "ABN" && isActiveStatus(abr.abnStatus)
          ? !abnEffectiveDate || abnEffectiveDate <= asOf
          : false;

      const gstEffectiveDate = parseAbrDate(abr.gstStatusFrom);
      const gstRegisteredOnDate =
        abr.gstStatus && !/not registered/i.test(abr.gstStatus)
          ? !gstEffectiveDate || gstEffectiveDate <= asOf
          : false;

      const entityNameMatch = isEntityNameMatch(contact.name, abr.entityName);

      return {
        status: "ok" as const,
        storedAbn: identifier.digits,
        abr,
        checks: {
          numbersMatch,
          abnActiveOnDate,
          gstRegisteredOnDate,
          entityNameMatch,
        },
      };
    },
  });
