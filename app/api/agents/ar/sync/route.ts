import { subMonths } from "date-fns";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { db } from "@/lib/db/queries";
import { upsertContacts, upsertInvoices } from "@/lib/db/queries/ar";
import { arCustomerHistory, arInvoice, arPayment } from "@/lib/db/schema/ar";
import {
  calculateAgeingBucket,
  calculateCustomerHistory,
} from "@/lib/logic/ar";
import { getXeroProvider } from "@/lib/tools/ar/xero";

export const maxDuration = 60;

type SyncResponse = {
  success: boolean;
  contactsSynced: number;
  invoicesSynced: number;
  isUsingMock: boolean;
  error?: string;
};

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const { since } = (await req.json()) as {
      since?: string;
    };

    console.log("[AR Sync] Starting Xero sync for user:", user.clerkId);

    // Get Xero provider using UUID (for XeroConnection table lookup)
    const xero = await getXeroProvider(user.id);

    // Sync contacts first
    const xeroContacts = await xero.listContacts({ isCustomer: true });
    // Use clerkId for AR tables (they reference user.clerkId)
    const contacts = await upsertContacts(
      user.clerkId,
      xeroContacts.map((c) => ({
        name: c.name,
        email: c.emailAddress,
        phone: c.phones?.[0]?.phoneNumber,
        externalRef: c.contactID,
      }))
    );

    console.log(`[AR Sync] Synced ${contacts.length} contacts`);

    // Sync invoices
    const xeroInvoices = await xero.listInvoices({
      status: "AUTHORISED",
      dateFrom: since,
    });

    // Map contact IDs
    const contactMap = new Map(contacts.map((c) => [c.externalRef, c.id]));

    const invoicesToUpsert = xeroInvoices
      .map((inv) => {
        const contactId = contactMap.get(inv.contact.contactID);
        if (!contactId) {
          console.warn(
            `[AR Sync] Contact not found for invoice ${inv.invoiceNumber}`
          );
          return null;
        }

        // Validate dates
        const issueDate = new Date(inv.dateString);
        const dueDate = new Date(inv.dueDateString);

        if (Number.isNaN(issueDate.getTime())) {
          console.warn(
            `[AR Sync] Invalid issueDate for invoice ${inv.invoiceNumber}: ${inv.dateString}`
          );
          return null;
        }

        if (Number.isNaN(dueDate.getTime())) {
          console.warn(
            `[AR Sync] Invalid dueDate for invoice ${inv.invoiceNumber}: ${inv.dueDateString}`
          );
          return null;
        }

        const amountDue = Number.parseFloat(inv.amountDue.toFixed(2));
        const hasAmountDue = amountDue > 0;
        const amountOutstanding = amountDue;

        return {
          contactId,
          number: inv.invoiceNumber,
          issueDate,
          dueDate,
          currency: inv.currencyCode,
          subtotal: inv.subTotal.toFixed(2),
          tax: inv.totalTax.toFixed(2),
          total: inv.total.toFixed(2),
          amountPaid: inv.amountPaid.toFixed(2),
          amountOutstanding: amountOutstanding.toFixed(2),
          creditNoteAmount: "0.00",
          status: mapXeroStatus(inv.status, hasAmountDue),
          ageingBucket: calculateAgeingBucket(dueDate, amountOutstanding),
          externalRef: inv.invoiceID,
        };
      })
      .filter((inv): inv is NonNullable<typeof inv> => inv !== null);

    const invoices = await upsertInvoices(user.clerkId, invoicesToUpsert);

    console.log(`[AR Sync] Synced ${invoices.length} invoices`);

    // Calculate and insert customer history for each contact
    console.log("[AR Sync] Calculating customer history...");
    const startDate = subMonths(new Date(), 24);
    const endDate = new Date();

    // Delete old customer history records for this user to avoid duplicates
    await db
      .delete(arCustomerHistory)
      .where(eq(arCustomerHistory.userId, user.clerkId));

    for (const contact of contacts) {
      // Get all invoices for this contact
      const contactInvoices = await db
        .select()
        .from(arInvoice)
        .where(eq(arInvoice.contactId, contact.id));

      // Get all payments for this contact
      const contactPayments = await db
        .select()
        .from(arPayment)
        .where(eq(arPayment.contactId, contact.id));

      // Calculate history stats
      const history = calculateCustomerHistory(
        contactInvoices,
        contactPayments
      );

      // Insert customer history
      await db.insert(arCustomerHistory).values({
        userId: user.clerkId,
        customerId: contact.id,
        startDate,
        endDate,
        numInvoices: history.numInvoices,
        numLatePayments: history.numLatePayments,
        avgDaysLate: history.avgDaysLate,
        maxDaysLate: history.maxDaysLate,
        percentInvoices90Plus: history.percentInvoices90Plus,
        totalOutstanding: history.totalOutstanding.toString(),
        maxInvoiceOutstanding: history.maxInvoiceOutstanding.toString(),
        totalBilledLast12Months: history.totalBilledLast12Months.toString(),
        lastPaymentDate: history.lastPaymentDate,
        creditTermsDays: history.creditTermsDays,
        riskScore: history.riskScore,
      });
    }

    console.log(`[AR Sync] Calculated history for ${contacts.length} contacts`);

    const response: SyncResponse = {
      success: true,
      contactsSynced: contacts.length,
      invoicesSynced: invoices.length,
      isUsingMock: xero.isUsingMock,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[AR Sync] Error:", error);
    return NextResponse.json(
      {
        success: false,
        contactsSynced: 0,
        invoicesSynced: 0,
        isUsingMock: false,
        error: error instanceof Error ? error.message : "Sync failed",
      } as SyncResponse,
      { status: 500 }
    );
  }
}

function mapXeroStatus(xeroStatus: string, hasAmountDue: boolean): string {
  if (xeroStatus === "PAID") {
    return "paid";
  }
  if (xeroStatus === "VOIDED") {
    return "voided";
  }
  if (xeroStatus === "DRAFT") {
    return "draft";
  }
  if (xeroStatus === "AUTHORISED" && hasAmountDue) {
    return "awaiting_payment";
  }
  return "awaiting_payment";
}
