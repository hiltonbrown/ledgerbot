import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { db, getActiveXeroConnection } from "@/lib/db/queries";
import {
  getInvoiceArtefacts,
  getInvoiceNotes,
  listInvoicesDue,
} from "@/lib/db/queries/ar";
import { arContact } from "@/lib/db/schema/ar";

export const maxDuration = 60;

type CustomerInvoiceResponse = {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  invoices: Array<{
    id: string;
    number: string;
    issueDate: string;
    dueDate: string;
    total: string;
    amountPaid: string;
    amountDue: string;
    status: string;
    daysOverdue: number;
    currency: string;
    notes: Array<{
      id: string;
      body: string;
      createdAt: string;
      visibility: string;
    }>;
    artefacts: Array<{
      id: string;
      channel: string;
      subject: string | null;
      body: string;
      tone: string;
      createdAt: string;
    }>;
  }>;
  summary: {
    totalOutstanding: number;
    invoiceCount: number;
    oldestInvoiceDays: number | null;
  };
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const { contactId } = await params;

    // Get contact details
    const [contact] = await db
      .select()
      .from(arContact)
      .where(and(eq(arContact.id, contactId), eq(arContact.userId, user.id)))
      .limit(1);

    if (!contact) {
      return new NextResponse("Contact not found", { status: 404 });
    }

    // Get active Xero connection for tenantId
    const xeroConnection = await getActiveXeroConnection(user.id);
    if (!xeroConnection) {
      return new NextResponse("Xero connection not found", { status: 404 });
    }

    // Get all invoices for this contact (including paid ones)
    const asOf = new Date();
    const allInvoicesResult = await listInvoicesDue({
      userId: user.id,
      tenantId: xeroConnection.tenantId,
      asOf,
      minDaysOverdue: 0,
      customerId: contactId,
    });

    // Fetch notes and artefacts for each invoice
    const invoicesWithDetails = await Promise.all(
      allInvoicesResult.invoices.map(async (invoice) => {
        const notes = await getInvoiceNotes(invoice.id);
        const artefacts = await getInvoiceArtefacts(invoice.id);

        const amountDue = (
          Number.parseFloat(invoice.total) -
          Number.parseFloat(invoice.amountPaid)
        ).toFixed(2);

        return {
          id: invoice.id,
          number: invoice.number,
          issueDate: invoice.issueDate.toISOString(),
          dueDate: invoice.dueDate.toISOString(),
          total: invoice.total,
          amountPaid: invoice.amountPaid,
          amountDue,
          status: invoice.status,
          daysOverdue: invoice.daysOverdue,
          currency: invoice.currency,
          notes: notes.map((note) => ({
            id: note.id,
            body: note.body,
            createdAt: note.createdAt.toISOString(),
            visibility: note.visibility,
          })),
          artefacts: artefacts.map((artefact) => ({
            id: artefact.id,
            channel: artefact.channel,
            subject: artefact.subject,
            body: artefact.body,
            tone: artefact.tone,
            createdAt: artefact.createdAt.toISOString(),
          })),
        };
      })
    );

    // Calculate summary
    const totalOutstanding = invoicesWithDetails.reduce(
      (sum, inv) => sum + Number.parseFloat(inv.amountDue),
      0
    );

    const unpaidInvoices = invoicesWithDetails.filter(
      (inv) => Number.parseFloat(inv.amountDue) > 0
    );

    const oldestInvoiceDays =
      unpaidInvoices.length > 0
        ? Math.max(...unpaidInvoices.map((inv) => inv.daysOverdue))
        : null;

    const response: CustomerInvoiceResponse = {
      customer: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
      },
      invoices: invoicesWithDetails,
      summary: {
        totalOutstanding,
        invoiceCount: unpaidInvoices.length,
        oldestInvoiceDays,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[AR Customer] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
