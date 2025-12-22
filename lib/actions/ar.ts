"use server";

import { auth } from "@clerk/nextjs/server";
import { differenceInDays } from "date-fns";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/queries";
import {
  arContact,
  arCreditNote,
  arCustomerHistory,
  arInvoice,
  arOverpayment,
  arPrepayment,
} from "@/lib/db/schema/ar";

export type AgeingReportItem = {
  contactId: string;
  customerName: string;
  email: string | null;
  totalOutstanding: number;
  ageingCurrent: number;
  ageing1_30: number;
  ageing31_60: number;
  ageing61_90: number;
  ageing90Plus: number;
  unallocatedCreditNotes: number; // Informational only - not subtracted
  riskScore: number;
  lastPaymentDate: Date | null;
  creditTermsDays: number;
  lastUpdated: Date;
};

export async function getAgeingReportData(
  tenantId: string
): Promise<AgeingReportItem[]> {
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
    .where(and(eq(arContact.userId, userId), eq(arContact.tenantId, tenantId)));

  // Let's do a separate query to get aggregated invoice amounts by bucket for all contacts of this user and tenant.
  const invoices = await db
    .select({
      contactId: arInvoice.contactId,
      amountOutstanding: arInvoice.amountOutstanding,
      ageingBucket: arInvoice.ageingBucket,
    })
    .from(arInvoice)
    .where(and(eq(arInvoice.userId, userId), eq(arInvoice.tenantId, tenantId)));

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
    const buckets = bucketMap.get(inv.contactId);
    if (!buckets) {
      continue;
    }

    const amount = Number(inv.amountOutstanding);
    if (inv.ageingBucket && amount > 0) {
      buckets[inv.ageingBucket as keyof typeof buckets] =
        (buckets[inv.ageingBucket as keyof typeof buckets] || 0) + amount;
    }
  }

  // Fetch unallocated credit notes
  const creditNotes = await db
    .select({
      contactId: arCreditNote.contactId,
      amountRemaining: arCreditNote.amountRemaining,
    })
    .from(arCreditNote)
    .where(
      and(
        eq(arCreditNote.userId, userId),
        eq(arCreditNote.tenantId, tenantId),
        sql`${arCreditNote.amountRemaining} > 0`
      )
    );

  const creditNoteMap = new Map<string, number>();
  for (const cn of creditNotes) {
    const current = creditNoteMap.get(cn.contactId) || 0;
    creditNoteMap.set(cn.contactId, current + Number(cn.amountRemaining));
  }

  // Fetch unallocated Overpayments
  const overpayments = await db
    .select({
      contactId: arOverpayment.contactId,
      amountRemaining: arOverpayment.amountRemaining,
    })
    .from(arOverpayment)
    .where(
      and(
        eq(arOverpayment.userId, userId),
        eq(arOverpayment.tenantId, tenantId),
        sql`${arOverpayment.amountRemaining} > 0`
      )
    );

  const overpaymentMap = new Map<string, number>();
  for (const op of overpayments) {
    const current = overpaymentMap.get(op.contactId) || 0;
    overpaymentMap.set(op.contactId, current + Number(op.amountRemaining));
  }

  // Fetch unallocated Prepayments
  const prepayments = await db
    .select({
      contactId: arPrepayment.contactId,
      amountRemaining: arPrepayment.amountRemaining,
    })
    .from(arPrepayment)
    .where(
      and(
        eq(arPrepayment.userId, userId),
        eq(arPrepayment.tenantId, tenantId),
        sql`${arPrepayment.amountRemaining} > 0`
      )
    );

  const prepaymentMap = new Map<string, number>();
  for (const pp of prepayments) {
    const current = prepaymentMap.get(pp.contactId) || 0;
    prepaymentMap.set(pp.contactId, current + Number(pp.amountRemaining));
  }

  return results
    .map(({ contact, history }) => {
      const buckets = bucketMap.get(contact.id) || {
        Current: 0,
        "1-30": 0,
        "31-60": 0,
        "61-90": 0,
        "90+": 0,
      };
      const unallocatedCredit = creditNoteMap.get(contact.id) || 0;
      const unallocatedOverpayment = overpaymentMap.get(contact.id) || 0;
      const unallocatedPrepayment = prepaymentMap.get(contact.id) || 0;

      const totalUnallocated =
        unallocatedCredit + unallocatedOverpayment + unallocatedPrepayment;
      const totalOutstanding = Number(history.totalOutstanding);

      // Apply unallocated credits/payments to reduce the total and the Current bucket
      const netTotalOutstanding = totalOutstanding - totalUnallocated;
      const netCurrent = buckets.Current - totalUnallocated;

      return {
        contactId: contact.id,
        customerName: contact.name,
        email: contact.email,
        totalOutstanding: netTotalOutstanding,
        ageingCurrent: netCurrent,
        ageing1_30: buckets["1-30"],
        ageing31_60: buckets["31-60"],
        ageing61_90: buckets["61-90"],
        ageing90Plus: buckets["90+"],
        unallocatedCreditNotes: unallocatedCredit,
        riskScore: history.riskScore || 0,
        lastPaymentDate: history.lastPaymentDate,
        creditTermsDays: history.creditTermsDays || 0,
        lastUpdated: history.computedAt,
      };
    })
    .filter((item) => item.totalOutstanding !== 0);
}

