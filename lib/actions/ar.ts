"use server";

import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/queries";
import { arContact, arCustomerHistory, arInvoice } from "@/lib/db/schema/ar";

export interface AgeingReportItem {
  contactId: string;
  customerName: string;
  email: string | null;
  totalOutstanding: number;
  ageingCurrent: number;
  ageing1_30: number;
  ageing31_60: number;
  ageing61_90: number;
  ageing90Plus: number;
  riskScore: number;
  lastPaymentDate: Date | null;
  creditTermsDays: number;
  lastUpdated: Date;
}

export async function getAgeingReportData(): Promise<AgeingReportItem[]> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Fetch contacts with their history
  const results = await db
    .select({
      contact: arContact,
      history: arCustomerHistory,
    })
    .from(arContact)
    .innerJoin(
      arCustomerHistory,
      eq(arContact.id, arCustomerHistory.customerId)
    )
    .where(eq(arContact.userId, userId));

  // We need to calculate the breakdown of outstanding amount by bucket.
  // The history table has aggregated stats but not the breakdown by bucket amount (only % 90+).
  // To get exact amounts per bucket, we should query invoices or pre-calculate this in history.
  // For now, let's query invoices for each contact or do a join.
  // A join with aggregation would be better for performance.

  // Let's do a separate query to get aggregated invoice amounts by bucket for all contacts of this user.
  const invoices = await db
    .select({
      contactId: arInvoice.contactId,
      amountOutstanding: arInvoice.amountOutstanding,
      ageingBucket: arInvoice.ageingBucket,
    })
    .from(arInvoice)
    .where(eq(arInvoice.userId, userId));

  const bucketMap = new Map<string, Record<string, number>>();

  for (const inv of invoices) {
    if (!bucketMap.has(inv.contactId)) {
      bucketMap.set(inv.contactId, {
        Current: 0,
        "1-30": 0,
        "31-60": 0,
        "61-90": 0,
        "90+": 0,
      });
    }
    const buckets = bucketMap.get(inv.contactId)!;
    const amount = Number(inv.amountOutstanding);
    if (inv.ageingBucket && amount > 0) {
      buckets[inv.ageingBucket as keyof typeof buckets] =
        (buckets[inv.ageingBucket as keyof typeof buckets] || 0) + amount;
    }
  }

  return results.map(({ contact, history }) => {
    const buckets = bucketMap.get(contact.id) || {
      Current: 0,
      "1-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
    };

    return {
      contactId: contact.id,
      customerName: contact.name,
      email: contact.email,
      totalOutstanding: Number(history.totalOutstanding),
      ageingCurrent: buckets["Current"],
      ageing1_30: buckets["1-30"],
      ageing31_60: buckets["31-60"],
      ageing61_90: buckets["61-90"],
      ageing90Plus: buckets["90+"],
      riskScore: history.riskScore || 0,
      lastPaymentDate: history.lastPaymentDate,
      creditTermsDays: history.creditTermsDays || 0,
      lastUpdated: history.computedAt,
    };
  });
}

export async function getCustomerInvoiceDetails(contactId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const invoices = await db
    .select()
    .from(arInvoice)
    .where(eq(arInvoice.contactId, contactId))
    .orderBy(desc(arInvoice.dueDate));

  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.number,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    amount: Number(inv.total),
    amountOutstanding: Number(inv.amountOutstanding),
    status: inv.status,
    ageingBucket: inv.ageingBucket,
  }));
}
