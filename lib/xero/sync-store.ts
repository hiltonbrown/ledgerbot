import { eq, sql } from "drizzle-orm";
import type { Contact, CreditNote, Invoice, Payment } from "xero-node";
import { db } from "@/lib/db/queries";
import {
  xeroConnection,
  xeroContact,
  xeroCreditNote,
  xeroInvoice,
  xeroPayment,
} from "@/lib/db/schema";

/**
 * Get the last sync date for a specific entity type
 */
export async function getLastSyncDate(
  tenantId: string,
  entityType: "invoices" | "contacts" | "payments" | "creditNotes"
): Promise<Date | undefined> {
  const result = await db
    .select({
      invoicesSyncedAt: xeroConnection.invoicesSyncedAt,
      contactsSyncedAt: xeroConnection.contactsSyncedAt,
      paymentsSyncedAt: xeroConnection.paymentsSyncedAt,
      creditNotesSyncedAt: xeroConnection.creditNotesSyncedAt,
    })
    .from(xeroConnection)
    .where(eq(xeroConnection.tenantId, tenantId))
    .limit(1);

  if (!result.length) return;

  switch (entityType) {
    case "invoices":
      return result[0].invoicesSyncedAt || undefined;
    case "contacts":
      return result[0].contactsSyncedAt || undefined;
    case "payments":
      return result[0].paymentsSyncedAt || undefined;
    case "creditNotes":
      return result[0].creditNotesSyncedAt || undefined;
  }
}

/**
 * Update the last sync date for a specific entity type
 */
export async function updateLastSyncDate(
  tenantId: string,
  entityType: "invoices" | "contacts" | "payments" | "creditNotes",
  date: Date
): Promise<void> {
  const data: Partial<typeof xeroConnection.$inferInsert> = {};

  switch (entityType) {
    case "invoices":
      data.invoicesSyncedAt = date;
      break;
    case "contacts":
      data.contactsSyncedAt = date;
      break;
    case "payments":
      data.paymentsSyncedAt = date;
      break;
    case "creditNotes":
      data.creditNotesSyncedAt = date;
      break;
  }

  await db
    .update(xeroConnection)
    .set(data)
    .where(eq(xeroConnection.tenantId, tenantId));
}

/**
 * Upsert invoices into the cache
 */
export async function upsertInvoices(
  tenantId: string,
  invoices: Invoice[]
): Promise<void> {
  if (invoices.length === 0) return;

  const values = invoices.map((invoice) => ({
    tenantId,
    xeroId: invoice.invoiceID!,
    invoiceNumber: invoice.invoiceNumber,
    type: invoice.type ? String(invoice.type) : undefined,
    status: invoice.status ? String(invoice.status) : undefined,
    contactId: invoice.contact?.contactID,
    contactName: invoice.contact?.name,
    date: invoice.date ? new Date(invoice.date) : null,
    dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
    amountDue: invoice.amountDue,
    amountPaid: invoice.amountPaid,
    total: invoice.total,
    currencyCode: invoice.currencyCode
      ? String(invoice.currencyCode)
      : undefined,
    data: invoice,
    xeroUpdatedDateUtc: invoice.updatedDateUTC
      ? new Date(invoice.updatedDateUTC)
      : new Date(),
    searchVector: `${invoice.invoiceNumber || ""} ${invoice.contact?.name || ""} ${invoice.reference || ""}`,
  }));

  // Using ON CONFLICT logic
  await db
    .insert(xeroInvoice)
    .values(values)
    .onConflictDoUpdate({
      target: [xeroInvoice.tenantId, xeroInvoice.xeroId],
      set: {
        invoiceNumber: sql`excluded."invoiceNumber"`,
        type: sql`excluded."type"`,
        status: sql`excluded."status"`,
        contactId: sql`excluded."contactId"`,
        contactName: sql`excluded."contactName"`,
        date: sql`excluded."date"`,
        dueDate: sql`excluded."dueDate"`,
        amountDue: sql`excluded."amountDue"`,
        amountPaid: sql`excluded."amountPaid"`,
        total: sql`excluded."total"`,
        currencyCode: sql`excluded."currencyCode"`,
        data: sql`excluded."data"`,
        xeroUpdatedDateUtc: sql`excluded."xeroUpdatedDateUtc"`,
        searchVector: sql`excluded."search_vector"`,
        updatedAt: new Date(),
      },
    });
}

