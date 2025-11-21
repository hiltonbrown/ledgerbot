import "server-only";

import { and, desc, eq, lte, sql, or } from "drizzle-orm";
import { ChatSDKError } from "@/lib/errors";
import { db } from "../queries";
import type {
  ApBill,
  ApBillInsert,
  ApBankChange,
  ApBankChangeInsert,
  ApCommsArtefact,
  ApCommsArtefactInsert,
  ApContact,
  ApContactInsert,
  ApNote,
  ApNoteInsert,
  ApPayment,
  ApPaymentInsert,
  ApPaymentSchedule,
  ApPaymentScheduleInsert,
  ApRiskAssessment,
  ApRiskAssessmentInsert,
} from "../schema/ap";
import {
  apBill,
  apBankChange,
  apCommsArtefact,
  apContact,
  apNote,
  apPayment,
  apPaymentSchedule,
  apRiskAssessment,
} from "../schema/ap";

export type BillWithContact = ApBill & {
  contact: ApContact;
  daysOverdue: number;
};

export type BillWithDetails = ApBill & {
  contact: ApContact;
  daysOverdue: number;
  payments: ApPayment[];
  riskAssessment?: ApRiskAssessment;
  bankChanges: ApBankChange[];
};

export type ContactWithStats = ApContact & {
  totalOutstanding: number;
  totalOverdue: number;
  billCount: number;
  oldestInvoiceDays: number;
};

export type ListBillsDueParams = {
  userId: string;
  asOf: Date;
  minDaysOverdue?: number;
  supplierId?: string;
  status?: string[];
};

export type ListBillsDueResult = {
  bills: BillWithContact[];
  asOf: string;
};

export type AgeingBucket = {
  bucket: string;
  count: number;
  total: number;
};

export type APKPIs = {
  totalOutstanding: number;
  activeCreditors: number;
  daysPayableOutstanding: number;
  overdueBills: number;
  overdueAmount: number;
  ageingSummary: AgeingBucket[];
};

/**
 * List bills that are due or overdue
 */
