/**
 * AR messaging and comms tools for agent
 */

import { tool } from "ai";
import { z } from "zod";
import {
  createCommsArtefact,
  createNote,
  getInvoiceWithContact,
  insertPayment,
  listInvoicesDue,
  upsertContacts,
  upsertInvoices,
} from "@/lib/db/queries/ar";
import type {
  ArCommsArtefactInsert,
  ArNoteInsert,
  ArPaymentInsert,
} from "@/lib/db/schema/ar";
import { asOfOrToday, formatDisplayDate } from "@/lib/util/dates";
import { getXeroProvider } from "./xero";

// Stub function for call script generation
function generateCallScript(
  contact: unknown,
  _invoices: unknown[],
  totalDue: number,
  daysOverdue: number,
  tone: "polite" | "firm" | "final",
  includePaymentPlan: boolean
): unknown {
  return {
    script: "Call script placeholder",
    contact,
    totalDue,
    daysOverdue,
    tone,
    includePaymentPlan,
  };
}

/**
 * Get invoices that are due or overdue
 */
export const getInvoicesDueTool = tool({
  description:
    "Get all invoices that are due or overdue, optionally filtered by minimum days overdue and customer ID",
  inputSchema: z.object({
    userId: z.string().describe("User ID"),
    tenantId: z.string().describe("Xero Tenant ID"),
    asOf: z.string().datetime().optional().describe("As-of date (ISO format)"),
    minDaysOverdue: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .default(0)
      .describe("Minimum days overdue (0 = all due invoices)"),
    customerId: z.string().optional().describe("Filter by customer/contact ID"),
  }),
  execute: async ({
    userId,
    tenantId,
    asOf,
    minDaysOverdue,
    customerId,
  }: {
    userId: string;
    tenantId: string;
    asOf?: string;
    minDaysOverdue?: number;
    customerId?: string;
  }) => {
    const asOfDate = asOfOrToday(asOf);
    const result = await listInvoicesDue({
      userId,
      tenantId,
      asOf: asOfDate,
      minDaysOverdue,
      customerId,
    });

    return {
      invoices: result.invoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        issueDate: inv.issueDate.toISOString(),
        dueDate: inv.dueDate.toISOString(),
        total: inv.total,
        amountPaid: inv.amountPaid,
        amountDue: (
          Number.parseFloat(inv.total) - Number.parseFloat(inv.amountPaid)
        ).toFixed(2),
        status: inv.status,
        daysOverdue: inv.daysOverdue,
        contact: {
          id: inv.contact.id,
          name: inv.contact.name,
          email: inv.contact.email || undefined,
          phone: inv.contact.phone || undefined,
        },
      })),
      asOf: result.asOf,
    };
  },
});

/**
 * Predict late payment risk for an invoice
 */
