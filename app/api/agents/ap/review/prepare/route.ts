import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { db, saveApReviewContext } from "@/lib/db/queries";
import { apBankChange, apBill, apContact } from "@/lib/db/schema/ap";
import { generateInvoiceReviewContext } from "@/lib/logic/ap-chat";

export const runtime = "nodejs";

const requestSchema = z.object({
  creditorId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { creditorId } = validation.data;

    // Fetch Creditor Data
    const [creditor] = await db
      .select()
      .from(apContact)
      .where(and(eq(apContact.id, creditorId), eq(apContact.userId, user.id)))
      .limit(1);

    if (!creditor) {
      return NextResponse.json(
        { error: "Creditor not found" },
        { status: 404 }
      );
    }

    // Fetch Bills
    const bills = await db
      .select()
      .from(apBill)
      .where(
        and(
          eq(apBill.contactId, creditorId),
          eq(apBill.userId, user.id),
          sql`${apBill.status} NOT IN ('paid', 'cancelled')`
        )
      )
      .orderBy(desc(apBill.dueDate));

    // Fetch Bank Changes
    const bankChanges = await db
      .select()
      .from(apBankChange)
      .where(
        and(
          eq(apBankChange.contactId, creditorId),
          eq(apBankChange.userId, user.id)
        )
      )
      .orderBy(desc(apBankChange.detectedAt))
      .limit(5);

    // Calculate totals
    let totalOutstanding = 0;
    for (const bill of bills) {
      totalOutstanding +=
        Number.parseFloat(bill.total) - Number.parseFloat(bill.amountPaid);
    }

    // Generate Context
    const contextData = generateInvoiceReviewContext({
      creditor: {
        id: creditor.id,
        name: creditor.name,
        email: creditor.email,
        phone: creditor.phone,
        riskLevel: creditor.riskLevel,
      },
      totalOutstanding,
      riskAnalysis: `Risk Level: ${creditor.riskLevel}. ${bankChanges.length > 0 ? "Has recent bank changes." : "No recent bank changes."}`,
      bills: bills.map((b) => ({
        number: b.number,
        issueDate: b.issueDate.toISOString(),
        dueDate: b.dueDate.toISOString(),
        total: b.total,
        amountPaid: b.amountPaid,
        amountDue: (
          Number.parseFloat(b.total) - Number.parseFloat(b.amountPaid)
        ).toFixed(2),
        status: b.status,
        currency: b.currency,
        riskLevel: "unknown", // We don't have individual bill risk levels in the query yet, can default
      })),
      bankChanges: bankChanges.map((bc) => ({
        detectedAt: bc.detectedAt.toISOString(),
        oldBsb: bc.oldBsb,
        oldAccountNumber: bc.oldAccountNumber,
        newBsb: bc.newBsb,
        newAccountNumber: bc.newAccountNumber,
        isVerified: bc.isVerified || false,
      })),
    });

    // Save Context
    const contextId = await saveApReviewContext({
      userId: user.id,
      contactId: creditorId,
      contextData,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return NextResponse.json({ contextId });
  } catch (error) {
    console.error("[AP Review Prepare] Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
