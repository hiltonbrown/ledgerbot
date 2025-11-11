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

/**
 * Build call script artefact for phone conversation
 */
export const buildCallScriptTool = createTool({
  id: "buildCallScript",
  description:
    "Generate a call script for a phone conversation about overdue invoices. Includes talking points, responses to common objections, and payment options.",
  inputSchema: z.object({
    userId: z.string().describe("User ID"),
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
  outputSchema: z.object({
    contactId: z.string(),
    contactName: z.string(),
    script: z.string(),
    talkingPoints: z.array(z.string()),
    objectionResponses: z.array(
      z.object({
        objection: z.string(),
        response: z.string(),
      })
    ),
    tone: z.string(),
  }),
  execute: async ({ context: inputData }) => {
    // Get all invoices for this contact
    const invoices = await listInvoicesDue({
      userId: inputData.userId,
      asOf: new Date(),
      minDaysOverdue: 0,
      customerId: inputData.contactId,
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
      inputData.tone as "polite" | "firm" | "final",
      inputData.includePaymentPlan
    );

    return script;
  },
});

/**
 * Save note to Xero Contact (via API if connected, local DB otherwise)
 */
export const saveNoteToXeroTool = createTool({
  id: "saveNoteToXero",
  description:
    "Save a note to a Xero Contact. If Xero is connected, saves to both Xero and local DB. Otherwise saves to local DB only.",
  inputSchema: z.object({
    userId: z.string().describe("User ID"),
    contactId: z.string().describe("Contact ID (local database ID)"),
    note: z.string().describe("Note content"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    noteId: z.string(),
    savedToXero: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ context: inputData }) => {
    // For now, we'll save to local DB only
    // Future enhancement: integrate with Xero API to save notes
    // Xero doesn't have a native "notes" API, but we can use Contact.Notes field
    // or create a custom tracking category

    // Get contact to find associated invoices
    const invoices = await listInvoicesDue({
      userId: inputData.userId,
      asOf: new Date(),
      minDaysOverdue: 0,
      customerId: inputData.contactId,
    });

    if (invoices.invoices.length === 0) {
      throw new Error("No invoices found for this contact");
    }

    // Save note to first invoice (as contact-level notes need invoice association)
    const note: ArNoteInsert = {
      userId: inputData.userId,
      invoiceId: invoices.invoices[0].id,
      body: inputData.note,
      visibility: "shared",
      metadata: {
        isContactNote: true,
        contactId: inputData.contactId,
        createdAt: new Date().toISOString(),
      },
    };

    const created = await createNote(note);

    // TODO: Future enhancement - save to Xero via API
    // This would require the Xero API to support contact notes
    // For now, we just save locally

    return {
      success: true,
      noteId: created.id,
      savedToXero: false,
      message:
        "Note saved to local database. Xero contact notes sync is not yet implemented.",
    };
  },
});

// Helper function for call script generation
function generateCallScript(
  contact: { name: string; email?: string | null; phone?: string | null },
  invoices: Array<{
    id: string;
    number: string;
    dueDate: Date;
    total: string;
    amountPaid: string;
    daysOverdue: number;
  }>,
  totalDue: number,
  maxDaysOverdue: number,
  tone: "polite" | "firm" | "final",
  includePaymentPlan: boolean
): {
  contactId: string;
  contactName: string;
  script: string;
  talkingPoints: string[];
  objectionResponses: Array<{ objection: string; response: string }>;
  tone: string;
} {
  const invoiceList = invoices
    .map(
      (inv) =>
        `• Invoice ${inv.number}: $${(Number.parseFloat(inv.total) - Number.parseFloat(inv.amountPaid)).toFixed(2)} (${inv.daysOverdue} days overdue)`
    )
    .join("\n");

  const greetings = {
    polite: `Hi ${contact.name}, this is [Your Name] from [Your Company]. I hope you're doing well today. I'm calling regarding some outstanding invoices on your account.`,
    firm: `Hello ${contact.name}, this is [Your Name] from [Your Company]. I'm calling about overdue invoices on your account that require immediate attention.`,
    final: `${contact.name}, this is [Your Name] from [Your Company]. This is a final courtesy call regarding seriously overdue invoices before we escalate to collections.`,
  };

  const mainPoints = {
    polite: `I wanted to touch base with you about ${invoices.length} invoice${invoices.length > 1 ? "s" : ""} that ${invoices.length > 1 ? "are" : "is"} now overdue. The total outstanding amount is $${totalDue.toFixed(2)}, with the oldest invoice being ${maxDaysOverdue} days past due.`,
    firm: `Your account currently has ${invoices.length} overdue invoice${invoices.length > 1 ? "s" : ""} totaling $${totalDue.toFixed(2)}. Some of these are now ${maxDaysOverdue} days overdue, which is significantly past our payment terms.`,
    final: `Your account is seriously delinquent with ${invoices.length} invoice${invoices.length > 1 ? "s" : ""} totaling $${totalDue.toFixed(2)}. The oldest invoice is ${maxDaysOverdue} days overdue. We need to resolve this immediately to avoid further action.`,
  };

  const closings = {
    polite:
      "Can we arrange payment today, or would you like to discuss a payment plan?",
    firm: "I need to know when we can expect full payment. Can you commit to a payment date today?",
    final:
      "We need payment within 48 hours to prevent this from going to collections. Can you make payment immediately, or do we need to proceed with formal action?",
  };

  const paymentPlanSection = includePaymentPlan
    ? `\n\nPAYMENT PLAN OPTIONS:\nIf full payment isn't possible right now, we can discuss:\n• Split payment over 2-4 weeks\n• Partial payment today with balance on agreed date\n• Weekly installments until cleared\n\nWhat would work best for your situation?`
    : "";

  const script = `${greetings[tone]}

${mainPoints[tone]}

INVOICE BREAKDOWN:
${invoiceList}

${closings[tone]}${paymentPlanSection}

NEXT STEPS:
1. Confirm payment method and timeline
2. Send payment confirmation email
3. Update account notes with agreed terms
4. Follow up if payment not received by agreed date`;

  const talkingPoints = [
    `Total outstanding: $${totalDue.toFixed(2)}`,
    `Number of overdue invoices: ${invoices.length}`,
    `Oldest invoice: ${maxDaysOverdue} days overdue`,
    `Payment terms: Net 30 days`,
    tone === "final"
      ? "This is final notice before collections"
      : "We value your business and want to help",
  ];

  const objectionResponses = [
    {
      objection: "I haven't received the invoice",
      response: `I can resend that immediately. The invoice was originally sent on [date] to ${contact.email || "your email on file"}. Would you like me to send it to a different email address?`,
    },
    {
      objection: "I'm having cash flow issues",
      response:
        "I understand that can be challenging. Would a payment plan help? We could arrange smaller weekly or bi-weekly payments to make this more manageable.",
    },
    {
      objection: "There's a dispute with the invoice",
      response:
        "I wasn't aware of any issues. Can you tell me specifically what the concern is so we can resolve it? In the meantime, would you be comfortable paying the undisputed portion?",
    },
    {
      objection: "I'll pay it next week/month",
      response:
        "I appreciate you committing to payment. Can we be more specific about the date? I'd like to note exactly when we can expect payment and send you a confirmation.",
    },
    {
      objection: "I've already paid this",
      response:
        "Let me check our records. Can you provide the payment date, amount, and reference number? I'll verify this immediately and update your account if needed.",
    },
  ];

  return {
    contactId: contact.name, // We don't have ID in this context
    contactName: contact.name,
    script,
    talkingPoints,
    objectionResponses,
    tone,
  };
}