export async function listBillsDue({
  userId,
  asOf,
  minDaysOverdue = 0,
  supplierId,
  status,
}: ListBillsDueParams): Promise<ListBillsDueResult> {
  try {
    const conditions = [
      eq(apBill.userId, userId),
      lte(apBill.dueDate, asOf),
    ];

    // Filter by status if provided
    if (status && status.length > 0) {
      conditions.push(
        or(...status.map((s) => eq(apBill.status, s))) as typeof conditions[0]
      );
    } else {
      // Default: exclude paid and cancelled bills
      conditions.push(
        sql`${apBill.status} NOT IN ('paid', 'cancelled')`
      );
    }

    if (supplierId) {
      conditions.push(eq(apBill.contactId, supplierId));
    }

    const results = await db
      .select({
        bill: apBill,
        contact: apContact,
      })
      .from(apBill)
      .innerJoin(apContact, eq(apBill.contactId, apContact.id))
      .where(and(...conditions))
      .orderBy(desc(apBill.dueDate));

    const billsWithOverdue: BillWithContact[] = results
      .map((row) => {
        const daysOverdue = Math.max(
          0,
          Math.floor(
            (asOf.getTime() - new Date(row.bill.dueDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        return {
          ...row.bill,
          contact: row.contact,
          daysOverdue,
        };
      })
      .filter((bill) => bill.daysOverdue >= minDaysOverdue);

    return {
      bills: billsWithOverdue,
      asOf: asOf.toISOString(),
    };
  } catch (error) {
    console.error("[AP] List bills due error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to list bills due"
    );
  }
}

/**
 * Get a single bill with full details
 */
export async function getBillWithDetails(
  billId: string
): Promise<BillWithDetails | null> {
  try {
    const results = await db
      .select({
        bill: apBill,
        contact: apContact,
      })
      .from(apBill)
      .innerJoin(apContact, eq(apBill.contactId, apContact.id))
      .where(eq(apBill.id, billId))
      .limit(1);

    if (results.length === 0) return null;

    const row = results[0];
    const daysOverdue = Math.max(
      0,
      Math.floor(
        (new Date().getTime() - new Date(row.bill.dueDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    // Get payments for this bill
    const payments = await db
      .select()
      .from(apPayment)
      .where(eq(apPayment.billId, billId))
      .orderBy(desc(apPayment.paidAt));

    // Get risk assessment
    const riskResults = await db
      .select()
      .from(apRiskAssessment)
      .where(eq(apRiskAssessment.billId, billId))
      .orderBy(desc(apRiskAssessment.assessedAt))
      .limit(1);

    const riskAssessment = riskResults.length > 0 ? riskResults[0] : undefined;

    // Get bank changes for this supplier
    const bankChanges = await db
      .select()
      .from(apBankChange)
      .where(eq(apBankChange.contactId, row.contact.id))
      .orderBy(desc(apBankChange.detectedAt));

    return {
      ...row.bill,
      contact: row.contact,
      daysOverdue,
      payments,
      riskAssessment,
      bankChanges,
    };
  } catch (error) {
    console.error("[AP] Get bill with details error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get bill with details"
    );
  }
}

/**
 * Upsert contacts (insert or update by externalRef)
 */
export async function upsertContacts(
  userId: string,
  contacts: Omit<ApContactInsert, "userId">[]
): Promise<ApContact[]> {
  try {
    const results: ApContact[] = [];

    for (const contact of contacts) {
      const existing = contact.externalRef
        ? await db
            .select()
            .from(apContact)
            .where(
              and(
                eq(apContact.userId, userId),
                eq(apContact.externalRef, contact.externalRef)
              )
            )
            .limit(1)
        : [];

      if (existing.length > 0) {
        const [updated] = await db
          .update(apContact)
          .set({
            ...contact,
            updatedAt: new Date(),
          })
          .where(eq(apContact.id, existing[0].id))
          .returning();
        results.push(updated);
      } else {
        const [inserted] = await db
          .insert(apContact)
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
    console.error("[AP] Upsert contacts error:", error);
    throw new ChatSDKError("bad_request:database", "Failed to upsert contacts");
  }
}

/**
 * Upsert bills (insert or update by externalRef)
 */
export async function upsertBills(
  userId: string,
  bills: Omit<ApBillInsert, "userId">[]
): Promise<ApBill[]> {
  try {
    if (bills.length === 0) {
      return [];
    }

    const billValues = bills.map((bill) => ({
      ...bill,
      userId,
      updatedAt: new Date(),
    }));

    const upsertedBills = await db
      .insert(apBill)
      .values(billValues)
      .onConflictDoUpdate({
        target: [apBill.externalRef, apBill.userId],
        set: {
          contactId: sql`excluded."contactId"`,
          number: sql`excluded."number"`,
          reference: sql`excluded."reference"`,
          issueDate: sql`excluded."issueDate"`,
          dueDate: sql`excluded."dueDate"`,
          currency: sql`excluded."currency"`,
          subtotal: sql`excluded."subtotal"`,
          tax: sql`excluded."tax"`,
          total: sql`excluded."total"`,
          amountPaid: sql`excluded."amountPaid"`,
          status: sql`excluded."status"`,
          approvalStatus: sql`excluded."approvalStatus"`,
          hasAttachment: sql`excluded."hasAttachment"`,
          attachmentUrl: sql`excluded."attachmentUrl"`,
          lineItems: sql`excluded."lineItems"`,
          metadata: sql`excluded."metadata"`,
          updatedAt: sql`excluded."updatedAt"`,
        },
      })
      .returning();

    return upsertedBills;
  } catch (error) {
    console.error("[AP] Upsert bills error:", error);
    throw new ChatSDKError("bad_request:database", "Failed to upsert bills");
  }
}

/**
 * Insert a payment and update bill status
 */
export async function insertPayment(
  payment: ApPaymentInsert
): Promise<{ payment: ApPayment; bill: ApBill }> {
  try {
    const [newPayment] = await db.insert(apPayment).values(payment).returning();

    // Get bill and calculate new status
    const [bill] = await db
      .select()
      .from(apBill)
      .where(eq(apBill.id, payment.billId))
      .limit(1);

    if (!bill) {
      throw new ChatSDKError("bad_request:database", "Bill not found");
    }

    const newAmountPaid = (
      Number.parseFloat(bill.amountPaid) +
      Number.parseFloat(payment.amount.toString())
    ).toFixed(2);

    const total = Number.parseFloat(bill.total);
    const paid = Number.parseFloat(newAmountPaid);

    let newStatus: string = bill.status;
    if (paid >= total) {
      newStatus = "paid";
    } else if (paid > 0 && bill.status === "draft") {
      // Keep current status if partially paid
      newStatus = bill.status;
    }

    const [updatedBill] = await db
      .update(apBill)
      .set({
        amountPaid: newAmountPaid,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(apBill.id, payment.billId))
      .returning();

    return { payment: newPayment, bill: updatedBill };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    console.error("[AP] Insert payment error:", error);
    throw new ChatSDKError("bad_request:database", "Failed to insert payment");
  }
}

/**
 * Mark bill as paid
 */
export async function markBillPaid(
  billId: string,
  amount: string,
  paidAt: Date,
  reference?: string
): Promise<ApBill> {
  try {
    const payment: ApPaymentInsert = {
      billId,
      amount,
      paidAt,
      reference,
    };

    const { bill } = await insertPayment(payment);
    return bill;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    console.error("[AP] Mark bill paid error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to mark bill paid"
    );
  }
}

/**
 * Create or update a bank account change record
 */
export async function recordBankChange(
  change: ApBankChangeInsert
): Promise<ApBankChange> {
  try {
    const [created] = await db
      .insert(apBankChange)
      .values(change)
      .returning();
    return created;
  } catch (error) {
    console.error("[AP] Record bank change error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to record bank change"
    );
  }
}

/**
 * Verify a bank account change
 */
export async function verifyBankChange(
  changeId: string,
  verifiedBy: string,
  verificationMethod: string,
  notes?: string
): Promise<ApBankChange> {
  try {
    const [updated] = await db
      .update(apBankChange)
      .set({
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy,
        verificationMethod,
        notes,
      })
      .where(eq(apBankChange.id, changeId))
      .returning();
    return updated;
  } catch (error) {
    console.error("[AP] Verify bank change error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to verify bank change"
    );
  }
}

/**
 * Create a risk assessment for a bill
 */
export async function createRiskAssessment(
  assessment: ApRiskAssessmentInsert
): Promise<ApRiskAssessment> {
  try {
    const [created] = await db
      .insert(apRiskAssessment)
      .values(assessment)
      .returning();
    return created;
  } catch (error) {
    console.error("[AP] Create risk assessment error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create risk assessment"
    );
  }
}

/**
 * Get risk assessment for a bill
 */
export async function getBillRiskAssessment(
  billId: string
): Promise<ApRiskAssessment | null> {
  try {
    const results = await db
      .select()
      .from(apRiskAssessment)
      .where(eq(apRiskAssessment.billId, billId))
      .orderBy(desc(apRiskAssessment.assessedAt))
      .limit(1);

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error("[AP] Get bill risk assessment error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get bill risk assessment"
    );
  }
}

/**
 * Create a communication artefact
 */
export async function createCommsArtefact(
  artefact: ApCommsArtefactInsert
): Promise<ApCommsArtefact> {
  try {
    const [created] = await db
      .insert(apCommsArtefact)
      .values(artefact)
      .returning();
    return created;
  } catch (error) {
    console.error("[AP] Create comms artefact error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create comms artefact"
    );
  }
}

/**
 * Get artefacts for a bill
 */
export async function getBillArtefacts(
  billId: string
): Promise<ApCommsArtefact[]> {
  try {
    return await db
      .select()
      .from(apCommsArtefact)
      .where(eq(apCommsArtefact.billId, billId))
      .orderBy(desc(apCommsArtefact.createdAt));
  } catch (error) {
    console.error("[AP] Get bill artefacts error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get bill artefacts"
    );
  }
}

/**
 * Create a note for a bill or contact
 */
export async function createNote(note: ApNoteInsert): Promise<ApNote> {
  try {
    const [created] = await db.insert(apNote).values(note).returning();
    return created;
  } catch (error) {
    console.error("[AP] Create note error:", error);
    throw new ChatSDKError("bad_request:database", "Failed to create note");
  }
}

/**
 * Get notes for a bill
 */
export async function getBillNotes(billId: string): Promise<ApNote[]> {
  try {
    return await db
      .select()
      .from(apNote)
      .where(eq(apNote.billId, billId))
      .orderBy(desc(apNote.createdAt));
  } catch (error) {
    console.error("[AP] Get bill notes error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get bill notes"
    );
  }
}

/**
 * Get all contacts for a user
 */
export async function getUserContacts(userId: string): Promise<ApContact[]> {
  try {
    return await db
      .select()
      .from(apContact)
      .where(eq(apContact.userId, userId))
      .orderBy(apContact.name);
  } catch (error) {
    console.error("[AP] Get user contacts error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user contacts"
    );
  }
}

/**
 * Get contact with outstanding balance statistics
 */
export async function getContactsWithStats(
  userId: string
): Promise<ContactWithStats[]> {
  try {
    const contacts = await getUserContacts(userId);
    const now = new Date();

    const contactsWithStats: ContactWithStats[] = [];

    for (const contact of contacts) {
      // Get all bills for this contact
      const bills = await db
        .select()
        .from(apBill)
        .where(
          and(
            eq(apBill.contactId, contact.id),
            sql`${apBill.status} NOT IN ('paid', 'cancelled')`
          )
        );

      let totalOutstanding = 0;
      let totalOverdue = 0;
      let oldestInvoiceDays = 0;

      for (const bill of bills) {
        const amountDue =
          Number.parseFloat(bill.total) - Number.parseFloat(bill.amountPaid);
        totalOutstanding += amountDue;

        const daysOverdue = Math.floor(
          (now.getTime() - new Date(bill.dueDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (daysOverdue > 0) {
          totalOverdue += amountDue;
        }

        const billAge = Math.floor(
          (now.getTime() - new Date(bill.issueDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        oldestInvoiceDays = Math.max(oldestInvoiceDays, billAge);
      }

      contactsWithStats.push({
        ...contact,
        totalOutstanding,
        totalOverdue,
        billCount: bills.length,
        oldestInvoiceDays,
      });
    }

    // Sort by total outstanding (descending)
    return contactsWithStats.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  } catch (error) {
    console.error("[AP] Get contacts with stats error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get contacts with stats"
    );
  }
}

/**
 * Calculate AP KPIs for a user
 */
export async function getAPKPIs(userId: string): Promise<APKPIs> {
  try {
    const now = new Date();

    // Get all unpaid bills
    const bills = await db
      .select()
      .from(apBill)
      .where(
        and(
          eq(apBill.userId, userId),
          sql`${apBill.status} NOT IN ('paid', 'cancelled')`
        )
      );

    let totalOutstanding = 0;
    let overdueAmount = 0;
    let overdueBills = 0;
    const creditorSet = new Set<string>();

    // Ageing buckets
    const ageingBuckets: Record<string, { count: number; total: number }> = {
      current: { count: 0, total: 0 },
      "1-30": { count: 0, total: 0 },
      "31-60": { count: 0, total: 0 },
      "61-90": { count: 0, total: 0 },
      "90+": { count: 0, total: 0 },
    };

    for (const bill of bills) {
      const amountDue =
        Number.parseFloat(bill.total) - Number.parseFloat(bill.amountPaid);
      totalOutstanding += amountDue;
      creditorSet.add(bill.contactId);

      const daysOverdue = Math.floor(
        (now.getTime() - new Date(bill.dueDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysOverdue > 0) {
        overdueBills++;
        overdueAmount += amountDue;
      }

      // Classify into ageing buckets
      if (daysOverdue <= 0) {
        ageingBuckets.current.count++;
        ageingBuckets.current.total += amountDue;
      } else if (daysOverdue <= 30) {
        ageingBuckets["1-30"].count++;
        ageingBuckets["1-30"].total += amountDue;
      } else if (daysOverdue <= 60) {
        ageingBuckets["31-60"].count++;
        ageingBuckets["31-60"].total += amountDue;
      } else if (daysOverdue <= 90) {
        ageingBuckets["61-90"].count++;
        ageingBuckets["61-90"].total += amountDue;
      } else {
        ageingBuckets["90+"].count++;
        ageingBuckets["90+"].total += amountDue;
      }
    }

    // Calculate Days Payable Outstanding (DPO)
    // DPO = (Accounts Payable / COGS) * Days
    // Simplified: use average days until due date for outstanding bills
    const daysUntilDue =
      bills.length > 0
        ? bills.reduce((sum, bill) => {
            const days = Math.floor(
              (new Date(bill.dueDate).getTime() - new Date(bill.issueDate).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0) / bills.length
        : 0;

    const ageingSummary: AgeingBucket[] = Object.entries(ageingBuckets).map(
      ([bucket, data]) => ({
        bucket,
        count: data.count,
        total: Math.round(data.total * 100) / 100,
      })
    );

    return {
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      activeCreditors: creditorSet.size,
      daysPayableOutstanding: Math.round(daysUntilDue),
      overdueBills,
      overdueAmount: Math.round(overdueAmount * 100) / 100,
      ageingSummary,
    };
  } catch (error) {
    console.error("[AP] Get AP KPIs error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to calculate AP KPIs"
    );
  }
}

/**
 * Create a payment schedule
 */
export async function createPaymentSchedule(
  schedule: ApPaymentScheduleInsert
): Promise<ApPaymentSchedule> {
  try {
    const [created] = await db
      .insert(apPaymentSchedule)
      .values(schedule)
      .returning();
    return created;
  } catch (error) {
    console.error("[AP] Create payment schedule error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create payment schedule"
    );
  }
}

/**
 * Get payment schedules for a user
 */
export async function getUserPaymentSchedules(
  userId: string
): Promise<ApPaymentSchedule[]> {
  try {
    return await db
      .select()
      .from(apPaymentSchedule)
      .where(eq(apPaymentSchedule.userId, userId))
      .orderBy(desc(apPaymentSchedule.scheduledDate));
  } catch (error) {
    console.error("[AP] Get user payment schedules error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user payment schedules"
    );
  }
}

/**
 * Get unverified bank changes for a user
 */
export async function getUnverifiedBankChanges(
  userId: string
): Promise<ApBankChange[]> {
  try {
    return await db
      .select()
      .from(apBankChange)
      .where(
        and(
          eq(apBankChange.userId, userId),
          eq(apBankChange.isVerified, false)
        )
      )
      .orderBy(desc(apBankChange.detectedAt));
  } catch (error) {
    console.error("[AP] Get unverified bank changes error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get unverified bank changes"
    );
  }
}

/**
 * Get high-risk bills for a user
 */
export async function getHighRiskBills(userId: string): Promise<BillWithContact[]> {
  try {
    // Get all risk assessments with high or critical risk
    const highRiskAssessments = await db
      .select()
      .from(apRiskAssessment)
      .where(
        and(
          eq(apRiskAssessment.userId, userId),
          or(
            eq(apRiskAssessment.riskLevel, "high"),
            eq(apRiskAssessment.riskLevel, "critical")
          )
        )
      );

    const billIds = highRiskAssessments.map((ra) => ra.billId);

    if (billIds.length === 0) {
      return [];
    }

    // Get bills with contacts
    const results = await db
      .select({
        bill: apBill,
        contact: apContact,
      })
      .from(apBill)
      .innerJoin(apContact, eq(apBill.contactId, apContact.id))
      .where(
        and(
          eq(apBill.userId, userId),
          sql`${apBill.id} IN (${sql.join(billIds.map((id) => sql`${id}`), sql`, `)})`
        )
      )
      .orderBy(desc(apBill.dueDate));

    return results.map((row) => {
      const daysOverdue = Math.max(
        0,
        Math.floor(
          (new Date().getTime() - new Date(row.bill.dueDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      return {
        ...row.bill,
        contact: row.contact,
        daysOverdue,
      };
    });
  } catch (error) {
    console.error("[AP] Get high risk bills error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get high risk bills"
    );
  }
}

/**
 * Get recent artefacts for a user
 */
export async function getUserRecentArtefacts(
  userId: string,
  limit = 50
): Promise<ApCommsArtefact[]> {
  try {
    return await db
      .select()
      .from(apCommsArtefact)
      .where(eq(apCommsArtefact.userId, userId))
      .orderBy(desc(apCommsArtefact.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[AP] Get user recent artefacts error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user recent artefacts"
    );
  }
}