export async function getCustomerInvoiceDetails(
  contactId: string,
  tenantId: string
) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify the contact belongs to the authenticated user and tenant
  const contact = await db.query.arContact.findFirst({
    where: (table) =>
      and(
        eq(table.id, contactId),
        eq(table.userId, userId),
        eq(table.tenantId, tenantId)
      ),
  });
  if (!contact) {
    throw new Error("Contact not found or unauthorized");
  }

  const invoices = await db
    .select()
    .from(arInvoice)
    .where(
      and(
        eq(arInvoice.contactId, contactId),
        eq(arInvoice.userId, userId),
        eq(arInvoice.tenantId, tenantId)
      )
    )
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

export type ARKPIs = {
  totalOutstanding: number;
  activeDebtors: number;
  daysReceivableOutstanding: number;
  overdueInvoices: number;
  overdueAmount: number;
  ageingSummary: Array<{
    bucket: string;
    count: number;
    total: number;
  }>;
};

export async function getARKPIs(tenantId: string): Promise<ARKPIs> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Get all invoices with outstanding amounts for user and tenant
  const invoices = await db
    .select()
    .from(arInvoice)
    .where(and(eq(arInvoice.userId, userId), eq(arInvoice.tenantId, tenantId)));

  // Calculate total outstanding
  const totalOutstanding = invoices.reduce(
    (sum, inv) => sum + Number(inv.amountOutstanding),
    0
  );

  // Count active debtors (contacts with outstanding invoices)
  const activeDebtorIds = new Set(
    invoices
      .filter((inv) => Number(inv.amountOutstanding) > 0)
      .map((inv) => inv.contactId)
  );
  const activeDebtors = activeDebtorIds.size;

  // Calculate overdue invoices and amounts
  const today = new Date();
  const overdueInvoices = invoices.filter(
    (inv) => Number(inv.amountOutstanding) > 0 && inv.dueDate < today
  );
  const overdueAmount = overdueInvoices.reduce(
    (sum, inv) => sum + Number(inv.amountOutstanding),
    0
  );

  // Calculate Days Receivable Outstanding (DRO)
  let daysReceivableOutstanding = 0;
  const outstandingInvoices = invoices.filter(
    (inv) => Number(inv.amountOutstanding) > 0
  );

  if (outstandingInvoices.length > 0) {
    const totalDays = outstandingInvoices.reduce((sum, inv) => {
      const daysOutstanding = differenceInDays(today, inv.issueDate);
      return sum + daysOutstanding;
    }, 0);
    daysReceivableOutstanding = Math.round(
      totalDays / outstandingInvoices.length
    );
  }

  // Calculate ageing summary
  const ageingSummary = [
    { bucket: "Current", count: 0, total: 0 },
    { bucket: "1-30", count: 0, total: 0 },
    { bucket: "31-60", count: 0, total: 0 },
    { bucket: "61-90", count: 0, total: 0 },
    { bucket: "90+", count: 0, total: 0 },
  ];

  for (const inv of outstandingInvoices) {
    const amount = Number(inv.amountOutstanding);
    const bucket = inv.ageingBucket;

    if (bucket) {
      const bucketIndex = ageingSummary.findIndex((b) => b.bucket === bucket);
      if (bucketIndex !== -1) {
        ageingSummary[bucketIndex].count++;
        ageingSummary[bucketIndex].total += amount;
      }
    }
  }

  return {
    totalOutstanding,
    activeDebtors,
    daysReceivableOutstanding,
    overdueInvoices: overdueInvoices.length,
    overdueAmount,
    ageingSummary,
  };
}

export type CustomerFollowUpData = {
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  totalOutstanding: number;
  riskScore: number;
  invoices: Array<{
    number: string;
    issueDate: string;
    dueDate: string;
    total: string;
    amountDue: string;
    daysOverdue: number;
    currency: string;
  }>;
};

export async function getCustomerFollowUpData(
  contactId: string,
  userId: string,
  tenantId: string
): Promise<CustomerFollowUpData> {
  // Optimized query to get all AR data in one go
  const [contact, invoices, history] = await Promise.all([
    db.query.arContact.findFirst({
      where: and(
        eq(arContact.id, contactId),
        eq(arContact.userId, userId),
        eq(arContact.tenantId, tenantId)
      ),
    }),
    db
      .select()
      .from(arInvoice)
      .where(
        and(
          eq(arInvoice.contactId, contactId),
          eq(arInvoice.userId, userId),
          eq(arInvoice.tenantId, tenantId)
        )
      )
      .orderBy(desc(arInvoice.dueDate)),
    db.query.arCustomerHistory.findFirst({
      where: and(
        eq(arCustomerHistory.customerId, contactId),
        eq(arCustomerHistory.userId, userId),
        eq(arCustomerHistory.tenantId, tenantId)
      ),
    }),
  ]);

  if (!contact) {
    throw new Error("Contact not found");
  }

  const outstandingInvoices = invoices.filter(
    (inv) => Number(inv.amountOutstanding) > 0
  );

  return {
    contact: {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
    },
    totalOutstanding: Number(history?.totalOutstanding || 0),
    riskScore: history?.riskScore || 0,
    invoices: outstandingInvoices.map((inv) => ({
      number: inv.number,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      total: inv.total,
      amountDue: inv.amountOutstanding,
      daysOverdue: Math.max(
        0,
        Math.floor((Date.now() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      ),
      currency: inv.currency || "AUD",
    })),
  };
}
