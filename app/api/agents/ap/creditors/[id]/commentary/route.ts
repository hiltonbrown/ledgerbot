import { generateText } from "ai";
import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { myProvider } from "@/lib/ai/providers";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { db } from "@/lib/db/queries";
import { apBankChange, apBill, apContact, apPayment } from "@/lib/db/schema/ap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/agents/ap/creditors/[id]/commentary
 * Generate AI commentary for a specific creditor
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    // Get creditor details
    const [creditor] = await db
      .select()
      .from(apContact)
      .where(and(eq(apContact.id, id), eq(apContact.userId, user.id)))
      .limit(1);

    if (!creditor) {
      return NextResponse.json(
        { error: "Creditor not found" },
        { status: 404 }
      );
    }

    // Get bills for this creditor
    const bills = await db
      .select()
      .from(apBill)
      .where(
        and(
          eq(apBill.contactId, id),
          eq(apBill.userId, user.id),
          sql`${apBill.status} NOT IN ('paid', 'cancelled')`
        )
      )
      .orderBy(desc(apBill.dueDate))
      .limit(10);

    // Get recently paid bills
    const paidBills = await db
      .select()
      .from(apBill)
      .where(
        and(
          eq(apBill.contactId, id),
          eq(apBill.userId, user.id),
          eq(apBill.status, "paid")
        )
      )
      .orderBy(desc(apBill.updatedAt)) // or issueDate if preferred, but updatedAt likely reflects payment time roughly if sync updates it
      .limit(5);

    // Get recent payments
    const recentPayments = await db
      .select({
        payment: apPayment,
        bill: apBill,
      })
      .from(apPayment)
      .innerJoin(apBill, eq(apPayment.billId, apBill.id))
      .where(eq(apBill.contactId, id))
      .orderBy(desc(apPayment.paidAt))
      .limit(5);

    // Get bank changes
    const bankChanges = await db
      .select()
      .from(apBankChange)
      .where(
        and(eq(apBankChange.contactId, id), eq(apBankChange.userId, user.id))
      )
      .orderBy(desc(apBankChange.detectedAt))
      .limit(5);

    // Calculate statistics
    const now = new Date();
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let overdueBills = 0;
    let avgDaysToPayment = 0;

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
        overdueBills++;
      }
    }

    // Calculate average days to payment from recent payments
    if (recentPayments.length > 0) {
      const paymentDelays = recentPayments.map((p) => {
        const dueDate = new Date(p.bill.dueDate);
        const paidDate = new Date(p.payment.paidAt);
        return Math.floor(
          (paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      });
      avgDaysToPayment =
        paymentDelays.reduce((sum, days) => sum + days, 0) /
        paymentDelays.length;
    }

    // Prepare context for AI
    const context = `
Supplier: ${creditor.name}
ABN: ${creditor.abn || "Not provided"}
Status: ${creditor.status}
Risk Level: ${creditor.riskLevel}

Outstanding Bills: ${bills.length}
Total Outstanding: $${totalOutstanding.toFixed(2)}
Total Overdue: $${totalOverdue.toFixed(2)}
Overdue Bills: ${overdueBills}
Average Days to Payment: ${avgDaysToPayment.toFixed(1)} days ${avgDaysToPayment > 0 ? "(paid late)" : avgDaysToPayment < 0 ? "(paid early)" : "(paid on time)"}

Recent Payments (last 5):
${recentPayments.map((p) => `- $${p.payment.amount} paid on ${new Date(p.payment.paidAt).toLocaleDateString("en-AU")}`).join("\n")}

Bank Account Changes: ${bankChanges.length}
${bankChanges.length > 0 ? `Most Recent Change: ${new Date(bankChanges[0].detectedAt).toLocaleDateString("en-AU")}` : "No changes detected"}
${bankChanges.length > 0 && !bankChanges[0].isVerified ? "⚠️ UNVERIFIED BANK CHANGE" : ""}
`;

    // Generate AI commentary
    const prompt = `You are an AI assistant analyzing accounts payable data for an Australian business.

Analyze the following supplier information and provide a very short summary (max 2-3 sentences).
Focus on payment behavior, risk, and any critical warnings (like unverified bank changes or overdue bills).

${context}

Provide your summary:`;

    const result = await generateText({
      model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
      prompt,
    });

    const commentary = result.text;

    return NextResponse.json({
      success: true,
      data: {
        creditor,
        bills: bills.slice(0, 5), // Return top 5 bills
        paidBills: paidBills,
        recentPayments: recentPayments.map((p) => ({
          ...p.payment,
          billNumber: p.bill.number,
        })),
        bankChanges: bankChanges.slice(0, 3), // Return top 3 changes
        statistics: {
          totalOutstanding,
          totalOverdue,
          overdueBills,
          avgDaysToPayment: Math.round(avgDaysToPayment * 10) / 10,
        },
        commentary,
      },
    });
  } catch (error) {
    console.error("[AP Creditor Commentary API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate creditor commentary",
      },
      { status: 500 }
    );
  }
}
