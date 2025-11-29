import type { FollowUpContextData, FollowUpTone } from "@/lib/db/schema/ar";

export type { FollowUpTone, FollowUpContextData };

export type InvoiceDetail = {
  number: string;
  issueDate: string;
  dueDate: string;
  total: string;
  amountDue: string;
  daysOverdue: number;
  currency: string;
};

export type ContactDetail = {
  id?: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export type SenderDetail = {
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
};

export type FollowUpParams = {
  customer: ContactDetail;
  sender?: SenderDetail;
  totalOutstanding: number;
  riskScore: number;
  invoices?: InvoiceDetail[];
  followUpType?: FollowUpTone;
};

export type SuggestedAction = {
  type: "email" | "call" | "sms";
  tone: FollowUpTone;
  description: string;
};

export function generateFollowUpContext({
  customer,
  sender,
  totalOutstanding,
  riskScore,
  invoices,
  followUpType,
}: FollowUpParams): FollowUpContextData {
  const tone: FollowUpTone =
    followUpType || determineToneFromRiskScore(riskScore);

  const amountStr = totalOutstanding.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });

  let context = `Task: Draft a ${tone} follow-up email to ${customer.name} regarding their outstanding balance of ${amountStr}.`;

  // Tone instructions
  if (tone === "polite") {
    context += `\n\nContext: The customer has a low risk score (${riskScore.toFixed(2)}). Keep it friendly and helpful. Assume it might be an oversight.`;
  } else if (tone === "firm") {
    context += `\n\nContext: The customer has a medium risk score (${riskScore.toFixed(2)}). Be professional but firm. Request payment within 7 days.`;
  } else {
    context += `\n\nContext: The customer has a high risk score (${riskScore.toFixed(2)}). Use strong language requesting immediate settlement to avoid further action.`;
  }

  // Style instructions
  context += "\n\n## Style Guidelines:";
  context +=
    "\n- Do NOT use cliché opening lines like 'I hope this email finds you well'. Start directly with the purpose of the email.";
  context += "\n- Keep the tone professional and concise.";
  context +=
    "\n- Use the provided sender details for the signature. Do NOT use placeholders.";

  // Add customer contact details
  context += "\n\n## Customer Contact Details:";
  context += `\n- Name: ${customer.name}`;
  if (customer.email) {
    context += `\n- Email: ${customer.email}`;
  }
  if (customer.phone) {
    context += `\n- Phone: ${customer.phone}`;
  }

  // Add sender details if provided
  if (sender) {
    context += "\n\n## Sender Details (Use in Signature):";
    context += `\n- Name: ${sender.name}`;
    if (sender.companyName) {
      context += `\n- Company: ${sender.companyName}`;
    }
    if (sender.email) {
      context += `\n- Email: ${sender.email}`;
    }
    if (sender.phone) {
      context += `\n- Phone: ${sender.phone}`;
    }
  }

  // Add invoice details if provided
  if (invoices && invoices.length > 0) {
    context += "\n\n## Outstanding Invoice Details:";
    const unpaidInvoices = invoices.filter(
      (inv) => Number.parseFloat(inv.amountDue) > 0
    );

    for (const inv of unpaidInvoices) {
      const issueDate = new Date(inv.issueDate).toLocaleDateString("en-AU");
      const dueDate = new Date(inv.dueDate).toLocaleDateString("en-AU");
      const amount = Number.parseFloat(inv.amountDue).toLocaleString("en-AU", {
        style: "currency",
        currency: inv.currency || "AUD",
      });

      context += `\n- Invoice ${inv.number}: ${amount} (Issued: ${issueDate}, Due: ${dueDate}, ${inv.daysOverdue} days overdue)`;
    }

    context +=
      "\n\n**Important**: Include the specific invoice numbers, dates, and amounts from the details above in your follow-up communication. You may also offer to create a customer statement as a text artifact if helpful.";
  } else {
    context +=
      "\n\n**Note**: Invoice details were not provided. You may need to use Xero tools to fetch invoice information if specific details are required.";
  }

  return {
    prompt: context,
    metadata: {
      customerId: customer.id || "",
      customerName: customer.name,
      totalOutstanding,
      riskScore,
      invoiceCount: invoices?.length || 0,
      followUpType: tone,
    },
  };
}

function determineToneFromRiskScore(riskScore: number): FollowUpTone {
  if (riskScore > 0.7) {
    return "final";
  }
  if (riskScore > 0.3) {
    return "firm";
  }
  return "polite";
}

export function generateSuggestedActions(
  customer: ContactDetail,
  riskScore: number
): SuggestedAction[] {
  const tone = determineToneFromRiskScore(riskScore);
  const actions: SuggestedAction[] = [];

  // Email actions
  if (customer.email) {
    actions.push({
      type: "email",
      tone,
      description: `Send ${tone} follow-up email`,
    });
  }

  // SMS actions
  if (customer.phone) {
    actions.push({
      type: "sms",
      tone,
      description: `Send ${tone} SMS reminder`,
    });
  }

  // Call actions (always available)
  actions.push({
    type: "call",
    tone,
    description: `Prepare ${tone} call script`,
  });

  return actions;
}

export function generateFollowUpRequest({
  customer,
  totalOutstanding,
}: Pick<FollowUpParams, "customer" | "totalOutstanding">): string {
  const amountStr = totalOutstanding.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });
  return `Draft a follow-up email to ${customer.name} regarding their outstanding balance of ${amountStr}.`;
}

// Keep the original function for backward compatibility if needed, or remove it.
// For now, I'll remove it as we are updating the consumer.
