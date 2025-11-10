import "server-only";

import { and, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import type {
  ArCommsArtefact,
  ArCommsArtefactInsert,
  ArContact,
  ArContactInsert,
  ArInvoice,
  ArInvoiceInsert,
  ArNote,
  ArNoteInsert,
  ArPayment,
  ArPaymentInsert,
  ArReminder,
  ArReminderInsert,
} from "../schema/ar";
import {
  arCommsArtefact,
  arContact,
  arInvoice,
  arNote,
  arPayment,
  arReminder,
} from "../schema/ar";
import { db } from "../queries";
import { ChatSDKError } from "@/lib/errors";

export type InvoiceWithContact = ArInvoice & {
  contact: ArContact;
  daysOverdue: number;
};

export type ListInvoicesDueParams = {
  userId: string;
  asOf: Date;
  minDaysOverdue?: number;
  customerId?: string;
};

export type ListInvoicesDueResult = {
  invoices: InvoiceWithContact[];
  asOf: string;
};

/**
 * List invoices that are due or overdue
 */
export async function listInvoicesDue({
  userId,
  asOf,
  minDaysOverdue = 0,
  customerId,
}: ListInvoicesDueParams): Promise<ListInvoicesDueResult> {
  try {
    const conditions = [
      eq(arInvoice.userId, userId),
      lte(arInvoice.dueDate, asOf),
      sql`${arInvoice.status} IN ('awaiting_payment', 'partially_paid', 'overdue')`,
    ];

    if (customerId) {
      conditions.push(eq(arInvoice.contactId, customerId));
    }

    const results = await db
      .select({
        invoice: arInvoice,
        contact: arContact,
      })
      .from(arInvoice)
      .innerJoin(arContact, eq(arInvoice.contactId, arContact.id))
      .where(and(...conditions))
      .orderBy(desc(arInvoice.dueDate));

    const invoicesWithOverdue: InvoiceWithContact[] = results
      .map((row) => {
        const daysOverdue = Math.max(
          0,
          Math.floor(
            (asOf.getTime() - new Date(row.invoice.dueDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        return {
          ...row.invoice,
          contact: row.contact,
          daysOverdue,
        };
      })
      .filter((inv) => inv.daysOverdue >= minDaysOverdue);

    return {
      invoices: invoicesWithOverdue,
      asOf: asOf.toISOString(),
    };
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to list invoices due"
    );
  }
}

/**
 * Get a single invoice with contact details
 */
export async function getInvoiceWithContact(
  invoiceId: string
): Promise<InvoiceWithContact | null> {
  try {
    const results = await db
      .select({
        invoice: arInvoice,
        contact: arContact,
      })
      .from(arInvoice)
      .innerJoin(arContact, eq(arInvoice.contactId, arContact.id))
      .where(eq(arInvoice.id, invoiceId))
      .limit(1);

    if (results.length === 0) return null;

    const row = results[0];
    const daysOverdue = Math.max(
      0,
      Math.floor(
        (new Date().getTime() - new Date(row.invoice.dueDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    return {
      ...row.invoice,
      contact: row.contact,
      daysOverdue,
    };
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get invoice with contact"
    );
  }
}

/**
 * Upsert contacts (insert or update by externalRef)
 */
export async function upsertContacts(
  userId: string,
  contacts: Omit<ArContactInsert, "userId">[]
): Promise<ArContact[]> {
  try {
    const results: ArContact[] = [];

    for (const contact of contacts) {
      const existing = contact.externalRef
        ? await db
            .select()
            .from(arContact)
            .where(
              and(
                eq(arContact.userId, userId),
                eq(arContact.externalRef, contact.externalRef)
              )
            )
            .limit(1)
        : [];

      if (existing.length > 0) {
        const [updated] = await db
          .update(arContact)
          .set({
            ...contact,
            updatedAt: new Date(),
          })
          .where(eq(arContact.id, existing[0].id))
          .returning();
        results.push(updated);
      } else {
        const [inserted] = await db
          .insert(arContact)
          .values({
            ...contact,
            userId,
          })
          .returning();
        results.push(inserted);
      }
    }

    return results;
  } catch (error) {
    throw new ChatSDKError("bad_request:database", "Failed to upsert contacts");
  }
}

/**
 * Upsert invoices (insert or update by externalRef)
 */
export async function upsertInvoices(
  userId: string,
  invoices: Omit<ArInvoiceInsert, "userId">[]
): Promise<ArInvoice[]> {
  try {
    const results: ArInvoice[] = [];

    for (const invoice of invoices) {
      const existing = invoice.externalRef
        ? await db
            .select()
            .from(arInvoice)
            .where(
              and(
                eq(arInvoice.userId, userId),
                eq(arInvoice.externalRef, invoice.externalRef)
              )
            )
            .limit(1)
        : [];

      if (existing.length > 0) {
        const [updated] = await db
          .update(arInvoice)
          .set({
            ...invoice,
            updatedAt: new Date(),
          })
          .where(eq(arInvoice.id, existing[0].id))
          .returning();
        results.push(updated);
      } else {
        const [inserted] = await db
          .insert(arInvoice)
          .values({
            ...invoice,
            userId,
          })
          .returning();
        results.push(inserted);
      }
    }

    return results;
  } catch (error) {
    throw new ChatSDKError("bad_request:database", "Failed to upsert invoices");
  }
}

/**
 * Insert a payment and update invoice status
 */
export async function insertPayment(
  payment: ArPaymentInsert
): Promise<{ payment: ArPayment; invoice: ArInvoice }> {
  try {
    const [newPayment] = await db
      .insert(arPayment)
      .values(payment)
      .returning();

    // Get invoice and calculate new status
    const [invoice] = await db
      .select()
      .from(arInvoice)
      .where(eq(arInvoice.id, payment.invoiceId))
      .limit(1);

    if (!invoice) {
      throw new ChatSDKError("not_found", "Invoice not found");
    }

    const newAmountPaid = (
      parseFloat(invoice.amountPaid) + parseFloat(payment.amount.toString())
    ).toFixed(2);

    const total = parseFloat(invoice.total);
    const paid = parseFloat(newAmountPaid);

    let newStatus: string = invoice.status;
    if (paid >= total) {
      newStatus = "paid";
    } else if (paid > 0) {
      newStatus = "partially_paid";
    }

    const [updatedInvoice] = await db
      .update(arInvoice)
      .set({
        amountPaid: newAmountPaid,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(arInvoice.id, payment.invoiceId))
      .returning();

    return { payment: newPayment, invoice: updatedInvoice };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError("bad_request:database", "Failed to insert payment");
  }
}

/**
 * Mark invoice as paid
 */
export async function markInvoicePaid(
  invoiceId: string,
  amount: string,
  paidAt: Date,
  reference?: string
): Promise<ArInvoice> {
  try {
    const payment: ArPaymentInsert = {
      invoiceId,
      amount,
      paidAt,
      reference,
    };

    const { invoice } = await insertPayment(payment);
    return invoice;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to mark invoice paid"
    );
  }
}

/**
 * Create a communication artefact
 */
export async function createCommsArtefact(
  artefact: ArCommsArtefactInsert
): Promise<ArCommsArtefact> {
  try {
    const [created] = await db
      .insert(arCommsArtefact)
      .values(artefact)
      .returning();
    return created;
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create comms artefact"
    );
  }
}

/**
 * Get artefacts for an invoice
 */
export async function getInvoiceArtefacts(
  invoiceId: string
): Promise<ArCommsArtefact[]> {
  try {
    return await db
      .select()
      .from(arCommsArtefact)
      .where(eq(arCommsArtefact.invoiceId, invoiceId))
      .orderBy(desc(arCommsArtefact.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get invoice artefacts"
    );
  }
}

/**
 * Create a note for an invoice
 */
export async function createNote(note: ArNoteInsert): Promise<ArNote> {
  try {
    const [created] = await db.insert(arNote).values(note).returning();
    return created;
  } catch (error) {
    throw new ChatSDKError("bad_request:database", "Failed to create note");
  }
}

/**
 * Get notes for an invoice
 */
export async function getInvoiceNotes(invoiceId: string): Promise<ArNote[]> {
  try {
    return await db
      .select()
      .from(arNote)
      .where(eq(arNote.invoiceId, invoiceId))
      .orderBy(desc(arNote.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get invoice notes"
    );
  }
}

/**
 * Create a reminder schedule
 */
export async function createReminder(
  reminder: ArReminderInsert
): Promise<ArReminder> {
  try {
    const [created] = await db.insert(arReminder).values(reminder).returning();
    return created;
  } catch (error) {
    throw new ChatSDKError("bad_request:database", "Failed to create reminder");
  }
}

/**
 * Get reminders for an invoice
 */
export async function getInvoiceReminders(
  invoiceId: string
): Promise<ArReminder[]> {
  try {
    return await db
      .select()
      .from(arReminder)
      .where(eq(arReminder.invoiceId, invoiceId))
      .orderBy(desc(arReminder.plannedAt));
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get invoice reminders"
    );
  }
}

/**
 * Get all contacts for a user
 */
export async function getUserContacts(userId: string): Promise<ArContact[]> {
  try {
    return await db
      .select()
      .from(arContact)
      .where(eq(arContact.userId, userId))
      .orderBy(arContact.name);
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user contacts"
    );
  }
}

/**
 * Get recent artefacts for a user
 */
export async function getUserRecentArtefacts(
  userId: string,
  limit = 50
): Promise<ArCommsArtefact[]> {
  try {
    return await db
      .select()
      .from(arCommsArtefact)
      .where(eq(arCommsArtefact.userId, userId))
      .orderBy(desc(arCommsArtefact.createdAt))
      .limit(limit);
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user recent artefacts"
    );
  }
}
