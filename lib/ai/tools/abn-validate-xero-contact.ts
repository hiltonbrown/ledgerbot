import { tool } from "ai";
import { z } from "zod";
import type { Contact } from "xero-node";
import { AbnLookupClient } from "@/lib/abr/abnLookupClient";
import {
  ensureAbnLookupEnabled,
  extractIdentifierFromCandidates,
  isActiveStatus,
  mapAbrEntity,
  parseAbrDate,
} from "@/lib/abr/helpers";
import { isValidAbn } from "@/lib/abr/validate";
import { getRobustXeroClient } from "@/lib/xero/client-helpers";

function extractIdentifierFromContact(contact: Contact) {
  const preferredFields = [
    contact.taxNumber,
    contact.companyNumber,
    contact.contactNumber,
    contact.accountNumber,
  ];

  const fallbackFields = [contact.name];

  return extractIdentifierFromCandidates(preferredFields, fallbackFields);
}

async function fetchXeroContact(userId: string, contactId: string): Promise<Contact | null> {
  const { client, connection } = await getRobustXeroClient(userId);
  const response = await client.accountingApi.getContact(connection.tenantId, contactId);
  return response.body.contacts?.[0] ?? null;
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
