import type { ReviewContextData } from "@/lib/db/schema/ap";

export type { ReviewContextData };

export type ApBillDetail = {
  number: string;
  issueDate: string;
  dueDate: string;
  total: string;
  amountPaid: string;
  amountDue: string;
  status: string;
  currency: string;
  riskLevel: string;
};

export type ApCreditorDetail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  riskLevel: string;
};

export type BankChangeDetail = {
  detectedAt: string;
  oldBsb: string | null;
  oldAccountNumber: string | null;
  newBsb: string | null;
  newAccountNumber: string | null;
  isVerified: boolean;
};

export type ReviewParams = {
  creditor: ApCreditorDetail;
  totalOutstanding: number;
  riskAnalysis: string;
  bills: ApBillDetail[];
  bankChanges: BankChangeDetail[];
};

export function generateInvoiceReviewContext({
  creditor,
  totalOutstanding,
  riskAnalysis,
  bills,
  bankChanges,
}: ReviewParams): ReviewContextData {
  const amountStr = totalOutstanding.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });

  let context = `Task: Review outstanding invoices for creditor ${creditor.name}.`;
  context += `\nTotal Outstanding: ${amountStr}`;
  context += `\nCreditor Risk Level: ${creditor.riskLevel}`;

  context += "\n\n## Creditor Details:";
  context += `\n- Name: ${creditor.name}`;
  if (creditor.email) context += `\n- Email: ${creditor.email}`;
  if (creditor.phone) context += `\n- Phone: ${creditor.phone}`;

  context += "\n\n## AI Risk Analysis:";
  context += `\n${riskAnalysis}`;

  if (bankChanges.length > 0) {
    context += "\n\n## Recent Bank Account Changes:";
    for (const change of bankChanges) {
      context += `\n- Date: ${change.detectedAt}`;
      context += `\n  Old: ${change.oldBsb}-${change.oldAccountNumber}`;
      context += `\n  New: ${change.newBsb}-${change.newAccountNumber}`;
      context += `\n  Verified: ${change.isVerified ? "Yes" : "NO - WARNING"}`;
    }
  }

  if (bills.length > 0) {
    context += "\n\n## Outstanding Bills:";
    for (const bill of bills) {
      context += `\n- Bill #${bill.number}: ${bill.amountDue} due ${bill.dueDate} (Total: ${bill.total}, Paid: ${bill.amountPaid})`;
      context += `\n  Status: ${bill.status}, Risk: ${bill.riskLevel}`;
    }
  }

  context += "\n\n## Instructions:";
  context += "\n- Assist the user in reviewing these bills.";
  context += "\n- Highlight any high-risk bills or unverified bank changes.";
  context +=
    "\n- If the user asks to pay, guide them on which bills to prioritize based on due dates and risk.";
  context += "\n- You can draft queries to the supplier if there are issues.";

  return {
    prompt: context,
    metadata: {
      creditorId: creditor.id,
      creditorName: creditor.name,
      totalOutstanding,
      riskLevel: creditor.riskLevel,
      billCount: bills.length,
    },
  };
}