export const predictLateRiskTool = tool({
  description:
    "Predict the probability of late payment for an invoice based on days overdue and history",
  inputSchema: z.object({
    invoiceId: z.string().describe("Invoice ID"),
    tenantId: z.string().describe("Xero Tenant ID"),
  }),
  execute: async ({ invoiceId, tenantId }) => {
    const invoice = await getInvoiceWithContact(invoiceId, tenantId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const factors: string[] = [];
    let probability = 0.1; // Base risk

    // Days overdue factor (exponential)
    if (invoice.daysOverdue > 0) {
      const overdueRisk = Math.min(0.6, (invoice.daysOverdue / 30) * 0.5);
      probability += overdueRisk;
      factors.push(`${invoice.daysOverdue} days overdue`);
    }

    // Amount factor (larger invoices = higher risk in this simple model)
    const amount = Number.parseFloat(invoice.total);
    if (amount > 10_000) {
      probability += 0.1;
      factors.push("High invoice amount");
    }

    // Status factor
    if (invoice.status === "overdue") {
      probability += 0.2;
      factors.push("Invoice marked as overdue");
    } else if (invoice.status === "partially_paid") {
      probability -= 0.1;
      factors.push("Partial payment received");
    }

    // Cap probability at 0.95
    probability = Math.min(0.95, Math.max(0.05, probability));

    if (factors.length === 0) {
      factors.push("No significant risk factors");
    }

    return {
      invoiceId: invoice.id,
      probability,
      factors,
    };
  },
});

/**
 * Build email reminder artefact (does NOT send)
 */
export const buildEmailReminderTool = tool({
  description:
    "Generate a copy-ready email reminder for an overdue invoice. Does NOT send the email - only creates an artefact for user to copy-paste.",
  inputSchema: z.object({
    userId: z.string().describe("User ID"),
    tenantId: z.string().describe("Xero Tenant ID"),
    invoiceId: z.string().describe("Invoice ID"),
    templateId: z.string().describe("Template ID"),
    tone: z.enum(["polite", "firm", "final"]).describe("Tone of the reminder"),
  }),
  execute: async ({ userId, tenantId, invoiceId, templateId, tone }) => {
    const invoice = await getInvoiceWithContact(invoiceId, tenantId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const { subject, body } = generateEmailContent(
      invoice,
      tone as "polite" | "firm" | "final"
    );

    const artefact: ArCommsArtefactInsert = {
      userId,
      tenantId,
      invoiceId,
      channel: "email",
      subject,
      body,
      tone,
      metadata: {
        templateId,
        generatedAt: new Date().toISOString(),
      },
    };

    const created = await createCommsArtefact(artefact);

    return {
      invoiceId: invoice.id,
      subject,
      body,
      tone,
      artefactId: created.id,
      preview: body.slice(0, 100),
    };
  },
});

/**
 * Build SMS reminder artefact (does NOT send)
 */
export const buildSmsReminderTool = tool({
  description:
    "Generate a copy-ready SMS reminder for an overdue invoice. Does NOT send the SMS - only creates an artefact for user to copy-paste.",
  inputSchema: z.object({
    userId: z.string().describe("User ID"),
    tenantId: z.string().describe("Xero Tenant ID"),
    invoiceId: z.string().describe("Invoice ID"),
    templateId: z.string().describe("Template ID"),
    tone: z.enum(["polite", "firm", "final"]).describe("Tone of the reminder"),
  }),
  execute: async ({ userId, tenantId, invoiceId, templateId, tone }) => {
    const invoice = await getInvoiceWithContact(invoiceId, tenantId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const text = generateSmsContent(
      invoice,
      tone as "polite" | "firm" | "final"
    );

    const artefact: ArCommsArtefactInsert = {
      userId,
      tenantId,
      invoiceId,
      channel: "sms",
      subject: null,
      body: text,
      tone,
      metadata: {
        templateId,
        generatedAt: new Date().toISOString(),
      },
    };

    const created = await createCommsArtefact(artefact);

    return {
      invoiceId: invoice.id,
      text,
      tone,
      artefactId: created.id,
      preview: text.slice(0, 50),
    };
  },
});

/**
 * Reconcile a payment against an invoice
 */
export const reconcilePaymentTool = tool({
  description:
    "Record a payment against an invoice and update its status automatically",
  inputSchema: z.object({
    invoiceId: z.string().describe("Invoice ID"),
    tenantId: z.string().describe("Xero Tenant ID"),
    amount: z.number().positive().describe("Payment amount"),
    paidAt: z.string().datetime().describe("Payment date (ISO format)"),
    reference: z.string().optional().describe("Payment reference/note"),
  }),
  execute: async ({ invoiceId, tenantId, amount, paidAt, reference }) => {
    const payment: ArPaymentInsert = {
      tenantId,
      invoiceId,
      amount: amount.toFixed(2),
      paidAt: new Date(paidAt),
      reference,
    };

    const result = await insertPayment(payment);

    const amountRemaining = (
      Number.parseFloat(result.invoice.total) -
      Number.parseFloat(result.invoice.amountPaid)
    ).toFixed(2);

    return {
      invoiceId: result.invoice.id,
      newStatus: result.invoice.status,
      paymentId: result.payment.id,
      amountPaid: result.invoice.amountPaid,
      amountRemaining,
    };
  },
});

/**
 * Post an internal note on an invoice
 */
export const postNoteTool = tool({
  description: "Add an internal note to an invoice for team visibility",
  inputSchema: z.object({
    userId: z.string().describe("User ID"),
    tenantId: z.string().describe("Xero Tenant ID"),
    invoiceId: z.string().describe("Invoice ID"),
    body: z.string().describe("Note content"),
    visibility: z
      .enum(["private", "shared"])
      .optional()
      .default("private")
      .describe("Note visibility"),
  }),
  execute: async ({ userId, tenantId, invoiceId, body, visibility }) => {
    const note: ArNoteInsert = {
      userId,
      tenantId,
      invoiceId,
      body,
      visibility: visibility || "private",
    };

    const created = await createNote(note);

    return {
      noteId: created.id,
      invoiceId: created.invoiceId,
      body: created.body,
      visibility: created.visibility,
      createdAt: created.createdAt.toISOString(),
    };
  },
});

/**
 * Sync invoices and contacts from Xero
 */
export const syncXeroTool = tool({
  description: "Synchronise invoices and contacts from Xero",
  inputSchema: z.object({
    userId: z.string().describe("User ID"),
    tenantId: z.string().describe("Xero Tenant ID"),
    since: z
      .string()
      .datetime()
      .optional()
      .describe("Sync data modified since this date"),
  }),
  execute: async ({ userId, tenantId, since }) => {
    const xero = await getXeroProvider(userId);

    // Sync contacts first
    const xeroContacts = await xero.listContacts({ isCustomer: true });
    const contacts = await upsertContacts(
      userId,
      tenantId,
      xeroContacts.map((c) => ({
        name: c.name,
        email: c.emailAddress,
        phone: c.phones?.[0]?.phoneNumber,
        externalRef: c.contactID,
      }))
    );

    // Sync invoices
    const xeroInvoices = await xero.listInvoices({
      status: "AUTHORISED",
      dateFrom: since,
    });

    // Map contact IDs
    const contactMap = new Map(contacts.map((c) => [c.externalRef, c.id]));

    const invoices = await upsertInvoices(
      userId,
      tenantId,
      xeroInvoices.map((inv) => {
        const contactId = contactMap.get(inv.contact.contactID);
        if (!contactId) {
          throw new Error(`Contact not found for invoice ${inv.invoiceNumber}`);
        }

        return {
          contactId,
          number: inv.invoiceNumber,
          issueDate: new Date(inv.dateString),
          dueDate: new Date(inv.dueDateString),
          currency: inv.currencyCode,
          subtotal: inv.subTotal.toFixed(2),
          tax: inv.totalTax.toFixed(2),
          total: inv.total.toFixed(2),
          amountPaid: inv.amountPaid.toFixed(2),
          status: mapXeroStatus(inv.status, inv.amountDue > 0),
          externalRef: inv.invoiceID,
        };
      })
    );

    return {
      contactsSynced: contacts.length,
      invoicesSynced: invoices.length,
    };
  },
});

// Helper functions

export function generateEmailContent(
  invoice: Awaited<ReturnType<typeof getInvoiceWithContact>>,
  tone: "polite" | "firm" | "final"
): { subject: string; body: string } {
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const displayDate = formatDisplayDate(invoice.dueDate);
  const amountDue = (
    Number.parseFloat(invoice.total) - Number.parseFloat(invoice.amountPaid)
  ).toFixed(2);

  const subjects = {
    polite: `Friendly Reminder: Invoice ${invoice.number} Due`,
    firm: `Payment Overdue: Invoice ${invoice.number}`,
    final: `Final Notice: Invoice ${invoice.number} - Immediate Action Required`,
  };

  const greetings = {
    polite: `Dear ${invoice.contact.name},`,
    firm: `Dear ${invoice.contact.name},`,
    final: `URGENT: ${invoice.contact.name}`,
  };

  const openings = {
    polite: `We hope this message finds you well. This is a friendly reminder that invoice ${invoice.number} was due on ${displayDate}.`,
    firm: `This is to notify you that invoice ${invoice.number}, due on ${displayDate}, remains unpaid and is now ${invoice.daysOverdue} days overdue.`,
    final: `This is a FINAL NOTICE regarding invoice ${invoice.number}, which is now ${invoice.daysOverdue} days overdue. Immediate payment is required to avoid further action.`,
  };

  const closings = {
    polite: `If you have already made this payment, please disregard this message. If you have any questions or need to discuss payment arrangements, please don't hesitate to contact us.\n\nThank you for your attention to this matter.\n\nKind regards,`,
    firm: "Please arrange payment immediately. If payment has already been made, please provide proof of payment. Contact us urgently if you need to discuss payment arrangements.\n\nRegards,",
    final:
      "If payment is not received within 7 days, we will be forced to escalate this matter, which may include:\n- Suspension of services\n- Referral to a debt collection agency\n- Legal action\n\nPlease contact us immediately to resolve this matter.\n\nUrgent attention required,",
  };

  const body = `${greetings[tone]}

${openings[tone]}

Invoice Details:
• Invoice Number: ${invoice.number}
• Due Date: ${displayDate}
• Amount Due: $${amountDue} ${invoice.currency}
• Days Overdue: ${invoice.daysOverdue}

${closings[tone]}`;

  return {
    subject: subjects[tone],
    body,
  };
}

function generateSmsContent(
  invoice: Awaited<ReturnType<typeof getInvoiceWithContact>>,
  tone: "polite" | "firm" | "final"
): string {
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const amountDue = (
    Number.parseFloat(invoice.total) - Number.parseFloat(invoice.amountPaid)
  ).toFixed(2);

  const messages = {
    polite: `Hi ${invoice.contact.name}, friendly reminder that invoice ${invoice.number} ($${amountDue}) was due ${invoice.daysOverdue} days ago. Please arrange payment when convenient. Thanks!`,
    firm: `${invoice.contact.name}: Invoice ${invoice.number} ($${amountDue}) is ${invoice.daysOverdue} days overdue. Please pay immediately or contact us to discuss.`,
    final: `URGENT - ${invoice.contact.name}: FINAL NOTICE for invoice ${invoice.number} ($${amountDue}), ${invoice.daysOverdue} days overdue. Pay within 7 days to avoid escalation. Contact us NOW.`,
  };

  return messages[tone];
}

function mapXeroStatus(xeroStatus: string, hasAmountDue: boolean): string {
  if (xeroStatus === "PAID") {
    return "paid";
  }
  if (xeroStatus === "VOIDED") {
    return "voided";
  }
  if (xeroStatus === "DRAFT") {
    return "draft";
  }
  if (xeroStatus === "AUTHORISED" && hasAmountDue) {
    return "awaiting_payment";
  }
  return "awaiting_payment";
}

/**
 * Build call script artefact for phone conversation
 */
export const buildCallScriptTool = tool({
  description:
    "Generate a call script for a phone conversation about overdue invoices. Includes talking points, responses to common objections, and payment options.",
  inputSchema: z.object({
    userId: z.string().describe("User ID"),
    tenantId: z.string().describe("Xero Tenant ID"),
    contactId: z.string().describe("Customer/Contact ID"),
    tone: z
      .enum(["polite", "firm", "final"])
      .describe("Tone of the call script"),
    includePaymentPlan: z
      .boolean()
      .optional()
      .default(false)
      .describe("Include payment plan options in script"),
  }),
  execute: async ({
    userId,
    tenantId,
    contactId,
    tone,
    includePaymentPlan,
  }) => {
    // Get all invoices for this contact
    const invoices = await listInvoicesDue({
      userId,
      tenantId,
      asOf: new Date(),
      minDaysOverdue: 0,
      customerId: contactId,
    });

    if (invoices.invoices.length === 0) {
      throw new Error("No invoices found for this contact");
    }

    const contact = invoices.invoices[0].contact;
    const totalDue = invoices.invoices.reduce(
      (sum, inv) =>
        sum +
        (Number.parseFloat(inv.total) - Number.parseFloat(inv.amountPaid)),
      0
    );

    const oldestInvoice = invoices.invoices.sort(
      (a, b) => b.daysOverdue - a.daysOverdue
    )[0];

    const script = generateCallScript(
      contact,
      invoices.invoices,
      totalDue,
      oldestInvoice.daysOverdue,
      tone as "polite" | "firm" | "final",
      includePaymentPlan
    );

    return script;
  },
});

/**
 * Save note to Xero Contact (via API if connected, local DB otherwise)
 */
export const saveNoteToXeroTool = tool({
  description:
    "Save a note to a Xero Contact. If Xero is connected, saves to both Xero and local DB. Otherwise saves to local DB only.",
  inputSchema: z.object({
    userId: z.string().describe("User ID"),
    tenantId: z.string().describe("Xero Tenant ID"),
    contactId: z.string().describe("Contact ID (local database ID)"),
    note: z.string().describe("Note content"),
  }),
  execute: async ({ userId, tenantId, contactId, note: noteContent }) => {
    // Get contact to find associated invoices
    const invoices = await listInvoicesDue({
      userId,
      tenantId,
      asOf: new Date(),
      minDaysOverdue: 0,
      customerId: contactId,
    });

    if (invoices.invoices.length === 0) {
      throw new Error("No invoices found for this contact");
    }

    // Save note to first invoice
    const note: ArNoteInsert = {
      userId,
      tenantId,
      invoiceId: invoices.invoices[0].id,
      body: noteContent,
      visibility: "shared",
      metadata: {
        isContactNote: true,
        contactId,
        createdAt: new Date().toISOString(),
      },
    };

    const created = await createNote(note);

    return {
      success: true,
      noteId: created.id,
      savedToXero: false,
      message:
        "Note saved to local database. Xero contact notes sync is not yet implemented.",
    };
  },
});
