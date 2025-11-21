import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { db } from "@/lib/db/queries";
import { apBill, apContact } from "@/lib/db/schema/ap";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { createPaymentSchedule } from "@/lib/db/queries/ap";
import type { ApPaymentScheduleInsert } from "@/lib/db/schema/ap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/agents/ap/schedule
 * Get payment schedule and cash flow forecast
 */
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all unpaid bills within the date range
    const bills = await db
      .select({
        bill: apBill,
        contact: apContact,
      })
      .from(apBill)
      .innerJoin(apContact, eq(apBill.contactId, apContact.id))
      .where(
        and(
          eq(apBill.userId, user.id),
          sql`${apBill.status} NOT IN ('paid', 'cancelled')`,
          gte(apBill.dueDate, start),
          lte(apBill.dueDate, end)
        )
      )
      .orderBy(apBill.dueDate);

    // Group bills by date
    const billsByDate: Record<string, typeof bills> = {};
    for (const item of bills) {
      const dateKey = new Date(item.bill.dueDate).toISOString().split("T")[0];
      if (!billsByDate[dateKey]) {
        billsByDate[dateKey] = [];
      }
      billsByDate[dateKey].push(item);
    }

    // Calculate daily totals and cumulative forecast
    const forecast: Array<{
      date: string;
      billsDue: number;
      amountDue: number;
      cumulativeAmount: number;
    }> = [];

    let cumulativeAmount = 0;
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().split("T")[0];
      const dayBills = billsByDate[dateKey] || [];

      const amountDue = dayBills.reduce((sum, item) => {
        const due = Number.parseFloat(item.bill.total) - Number.parseFloat(item.bill.amountPaid);
        return sum + due;
      }, 0);

      cumulativeAmount += amountDue;

      forecast.push({
        date: dateKey,
        billsDue: dayBills.length,
        amountDue: Math.round(amountDue * 100) / 100,
        cumulativeAmount: Math.round(cumulativeAmount * 100) / 100,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Format bills for response
    const formattedBillsByDate: Record<string, Array<{
      id: string;
      number: string;
      contactName: string;
      contactId: string;
      dueDate: string;
      amount: number;
      status: string;
      riskLevel: string;
    }>> = {};

    for (const [dateKey, dayBills] of Object.entries(billsByDate)) {
      formattedBillsByDate[dateKey] = dayBills.map((item) => ({
        id: item.bill.id,
        number: item.bill.number,
        contactName: item.contact.name,
        contactId: item.contact.id,
        dueDate: new Date(item.bill.dueDate).toISOString(),
        amount: Number.parseFloat(item.bill.total) - Number.parseFloat(item.bill.amountPaid),
        status: item.bill.status,
        riskLevel: item.contact.riskLevel,
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        billsByDate: formattedBillsByDate,
        forecast,
        summary: {
          totalBills: bills.length,
          totalAmount: cumulativeAmount,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("[AP Schedule API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get payment schedule",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/ap/schedule
 * Create a payment run/schedule
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, scheduledDate, billIds, notes } = body;

    if (!name || !scheduledDate || !billIds || billIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get bills to calculate totals
    const bills = await db
      .select()
      .from(apBill)
      .where(
        and(
          eq(apBill.userId, user.id),
          sql`${apBill.id} IN (${sql.join(billIds.map((id: string) => sql`${id}`), sql`, `)})`
        )
      );

    if (bills.length === 0) {
      return NextResponse.json(
        { error: "No valid bills found" },
        { status: 400 }
      );
    }

    const totalAmount = bills.reduce((sum, bill) => {
      const due = Number.parseFloat(bill.total) - Number.parseFloat(bill.amountPaid);
      return sum + due;
    }, 0);

    // Calculate risk summary
    const riskSummary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: bills.length,
    };

    // Create payment schedule in database
    const scheduleData: ApPaymentScheduleInsert = {
      userId: user.id,
      name,
      scheduledDate: new Date(scheduledDate),
      billIds,
      totalAmount: (Math.round(totalAmount * 100) / 100).toString(),
      billCount: bills.length.toString(),
      riskSummary,
      notes,
      status: "draft",
    };

    const createdSchedule = await createPaymentSchedule(scheduleData);

    return NextResponse.json({
      success: true,
      schedule: createdSchedule,
    });
  } catch (error) {
    console.error("[AP Schedule API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create payment schedule",
      },
      { status: 500 }
    );
  }
}
