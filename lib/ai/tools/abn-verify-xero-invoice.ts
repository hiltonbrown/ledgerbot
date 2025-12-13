import { tool } from "ai";
import type { Invoice } from "xero-node";
import { z } from "zod";
import { abrService } from "@/lib/abr/service";
import { normaliseAbn, validateAbnChecksum, validateAcnChecksum } from "@/lib/abr/utils";
import { getRobustXeroClient } from "@/lib/xero/client-helpers";

// Simplified extraction
function extractIdentifierFromInvoice(invoice: Invoice) {
  const candidates = [
    invoice.reference,
    invoice.invoiceNumber,
    invoice.contact?.taxNumber,
    invoice.contact?.companyNumber,
    invoice.contact?.accountNumber,
    invoice.contact?.name 
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

// Generic Xero entity fetcher
async function fetchXeroEntity<T>(
  userId: string,
  entityType: "Invoice" | "Contact",
  entityId: string
): Promise<T | null> {
  const { client, connection } = await getRobustXeroClient(userId);
  switch (entityType) {
    case "Invoice": {
      const response = await client.accountingApi.getInvoice(
        connection.tenantId,
        entityId
      );
      return (response.body.invoices?.[0] as T) ?? null;
    }
    case "Contact": {
      const response = await client.accountingApi.getContact(
        connection.tenantId,
        entityId
      );
      return (response.body.contacts?.[0] as T) ?? null;
    }
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
}

async function fetchXeroInvoice(
  userId: string,
  invoiceId: string
): Promise<Invoice | null> {
  return await fetchXeroEntity<Invoice>(userId, "Invoice", invoiceId);
}

function isEntityNameCloseMatch(
  nameA?: string | null,
  nameB?: string | null
): boolean {
  if (!nameA || !nameB) return false;
  const a = nameA.trim().toLowerCase();
  const b = nameB.trim().toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

function buildRiskRating(options: {
  numbersMatch: boolean;
  entityNameCloseMatch: boolean;
  abnActiveOnInvoiceDate: boolean;
  gstRegisteredOnInvoiceDate: boolean;
  identifierValid: boolean;
  strict: boolean;
}): "ok" | "warning" | "high" {
  if (!options.identifierValid) return "high";
  if (!options.numbersMatch) return "high";
  if (!options.abnActiveOnInvoiceDate) return "high";
  if (!options.gstRegisteredOnInvoiceDate) return "high";
  if (!options.entityNameCloseMatch) {
    return options.strict ? "high" : "warning";
  }
  return "ok";
}

function buildErrorResult({
  xeroInvoiceId,
  supplierName,
  invoiceDate,
  identifier,
  message,
  status,
}: {
  xeroInvoiceId: string;
  supplierName?: string | null;
  invoiceDate?: Date;
  identifier?: string;
  message: string;
  status: "invalid" | "not_found";
}) {
  return {
    status,
    invoiceId: xeroInvoiceId,
    invoiceDate: invoiceDate?.toISOString(),
    supplierName: supplierName ?? undefined,
    abnOnInvoice: identifier,
    abr: undefined,
    checks: {
      numbersMatch: false,
      entityNameCloseMatch: false,
      abnActiveOnInvoiceDate: false,
      gstRegisteredOnInvoiceDate: false,
    },
    riskRating: "high" as const,
    notes: [message],
  };
}

export const abn_verify_xero_invoice = ({ userId }: { userId: string }) =>
  tool({
    description:
      "Verify supplier ABN/ACN on a Xero invoice against ABR records.",
    inputSchema: z.object({
      xeroInvoiceId: z.string().min(1, "Xero invoice ID is required"),
      strict: z.boolean().optional().default(false),
    }),
    execute: async ({ xeroInvoiceId, strict }) => {
      // ensureAbnLookupEnabled();
      let invoice: Invoice | null = null;
      try {
        invoice = await fetchXeroInvoice(userId, xeroInvoiceId);
      } catch (error) {
        return buildErrorResult({
          xeroInvoiceId,
          supplierName: undefined,
          invoiceDate: undefined,
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch invoice from Xero",
          status: "invalid",
        });
      }

      if (!invoice) {
        return buildErrorResult({
          xeroInvoiceId,
          supplierName: undefined,
          message: "Invoice not found in Xero",
          status: "not_found",
        });
      }

      const identifier = extractIdentifierFromInvoice(invoice);
      const invoiceDate = invoice.date ? new Date(invoice.date) : undefined;

      if (!identifier) {
        return buildErrorResult({
          xeroInvoiceId,
          supplierName: invoice.contact?.name,
          invoiceDate,
          message: "No ABN or ACN found on the invoice or supplier contact",
          status: "invalid",
        });
      }

      if (identifier.kind === "ABN" && !validateAbnChecksum(identifier.digits)) {
        return buildErrorResult({
          xeroInvoiceId,
          supplierName: invoice.contact?.name,
          invoiceDate,
          identifier: identifier.digits,
          message: "Invalid ABN format",
          status: "invalid",
        });
      }

      if (identifier.kind === "ACN" && !validateAcnChecksum(identifier.digits)) {
        return buildErrorResult({
          xeroInvoiceId,
          supplierName: invoice.contact?.name,
          invoiceDate,
          identifier: identifier.digits,
          message: "Invalid ACN format",
          status: "invalid",
        });
      }

      // Lookup
      let abrRecord = null;
      if (identifier.kind === "ABN") {
          const result = await abrService.lookup(identifier.digits, true);
          if (result.results.length > 0) {
              abrRecord = result.results[0];
          }
      } else {
          return buildErrorResult({
              xeroInvoiceId,
              supplierName: invoice.contact?.name,
              invoiceDate,
              identifier: identifier.digits,
              message: "ACN lookup not supported yet",
              status: "invalid",
          });
      }

      if (!abrRecord) {
          return buildErrorResult({
              xeroInvoiceId,
              supplierName: invoice.contact?.name,
              invoiceDate,
              identifier: identifier.digits,
              message: "ABN not found in ABR",
              status: "not_found",
          });
      }

      const numbersMatch = abrRecord.abn === identifier.digits;

      const entityNameCloseMatch = isEntityNameCloseMatch(
        invoice.contact?.name,
        abrRecord.entityName
      );

      const abnEffectiveDate = abrRecord.abnStatusEffectiveFrom ? new Date(abrRecord.abnStatusEffectiveFrom) : null;
      const abnActiveOnInvoiceDate = abrRecord.abnStatus === "Active"
          ? !abnEffectiveDate ||
            (invoiceDate
              ? abnEffectiveDate <= invoiceDate
              : abnEffectiveDate <= new Date())
          : false;

      const gstEffectiveDate = abrRecord.gst.effectiveFrom ? new Date(abrRecord.gst.effectiveFrom) : null;
      const gstRegisteredOnInvoiceDate =
        abrRecord.gst.status === "Registered"
          ? !gstEffectiveDate ||
            (invoiceDate
              ? gstEffectiveDate <= invoiceDate
              : gstEffectiveDate <= new Date())
          : false;

      const riskRating = buildRiskRating({
        numbersMatch,
        entityNameCloseMatch,
        abnActiveOnInvoiceDate,
        gstRegisteredOnInvoiceDate,
        identifierValid: true,
        strict: Boolean(strict),
      });

      const notes: string[] = [];
      if (!numbersMatch)
        notes.push("Invoice identifier does not match ABR record");
      if (!entityNameCloseMatch)
        notes.push("Supplier name does not closely match ABR entity name");
      if (!abnActiveOnInvoiceDate)
        notes.push("ABN appears inactive or cancelled for the invoice date");
      if (!gstRegisteredOnInvoiceDate)
        notes.push("GST registration inactive for invoice date");

      return {
        invoiceId: xeroInvoiceId,
        invoiceDate: invoiceDate?.toISOString(),
        supplierName: invoice.contact?.name,
        abnOnInvoice: identifier.digits,
        abr: abrRecord,
        checks: {
          numbersMatch,
          entityNameCloseMatch,
          abnActiveOnInvoiceDate,
          gstRegisteredOnInvoiceDate,
        },
        riskRating,
        notes,
      };
    },
  });