/**
 * Upsert contacts into the cache
 */
export async function upsertContacts(
  tenantId: string,
  contacts: Contact[]
): Promise<void> {
  if (contacts.length === 0) return;

  const values = contacts.map((contact) => ({
    tenantId,
    xeroId: contact.contactID!,
    name: contact.name,
    email: contact.emailAddress,
    isCustomer: contact.isCustomer || false,
    isSupplier: contact.isSupplier || false,
    data: contact,
    xeroUpdatedDateUtc: contact.updatedDateUTC
      ? new Date(contact.updatedDateUTC)
      : new Date(),
    searchVector: `${contact.name || ""} ${contact.emailAddress || ""} ${contact.accountNumber || ""}`,
  }));

  await db
    .insert(xeroContact)
    .values(values)
    .onConflictDoUpdate({
      target: [xeroContact.tenantId, xeroContact.xeroId],
      set: {
        name: sql`excluded."name"`,
        email: sql`excluded."email"`,
        isCustomer: sql`excluded."isCustomer"`,
        isSupplier: sql`excluded."isSupplier"`,
        data: sql`excluded."data"`,
        xeroUpdatedDateUtc: sql`excluded."xeroUpdatedDateUtc"`,
        searchVector: sql`excluded."search_vector"`,
        updatedAt: new Date(),
      },
    });
}

/**
 * Upsert payments into the cache
 */
export async function upsertPayments(
  tenantId: string,
  payments: Payment[]
): Promise<void> {
  if (payments.length === 0) return;

  const values = payments.map((payment) => ({
    tenantId,
    xeroId: payment.paymentID!,
    invoiceId: payment.invoice?.invoiceID,
    date: payment.date ? new Date(payment.date) : null,
    amount: payment.amount,
    reference: payment.reference,
    paymentType: payment.paymentType ? String(payment.paymentType) : undefined,
    status: payment.status ? String(payment.status) : undefined,
    data: payment,
    xeroUpdatedDateUtc: payment.updatedDateUTC
      ? new Date(payment.updatedDateUTC)
      : new Date(),
  }));

  await db
    .insert(xeroPayment)
    .values(values)
    .onConflictDoUpdate({
      target: [xeroPayment.tenantId, xeroPayment.xeroId],
      set: {
        invoiceId: sql`excluded."invoiceId"`,
        date: sql`excluded."date"`,
        amount: sql`excluded."amount"`,
        reference: sql`excluded."reference"`,
        paymentType: sql`excluded."paymentType"`,
        status: sql`excluded."status"`,
        data: sql`excluded."data"`,
        xeroUpdatedDateUtc: sql`excluded."xeroUpdatedDateUtc"`,
        updatedAt: new Date(),
      },
    });
}

/**
 * Upsert credit notes into the cache
 */
export async function upsertCreditNotes(
  tenantId: string,
  creditNotes: CreditNote[]
): Promise<void> {
  if (creditNotes.length === 0) return;

  const values = creditNotes.map((cn) => ({
    tenantId,
    xeroId: cn.creditNoteID!,
    creditNoteNumber: cn.creditNoteNumber,
    type: cn.type ? String(cn.type) : undefined,
    status: cn.status ? String(cn.status) : undefined,
    contactId: cn.contact?.contactID,
    date: cn.date ? new Date(cn.date) : null,
    total: cn.total,
    remainingCredit: cn.remainingCredit,
    currencyCode: cn.currencyCode ? String(cn.currencyCode) : undefined,
    data: cn,
    xeroUpdatedDateUtc: cn.updatedDateUTC
      ? new Date(cn.updatedDateUTC)
      : new Date(),
  }));

  await db
    .insert(xeroCreditNote)
    .values(values)
    .onConflictDoUpdate({
      target: [xeroCreditNote.tenantId, xeroCreditNote.xeroId],
      set: {
        creditNoteNumber: sql`excluded."creditNoteNumber"`,
        type: sql`excluded."type"`,
        status: sql`excluded."status"`,
        contactId: sql`excluded."contactId"`,
        date: sql`excluded."date"`,
        total: sql`excluded."total"`,
        remainingCredit: sql`excluded."remainingCredit"`,
        currencyCode: sql`excluded."currencyCode"`,
        data: sql`excluded."data"`,
        xeroUpdatedDateUtc: sql`excluded."xeroUpdatedDateUtc"`,
        updatedAt: new Date(),
      },
    });
}
