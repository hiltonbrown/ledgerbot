import { tool } from "ai";
import { z } from "zod";
import type { Invoice } from "xero-node";
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

function extractIdentifierFromInvoice(invoice: Invoice):
  | { kind: "ABN" | "ACN"; digits: string }
  | undefined {
  const candidates: string[] = [];
  if (invoice.taxNumber) candidates.push(invoice.taxNumber);
  if (invoice.reference) candidates.push(invoice.reference);
  if (invoice.invoiceNumber) candidates.push(invoice.invoiceNumber);
  if (invoice.contact?.taxNumber) candidates.push(invoice.contact.taxNumber);
  if (invoice.contact?.companyNumber) candidates.push(invoice.contact.companyNumber);
  if (invoice.contact?.accountNumber) candidates.push(invoice.contact.accountNumber);
  if (invoice.contact?.name) candidates.push(invoice.contact.name);

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

async function fetchXeroInvoice(userId: string, invoiceId: string): Promise<Invoice | null> {
  const { client, connection } = await getRobustXeroClient(userId);
  const response = await client.accountingApi.getInvoice(connection.tenantId, invoiceId);
  return response.body.invoices?.[0] ?? null;
}

function isActiveStatus(status?: string): boolean {
  if (!status) return false;
  return !/cancel/i.test(status);
}

function isEntityNameCloseMatch(nameA?: string | null, nameB?: string | null): boolean {
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
    description: "Verify supplier ABN/ACN on a Xero invoice against ABR records.",
    inputSchema: z.object({
      xeroInvoiceId: z.string().min(1, "Xero invoice ID is required"),
      strict: z.boolean().optional().default(false),
    }),
    execute: async ({ xeroInvoiceId, strict }) => {
      ensureAbnLookupEnabled();
      let invoice: Invoice | null = null;
      try {
        invoice = await fetchXeroInvoice(userId, xeroInvoiceId);
      } catch (error) {
        return buildErrorResult({
          xeroInvoiceId,
          supplierName: invoice?.contact?.name,
          invoiceDate: invoice?.date ? new Date(invoice.date) : undefined,
          message: error instanceof Error ? error.message : "Failed to fetch invoice from Xero",
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

      if (identifier.kind === "ABN" && !isValidAbn(identifier.digits)) {
        return buildErrorResult({
          xeroInvoiceId,
          supplierName: invoice.contact?.name,
          invoiceDate,
          identifier: identifier.digits,
          message: "Invalid ABN format",
          status: "invalid",
        });
      }

      if (identifier.kind === "ACN" && identifier.digits.length !== 9) {
        return buildErrorResult({
          xeroInvoiceId,
          supplierName: invoice.contact?.name,
          invoiceDate,
          identifier: identifier.digits,
          message: "Invalid ACN format",
          status: "invalid",
        });
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

      const entityNameCloseMatch = isEntityNameCloseMatch(
        invoice.contact?.name,
        abr.entityName
      );

      const abnEffectiveDate = parseAbrDate(abr.abnStatusFrom);
      const abnActiveOnInvoiceDate =
        identifier.kind === "ABN" && isActiveStatus(abr.abnStatus)
          ? !abnEffectiveDate || (invoiceDate ? abnEffectiveDate <= invoiceDate : abnEffectiveDate <= new Date())
          : false;

      const gstEffectiveDate = parseAbrDate(abr.gstStatusFrom);
      const gstRegisteredOnInvoiceDate =
        abr.gstStatus && !/not registered/i.test(abr.gstStatus)
          ? !gstEffectiveDate || (invoiceDate ? gstEffectiveDate <= invoiceDate : gstEffectiveDate <= new Date())
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
      if (!numbersMatch) notes.push("Invoice identifier does not match ABR record");
      if (!entityNameCloseMatch) notes.push("Supplier name does not closely match ABR entity name");
      if (!abnActiveOnInvoiceDate) notes.push("ABN appears inactive or cancelled for the invoice date");
      if (!gstRegisteredOnInvoiceDate) notes.push("GST registration inactive for invoice date");

      return {
        invoiceId: xeroInvoiceId,
        invoiceDate: invoiceDate?.toISOString(),
        supplierName: invoice.contact?.name,
        abnOnInvoice: identifier.digits,
        abr,
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
