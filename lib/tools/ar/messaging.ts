/**
 * AR messaging and comms tools for Mastra agent
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  createCommsArtefact,
  createNote,
  createReminder,
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
  ArReminderInsert,
} from "@/lib/db/schema/ar";
import { asOfOrToday, formatDisplayDate } from "@/lib/util/dates";
import { getXeroProvider } from "./xero";

/**
 * Get invoices that are due or overdue
 */
export const getInvoicesDueTool = createTool({
  id: "getInvoicesDue",
  description:
    "Get all invoices that are due or overdue, optionally filtered by minimum days overdue and customer ID",
  inputSchema: z.object({
    userId: z.string().describe("User ID"),
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
  outputSchema: z.object({
    invoices: z.array(
      z.object({
        id: z.string(),
        number: z.string(),
        issueDate: z.string(),
        dueDate: z.string(),
        total: z.string(),
        amountPaid: z.string(),
        amountDue: z.string(),
        status: z.string(),
        daysOverdue: z.number(),
        contact: z.object({
          id: z.string(),
          name: z.string(),
          email: z.string().optional(),
          phone: z.string().optional(),
        }),
      })
    ),
    asOf: z.string(),
  }),
  execute: async ({ context: inputData }) => {
    const asOfDate = asOfOrToday(inputData.asOf);
    const result = await listInvoicesDue({
      userId: inputData.userId,
      asOf: asOfDate,
      minDaysOverdue: inputData.minDaysOverdue,
      customerId: inputData.customerId,
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
export const predictLateRiskTool = createTool({
  id: "predictLateRisk",
  description:
    "Predict the probability of late payment for an invoice based on days overdue and history",
  inputSchema: z.object({
    invoiceId: z.string().describe("Invoice ID"),
  }),
  outputSchema: z.object({
    invoiceId: z.string(),
    probability: z.number().min(0).max(1).describe("Risk probability (0-1)"),
    factors: z.array(z.string()).describe("Contributing risk factors"),
  }),
  execute: async ({ context: inputData }) => {
    const invoice = await getInvoiceWithContact(inputData.invoiceId);

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
export const buildEmailReminderTool = createTool({
  id: "buildEmailReminder",
  description:
    "Generate a copy-ready email reminder for an overdue invoice. Does NOT send the email - only creates an artefact for user to copy-paste.",
  inputSchema: z.object({
    userId: z.string().describe("User ID"),
    invoiceId: z.string().describe("Invoice ID"),
    templateId: z.string().describe("Template ID"),
    tone: z.enum(["polite", "firm", "final"]).describe("Tone of the reminder"),
  }),
  outputSchema: z.object({
    invoiceId: z.string(),
    subject: z.string(),
    body: z.string(),
    tone: z.string(),
    artefactId: z.string(),
    preview: z.string().describe("First 100 chars of body"),
  }),
  execute: async ({ context: inputData }) => {
    const invoice = await getInvoiceWithContact(inputData.invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const { subject, body } = generateEmailContent(
      invoice,
      inputData.tone as "polite" | "firm" | "final"
    );

    const artefact: ArCommsArtefactInsert = {
      userId: inputData.userId,
      invoiceId: inputData.invoiceId,
      channel: "email",
      subject,
      body,
      tone: inputData.tone,
      metadata: {
        templateId: inputData.templateId,
        generatedAt: new Date().toISOString(),
      },
    };

    const created = await createCommsArtefact(artefact);

    return {
      invoiceId: invoice.id,
      subject,
      body,
      tone: inputData.tone,
      artefactId: created.id,
      preview: body.slice(0, 100),
    };
  },
});

/**
 * Build SMS reminder artefact (does NOT send)
 */
export const buildSmsReminderTool = createTool({
  id: "buildSmsReminder",
  description:
    "Generate a copy-ready SMS reminder for an overdue invoice. Does NOT send the SMS - only creates an artefact for user to copy-paste.",
  inputSchema: z.object({
    userId: z.string().describe("User ID"),
    invoiceId: z.string().describe("Invoice ID"),
    templateId: z.string().describe("Template ID"),
    tone: z.enum(["polite", "firm", "final"]).describe("Tone of the reminder"),
  }),
  outputSchema: z.object({
    invoiceId: z.string(),
    text: z.string(),
    tone: z.string(),
    artefactId: z.string(),
    preview: z.string().describe("First 50 chars"),
  }),
  execute: async ({ context: inputData }) => {
    const invoice = await getInvoiceWithContact(inputData.invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const text = generateSmsContent(
      invoice,
      inputData.tone as "polite" | "firm" | "final"
    );

    const artefact: ArCommsArtefactInsert = {
      userId: inputData.userId,
      invoiceId: inputData.invoiceId,
      channel: "sms",
      subject: null,
      body: text,
      tone: inputData.tone,
      metadata: {
        templateId: inputData.templateId,
        generatedAt: new Date().toISOString(),
      },
    };

    const created = await createCommsArtefact(artefact);

    return {
      invoiceId: invoice.id,
      text,
      tone: inputData.tone,
      artefactId: created.id,
      preview: text.slice(0, 50),
    };
  },
});

/**
 * Reconcile a payment against an invoice
 */
export const reconcilePaymentTool = createTool({
  id: "reconcilePayment",
  description:
    "Record a payment against an invoice and update its status automatically",
  inputSchema: z.object({
    invoiceId: z.string().describe("Invoice ID"),
    amount: z.number().positive().describe("Payment amount"),
    paidAt: z.string().datetime().describe("Payment date (ISO format)"),
    reference: z.string().optional().describe("Payment reference/note"),
  }),
  outputSchema: z.object({
    invoiceId: z.string(),
    newStatus: z.string(),
    paymentId: z.string(),
    amountPaid: z.string(),
    amountRemaining: z.string(),
  }),
  execute: async ({ context: inputData }) => {
    const payment: ArPaymentInsert = {
      invoiceId: inputData.invoiceId,
      amount: inputData.amount.toFixed(2),
      paidAt: new Date(inputData.paidAt),
      reference: inputData.reference,
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
export const postNoteTool = createTool({
  id: "postNote",
  description: "Add an internal note to an invoice for team visibility",
  inputSchema: z.object({
    userId: z.string().describe("User ID"),
    invoiceId: z.string().describe("Invoice ID"),
    body: z.string().describe("Note content"),
    visibility: z
      .enum(["private", "shared"])
      .optional()
      .default("private")
      .describe("Note visibility"),
  }),
  outputSchema: z.object({
    noteId: z.string(),
    invoiceId: z.string(),
    body: z.string(),
    visibility: z.string(),
    createdAt: z.string(),
  }),
  execute: async ({ context: inputData }) => {
    const note: ArNoteInsert = {
      userId: inputData.userId,
      invoiceId: inputData.invoiceId,
      body: inputData.body,
      visibility: inputData.visibility || "private",
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
export const syncXeroTool = createTool({
  id: "syncXero",
  description:
    "Synchronise invoices and contacts from Xero (or mock data if not configured)",
  inputSchema: z.object({
    userId: z.string().describe("User ID"),
    since: z
      .string()
      .datetime()
      .optional()
      .describe("Sync data modified since this date"),
  }),
  outputSchema: z.object({
    contactsSync: z.number(),
    invoicesSynced: z.number(),
    isUsingMock: z.boolean(),
  }),
  execute: async ({ context: inputData }) => {
    const xero = await getXeroProvider(inputData.userId);

    // Sync contacts first
    const xeroContacts = await xero.listContacts({ isCustomer: true });
    const contacts = await upsertContacts(
      inputData.userId,
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
      dateFrom: inputData.since,
    });

    // Map contact IDs
    const contactMap = new Map(contacts.map((c) => [c.externalRef, c.id]));

    const invoices = await upsertInvoices(
      inputData.userId,
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
      contactsSync: contacts.length,
      invoicesSynced: invoices.length,
      isUsingMock: xero.isUsingMock,
    };
  },
});

// Helper functions

function generateEmailContent(
  invoice: Awaited<ReturnType<typeof getInvoiceWithContact>>,
  tone: "polite" | "firm" | "final"
): { subject: string; body: string } {
  if (!invoice) throw new Error("Invoice not found");

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
  if (!invoice) throw new Error("Invoice not found");

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
  if (xeroStatus === "PAID") return "paid";
  if (xeroStatus === "VOIDED") return "voided";
  if (xeroStatus === "DRAFT") return "draft";
  if (xeroStatus === "AUTHORISED" && hasAmountDue) return "awaiting_payment";
  return "awaiting_payment";
}
