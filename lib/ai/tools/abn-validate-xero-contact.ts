import { tool } from "ai";
import { z } from "zod";
import type { Contact } from "xero-node";
import { abrService } from "@/lib/abr/service";
import { normaliseAbn, validateAbnChecksum, validateAcnChecksum } from "@/lib/abr/utils";
import { getRobustXeroClient } from "@/lib/xero/client-helpers";

// Helper extracted from previous implementation (simplified)
function extractIdentifierFromContact(contact: Contact) {
  const candidates = [
    contact.taxNumber,
    contact.companyNumber,
    contact.contactNumber,
    contact.accountNumber,
    contact.name // sometimes people put ABN in name
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const clean = normaliseAbn(candidate);
    if (clean.length === 11 && validateAbnChecksum(clean)) {
        return { kind: "ABN", digits: clean };
    }
    if (clean.length === 9 && validateAcnChecksum(clean)) {
        return { kind: "ACN", digits: clean };
    }
  }
  return null;
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
      // ensureAbnLookupEnabled(); // Service handles this or config check
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

      // Check format (already done by extraction mostly, but safety check)
      if (identifier.kind === "ABN" && !validateAbnChecksum(identifier.digits)) {
        return { status: "invalid" as const, message: "Invalid ABN format" };
      }

      if (identifier.kind === "ACN" && !validateAcnChecksum(identifier.digits)) {
        return { status: "invalid" as const, message: "Invalid ACN format" };
      }

      // Perform Lookup
      let abrRecord = null;
      if (identifier.kind === "ABN") {
          const result = await abrService.lookup(identifier.digits, true); // Include history for date checks
          if (result.results.length > 0) {
              abrRecord = result.results[0];
          }
      } else {
          // ACN lookup not fully supported via ABR service directly in this iteration
          return { status: "invalid" as const, message: "ACN lookup not supported yet" };
      }

      if (!abrRecord) {
          return { status: "not_found" as const, message: "ABN not found in ABR" };
      }

      const numbersMatch = abrRecord.abn === identifier.digits;

      const abnEffectiveDate = abrRecord.abnStatusEffectiveFrom ? new Date(abrRecord.abnStatusEffectiveFrom) : null;
      const abnActiveOnDate = abrRecord.abnStatus === "Active"
          ? !abnEffectiveDate || abnEffectiveDate <= asOf
          : false;

      const gstEffectiveDate = abrRecord.gst.effectiveFrom ? new Date(abrRecord.gst.effectiveFrom) : null;
      const gstRegisteredOnDate = abrRecord.gst.status === "Registered"
          ? !gstEffectiveDate || gstEffectiveDate <= asOf
          : false;

      const entityNameMatch = isEntityNameMatch(contact.name, abrRecord.entityName);

      return {
        status: "ok" as const,
        storedAbn: identifier.digits,
        abr: abrRecord,
        checks: {
          numbersMatch,
          abnActiveOnDate,
          gstRegisteredOnDate,
          entityNameMatch,
        },
      };
    },
  });