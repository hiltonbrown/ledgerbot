import "server-only";

import { subMonths } from "date-fns";
import { eq } from "drizzle-orm";
import type { XeroClient } from "xero-node";
import { db } from "@/lib/db/queries";
import {
  arContact,
  arCreditNote,
  arCustomerHistory,
  arInvoice,
  arOverpayment,
  arPayment,
  arPrepayment,
} from "@/lib/db/schema";
import {
  calculateAgeingBucket,
  calculateCustomerHistory,
} from "@/lib/logic/ar";
import {
  acquireConcurrentSlot,
  getRobustXeroClient,
  paginateXeroAPI,
} from "@/lib/xero/client-helpers";

/**
 * Syncs Xero data for the AR Agent.
 * Fetches Contacts, Invoices (last 24 months), and Payments.
 * Updates local DB and calculates customer history.
 */
export async function syncXeroData(userId: string) {
  console.log(`[AR Ingestion] Starting sync for user ${userId}`);

  const { client: xeroClient, connection } = await getRobustXeroClient(userId);

  const tenantId = connection.tenantId;

  // 1. Fetch Contacts (Customers)
  // We only want customers, but Xero contacts are generic.
  // We'll fetch all and filter or just upsert all.
  // For efficiency, we might want to filter by IsCustomer=true if possible,
  // but the SDK might not expose it easily in the where clause without raw string.
  // We'll fetch all active contacts.
  console.log("[AR Ingestion] Fetching contacts...");
  const contacts = await fetchAllContacts(xeroClient, tenantId);
  console.log(`[AR Ingestion] Fetched ${contacts.length} contacts`);

  // Upsert contacts
  for (const contact of contacts) {
    const contactID = contact.contactID;
    if (!contactID) {
      continue;
    }

    try {
      await db.transaction(async (tx) => {
        const existingContact = await tx.query.arContact.findFirst({
          where: (table, { and, eq }) =>
            and(eq(table.userId, userId), eq(table.externalRef, contactID)),
        });

        const contactData = {
          name: contact.name || "Unknown",
          email: contact.emailAddress,
          phone: contact.phones?.[0]?.phoneNumber,
          metadata: { xeroContact: contact },
          updatedAt: new Date(),
        };

        if (existingContact) {
          await tx
            .update(arContact)
            .set(contactData)
            .where(eq(arContact.id, existingContact.id));
        } else {
          await tx.insert(arContact).values({
            userId,
            externalRef: contactID,
            ...contactData,
          });
        }
      });
    } catch (error) {
      console.error(
        `[AR Ingestion] Error processing contact ${contact.contactID}:`,
        error
      );
    }
  }

  // 2. Fetch Invoices (Last 24 Months)
  const startDate = subMonths(new Date(), 24);
  const whereClause = `Date >= DateTime(${startDate.getUTCFullYear()}, ${startDate.getUTCMonth() + 1}, ${startDate.getUTCDate()})`;
  console.log(
    `[AR Ingestion] Fetching invoices since ${startDate.toISOString()}...`
  );

  // We need to handle pagination manually or use a helper.
  // xero-node doesn't auto-paginate.
  const invoices = await fetchAllInvoices(xeroClient, tenantId, whereClause);
  console.log(`[AR Ingestion] Fetched ${invoices.length} invoices`);

  // Upsert Invoices
  // We need to map contactID to our internal ID.
  // We can do a lookup or just rely on the fact we just synced them.
  // To be safe, we'll query our DB for the contact ID map.
  const contactMap = await getContactMap(userId);

  for (const invoice of invoices) {
    if (
      !invoice.contact?.contactID ||
      !contactMap.has(invoice.contact.contactID)
    ) {
      console.warn(
        `[AR Ingestion] Skipping invoice ${invoice.invoiceID} - Contact not found`
      );
      continue;
    }

    const contactId = contactMap.get(invoice.contact.contactID);
    if (!contactId) {
      console.warn(
        `[AR Ingestion] Skipping invoice ${invoice.invoiceID} - Contact ID not found in map`
      );
      continue;
    }
    const amountOutstanding = invoice.amountDue || 0;
    const dueDate = new Date(invoice.dueDate || invoice.date || new Date());

    try {
      await db
        .insert(arInvoice)
        .values({
          userId,
          contactId,
          number: invoice.invoiceNumber || "UNKNOWN",
          issueDate: new Date(invoice.date || new Date()),
          dueDate,
          currency: String(invoice.currencyCode || "AUD"),
          subtotal: (invoice.subTotal || 0).toString(),
          tax: (invoice.totalTax || 0).toString(),
          total: (invoice.total || 0).toString(),
          amountPaid: (invoice.amountPaid || 0).toString(),
          amountOutstanding: amountOutstanding.toString(),
          creditNoteAmount: (invoice.amountCredited || 0).toString(),
          status: mapInvoiceStatus(invoice.status),
          ageingBucket: calculateAgeingBucket(dueDate, amountOutstanding),
          externalRef: invoice.invoiceID || `unknown-${Date.now()}`,
          metadata: { xeroInvoice: invoice },
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [arInvoice.externalRef, arInvoice.userId], // Using the unique index
          set: {
            amountPaid: (invoice.amountPaid || 0).toString(),
            amountOutstanding: amountOutstanding.toString(),
            creditNoteAmount: (invoice.amountCredited || 0).toString(),
            status: mapInvoiceStatus(invoice.status),
            ageingBucket: calculateAgeingBucket(dueDate, amountOutstanding),
            metadata: { xeroInvoice: invoice },
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      console.error(
        `[AR Ingestion] Error processing invoice ${invoice.invoiceID}:`,
        error
      );
    }
  }

  // 3. Fetch Payments (Last 24 Months)
  // Xero Payments endpoint allows filtering by Date.
  console.log("[AR Ingestion] Fetching payments...");
  const payments = await fetchAllPayments(xeroClient, tenantId, whereClause);
  console.log(`[AR Ingestion] Fetched ${payments.length} payments`);

  for (const payment of payments) {
    if (!payment.invoice?.invoiceID) continue;

    // Find our internal invoice ID
    const localInvoice = await db.query.arInvoice.findFirst({
      where: (table, { eq, and }) =>
        and(
          eq(table.externalRef, payment.invoice?.invoiceID || ""),
          eq(table.userId, userId)
        ),
    });

    if (!localInvoice) {
      // Invoice might be older than 24 months or filtered out
      continue;
    }

    try {
      await db
        .insert(arPayment)
        .values({
          invoiceId: localInvoice.id,
          contactId: localInvoice.contactId,
          amount: (payment.amount || 0).toString(),
          paidAt: new Date(payment.date || new Date()),
          method: payment.paymentType ? String(payment.paymentType) : "Unknown",
          reference: payment.reference,
          externalRef: payment.paymentID || `unknown-${Date.now()}`,
          metadata: { xeroPayment: payment },
        })
        .onConflictDoNothing(); // Payments are immutable usually, but we could update if needed
    } catch (error) {
      console.error(
        `[AR Ingestion] Error processing payment ${payment.paymentID}:`,
        error
      );
    }
  }

  // 4. Fetch Credit Notes (Last 24 Months)
  console.log("[AR Ingestion] Fetching credit notes...");
  const creditNotes = await fetchAllCreditNotes(
    xeroClient,
    tenantId,
    whereClause
  );
  console.log(`[AR Ingestion] Fetched ${creditNotes.length} credit notes`);

  for (const creditNote of creditNotes) {
    if (
      !creditNote.contact?.contactID ||
      !contactMap.has(creditNote.contact.contactID)
    ) {
      console.warn(
        `[AR Ingestion] Skipping credit note ${creditNote.creditNoteID} - Contact not found`
      );
      continue;
    }

    const contactId = contactMap.get(creditNote.contact.contactID);
    if (!contactId) {
      console.warn(
        `[AR Ingestion] Skipping credit note ${creditNote.creditNoteID} - Contact ID not found in map`
      );
      continue;
    }
    const total = creditNote.total || 0;

    // Use remainingCredit from API if available (allocations are often empty in list view)
    let amountRemaining = 0;
    let amountAllocated = 0;

    if (creditNote.remainingCredit !== undefined) {
      amountRemaining = creditNote.remainingCredit;
      amountAllocated = total - amountRemaining;
    } else {
      // Fallback to allocations if remainingCredit is missing (unlikely)
      amountAllocated =
        creditNote.allocations?.reduce(
          (sum: number, alloc: any) => sum + (alloc.appliedAmount || 0),
          0
        ) || 0;
      amountRemaining = total - amountAllocated;
    }

    try {
      await db
        .insert(arCreditNote)
        .values({
          userId,
          contactId,
          number: creditNote.creditNoteNumber || "UNKNOWN",
          issueDate: new Date(creditNote.date || new Date()),
          currency: String(creditNote.currencyCode || "AUD"),
          subtotal: (creditNote.subTotal || 0).toString(),
          tax: (creditNote.totalTax || 0).toString(),
          total: total.toString(),
          amountAllocated: amountAllocated.toString(),
          amountRemaining: amountRemaining.toString(),
          status: mapCreditNoteStatus(creditNote.status),
          externalRef: creditNote.creditNoteID || `unknown-${Date.now()}`,
          metadata: { xeroCreditNote: creditNote },
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [arCreditNote.externalRef, arCreditNote.userId],
          set: {
            amountAllocated: amountAllocated.toString(),
            amountRemaining: amountRemaining.toString(),
            status: mapCreditNoteStatus(creditNote.status),
            metadata: { xeroCreditNote: creditNote },
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      console.error(
        `[AR Ingestion] Error processing credit note ${creditNote.creditNoteID}:`,
        error
      );
    }
  }

  // 5. Fetch Overpayments (Last 24 Months)
  console.log("[AR Ingestion] Fetching overpayments...");
  const overpayments = await fetchAllOverpayments(
    xeroClient,
    tenantId,
    whereClause
  );
  console.log(`[AR Ingestion] Fetched ${overpayments.length} overpayments`);

  for (const overpayment of overpayments) {
    if (
      !overpayment.contact?.contactID ||
      !contactMap.has(overpayment.contact.contactID)
    ) {
      continue;
    }

    const contactId = contactMap.get(overpayment.contact.contactID);
    if (!contactId) {
      continue;
    }
    const total = overpayment.total || 0;

    let amountRemaining = 0;
    let amountAllocated = 0;

    if (overpayment.remainingCredit !== undefined) {
      amountRemaining = overpayment.remainingCredit;
      amountAllocated = total - amountRemaining;
    } else {
      amountAllocated =
        overpayment.allocations?.reduce(
          (sum: number, alloc: any) => sum + (alloc.appliedAmount || 0),
          0
        ) || 0;
      amountRemaining = total - amountAllocated;
    }

    try {
      await db
        .insert(arOverpayment)
        .values({
          userId,
          contactId,
          currency: String(overpayment.currencyCode || "AUD"),
          subtotal: (overpayment.subTotal || 0).toString(),
          tax: (overpayment.totalTax || 0).toString(),
          total: total.toString(),
          amountAllocated: amountAllocated.toString(),
          amountRemaining: amountRemaining.toString(),
          date: new Date(overpayment.date || new Date()),
          status: mapCreditNoteStatus(overpayment.status), // Reuse status map as they are similar
          externalRef: overpayment.overpaymentID || `unknown-${Date.now()}`,
          metadata: { xeroOverpayment: overpayment },
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [arOverpayment.externalRef, arOverpayment.userId],
          set: {
            amountAllocated: amountAllocated.toString(),
            amountRemaining: amountRemaining.toString(),
            status: mapCreditNoteStatus(overpayment.status),
            metadata: { xeroOverpayment: overpayment },
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      console.error(
        `[AR Ingestion] Error processing overpayment ${overpayment.overpaymentID}:`,
        error
      );
    }
  }

  // 6. Fetch Prepayments (Last 24 Months)
  console.log("[AR Ingestion] Fetching prepayments...");
  const prepayments = await fetchAllPrepayments(
    xeroClient,
    tenantId,
    whereClause
  );
  console.log(`[AR Ingestion] Fetched ${prepayments.length} prepayments`);

  for (const prepayment of prepayments) {
    if (
      !prepayment.contact?.contactID ||
      !contactMap.has(prepayment.contact.contactID)
    ) {
      continue;
    }

    const contactId = contactMap.get(prepayment.contact.contactID);
    if (!contactId) {
      continue;
    }
    const total = prepayment.total || 0;

    let amountRemaining = 0;
    let amountAllocated = 0;

    if (prepayment.remainingCredit !== undefined) {
      amountRemaining = prepayment.remainingCredit;
      amountAllocated = total - amountRemaining;
    } else {
      amountAllocated =
        prepayment.allocations?.reduce(
          (sum: number, alloc: any) => sum + (alloc.appliedAmount || 0),
          0
        ) || 0;
      amountRemaining = total - amountAllocated;
    }

    try {
      await db
        .insert(arPrepayment)
        .values({
          userId,
          contactId,
          currency: String(prepayment.currencyCode || "AUD"),
          subtotal: (prepayment.subTotal || 0).toString(),
          tax: (prepayment.totalTax || 0).toString(),
          total: total.toString(),
          amountAllocated: amountAllocated.toString(),
          amountRemaining: amountRemaining.toString(),
          date: new Date(prepayment.date || new Date()),
          status: mapCreditNoteStatus(prepayment.status), // Reuse status map
          externalRef: prepayment.prepaymentID || `unknown-${Date.now()}`,
          metadata: { xeroPrepayment: prepayment },
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [arPrepayment.externalRef, arPrepayment.userId],
          set: {
            amountAllocated: amountAllocated.toString(),
            amountRemaining: amountRemaining.toString(),
            status: mapCreditNoteStatus(prepayment.status),
            metadata: { xeroPrepayment: prepayment },
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      console.error(
        `[AR Ingestion] Error processing prepayment ${prepayment.prepaymentID}:`,
        error
      );
    }
  }

  // 7. Calculate Customer History
  console.log("[AR Ingestion] Calculating customer history...");
  const allContacts = await db
    .select()
    .from(arContact)
    .where(eq(arContact.userId, userId));

  for (const contact of allContacts) {
    const contactInvoices = await db
      .select()
      .from(arInvoice)
      .where(eq(arInvoice.contactId, contact.id));

    const contactPayments = await db
      .select()
      .from(arPayment)
      .where(eq(arPayment.contactId, contact.id));

    // Calculate and store customer history
    const history = calculateCustomerHistory(contactInvoices, contactPayments);

    // Convert numeric fields to strings for database
    const historyForDb = {
      ...history,
      totalOutstanding: history.totalOutstanding.toString(),
      maxInvoiceOutstanding: history.maxInvoiceOutstanding.toString(),
      totalBilledLast12Months: history.totalBilledLast12Months.toString(),
    };

    await db
      .insert(arCustomerHistory)
      .values({
        userId,
        customerId: contact.id,
        startDate,
        endDate: new Date(),
        ...historyForDb,
      })
      .onConflictDoUpdate({
        target: [arCustomerHistory.userId, arCustomerHistory.customerId],
        set: {
          startDate,
          endDate: new Date(),
          ...historyForDb,
          computedAt: new Date(),
        },
      });
  }

  console.log(`[AR Ingestion] Sync complete for user ${userId}`);
}

// Helpers

function fetchAllContacts(xeroClient: XeroClient, tenantId: string) {
  return paginateXeroAPI(
    async (page, pageSize) => {
      const release = await acquireConcurrentSlot(tenantId);
      try {
        const response = await xeroClient.accountingApi.getContacts(
          tenantId,
          undefined,
          undefined,
          undefined,
          undefined,
          page,
          undefined, // includeArchived
          undefined, // summaryOnly
          undefined, // searchTerm
          pageSize
        );
        return {
          results: response.body.contacts || [],
          headers: response.response.headers,
        };
      } finally {
        release();
      }
    },
    undefined, // No limit
    100, // Page size
    tenantId // Connection ID for rate limiting
  );
}

function fetchAllInvoices(
  xeroClient: XeroClient,
  tenantId: string,
  where?: string
) {
  return paginateXeroAPI(
    async (page, pageSize) => {
      const release = await acquireConcurrentSlot(tenantId);
      try {
        const response = await xeroClient.accountingApi.getInvoices(
          tenantId,
          undefined,
          where,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          page,
          undefined, // includeArchived
          undefined, // createdByMyApp
          undefined, // unitdp
          undefined, // summaryOnly
          pageSize
        );
        return {
          results: response.body.invoices || [],
          headers: response.response.headers,
        };
      } finally {
        release();
      }
    },
    undefined,
    100,
    tenantId
  );
}

function fetchAllPayments(
  xeroClient: XeroClient,
  tenantId: string,
  where?: string
) {
  // Payments endpoint DOES NOT support pagination in the SDK/API directly in the same way?
  // Actually, Xero API docs say GET /Payments supports 'page' parameter now?
  // Let's check the SDK signature.
  // xeroClient.accountingApi.getPayments(xeroTenantId, ifModifiedSince, where, order, page)
  // If the SDK supports it, we can use it.
  // If not, we might need to rely on the fact that we are filtering by date.
  // Assuming SDK supports page (it should in recent versions).

  return paginateXeroAPI(
    async (page, pageSize) => {
      const release = await acquireConcurrentSlot(tenantId);
      try {
        // Check if page is supported in this SDK version
        const response = await xeroClient.accountingApi.getPayments(
          tenantId,
          undefined, // ifModifiedSince
          where,
          undefined, // order
          page, // Passing page if supported
          pageSize // pageSize
        );
        return {
          results: response.body.payments || [],
          headers: response.response.headers,
        };
      } finally {
        release();
      }
    },
    undefined,
    100,
    tenantId
  );
}

async function getContactMap(userId: string) {
  const contacts = await db
    .select({ id: arContact.id, externalRef: arContact.externalRef })
    .from(arContact)
    .where(eq(arContact.userId, userId));

  const map = new Map<string, string>();
  for (const c of contacts) {
    if (c.externalRef) {
      map.set(c.externalRef, c.id);
    }
  }
  return map;
}

async function fetchAllCreditNotes(
  xeroClient: XeroClient,
  tenantId: string,
  where?: string
) {
  const allCreditNotes = await paginateXeroAPI(
    async (page, pageSize) => {
      const release = await acquireConcurrentSlot(tenantId);
      try {
        const response = await xeroClient.accountingApi.getCreditNotes(
          tenantId,
          undefined,
          where,
          undefined,
          page,
          undefined, // unitdp
          pageSize
        );
        return {
          results: response.body.creditNotes || [],
          headers: response.response.headers,
        };
      } finally {
        release();
      }
    },
    undefined,
    100,
    tenantId
  );

  // Filter for ACCRECCREDIT (sales credit notes)
  return allCreditNotes.filter((cn) => String(cn.type) === "ACCRECCREDIT");
}

async function fetchAllOverpayments(
  xeroClient: XeroClient,
  tenantId: string,
  where?: string
) {
  const allOverpayments = await paginateXeroAPI(
    async (page, pageSize) => {
      const release = await acquireConcurrentSlot(tenantId);
      try {
        const response = await xeroClient.accountingApi.getOverpayments(
          tenantId,
          undefined,
          where,
          undefined,
          page,
          undefined, // unitdp
          pageSize
        );
        return {
          results: response.body.overpayments || [],
          headers: response.response.headers,
        };
      } finally {
        release();
      }
    },
    undefined,
    100,
    tenantId
  );

  // Filter for RECEIVE-OVERPAYMENT (AR side)
  // Xero Overpayments can be SPEND-OVERPAYMENT (AP) or RECEIVE-OVERPAYMENT (AR)
  return allOverpayments.filter(
    (op) => String(op.type) === "RECEIVE-OVERPAYMENT"
  );
}

async function fetchAllPrepayments(
  xeroClient: XeroClient,
  tenantId: string,
  where?: string
) {
  const allPrepayments = await paginateXeroAPI(
    async (page, pageSize) => {
      const release = await acquireConcurrentSlot(tenantId);
      try {
        const response = await xeroClient.accountingApi.getPrepayments(
          tenantId,
          undefined,
          where,
          undefined,
          page,
          undefined, // unitdp
          pageSize
        );
        return {
          results: response.body.prepayments || [],
          headers: response.response.headers,
        };
      } finally {
        release();
      }
    },
    undefined,
    100,
    tenantId
  );

  // Filter for RECEIVE-PREPAYMENT (AR side)
  return allPrepayments.filter(
    (pp) => String(pp.type) === "RECEIVE-PREPAYMENT"
  );
}

function mapInvoiceStatus(status?: string | { toString(): string }): string {
  // Map Xero status to our status
  // DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED
  if (!status) {
    return "unknown";
  }
  const s = status.toString().toUpperCase();
  if (s === "PAID") {
    return "paid";
  }
  if (s === "VOIDED") {
    return "voided";
  }
  if (s === "AUTHORISED") {
    return "awaiting_payment";
  }
  return s.toLowerCase();
}

function mapCreditNoteStatus(status?: string | { toString(): string }): string {
  // Map Xero credit note status to our status
  // DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED
  if (!status) {
    return "draft";
  }
  const s = status.toString().toUpperCase();
  if (s === "AUTHORISED") {
    return "authorised";
  }
  if (s === "PAID") {
    return "paid";
  }
  if (s === "VOIDED") {
    return "voided";
  }
  return s.toLowerCase();
}
