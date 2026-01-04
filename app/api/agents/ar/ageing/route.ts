import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getActiveXeroConnection } from "@/lib/db/queries";
import { listInvoicesDue } from "@/lib/db/queries/ar";

export const maxDuration = 60;

type AgeingBucket = {
  label: string;
  minDays: number;
  maxDays: number | null;
  totalOutstanding: number;
  invoiceCount: number;
};

type ContactAgeing = {
  contactId: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  totalOutstanding: number;
  invoiceCount: number;
  buckets: {
    current: number; // 0-30 days
    thirtyDays: number; // 31-60 days
    sixtyDays: number; // 61-90 days
    ninetyPlus: number; // 90+ days
  };
  oldestInvoiceDays: number;
};

type AgeingReportResponse = {
  asOf: string;
  summary: {
    totalOutstanding: number;
    invoiceCount: number;
    contactCount: number;
  };
  buckets: AgeingBucket[];
  contacts: ContactAgeing[];
};

export async function GET(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const asOfParam = searchParams.get("asOf");
    const asOf = asOfParam ? new Date(asOfParam) : new Date();

    // Get active Xero connection for tenantId
    const xeroConnection = await getActiveXeroConnection(user.id);
    if (!xeroConnection) {
      return new NextResponse("Xero connection not found", { status: 404 });
    }

    // Get all due invoices (0+ days overdue)
    const result = await listInvoicesDue({
      userId: user.id,
      tenantId: xeroConnection.tenantId,
      asOf,
      minDaysOverdue: 0,
    });

    // Group by contact and calculate buckets
    const contactMap = new Map<string, ContactAgeing>();

    for (const invoice of result.invoices) {
      const amountDue =
        Number.parseFloat(invoice.total) -
        Number.parseFloat(invoice.amountPaid);

      if (amountDue <= 0) {
        continue; // Skip fully paid invoices
      }

      let contact = contactMap.get(invoice.contact.id);
      if (!contact) {
        contact = {
          contactId: invoice.contact.id,
          contactName: invoice.contact.name,
          email: invoice.contact.email || null,
          phone: invoice.contact.phone || null,
          totalOutstanding: 0,
          invoiceCount: 0,
          buckets: {
            current: 0,
            thirtyDays: 0,
            sixtyDays: 0,
            ninetyPlus: 0,
          },
          oldestInvoiceDays: 0,
        };
        contactMap.set(invoice.contact.id, contact);
      }

      contact.totalOutstanding += amountDue;
      contact.invoiceCount += 1;
      contact.oldestInvoiceDays = Math.max(
        contact.oldestInvoiceDays,
        invoice.daysOverdue
      );

      // Categorize into buckets
      if (invoice.daysOverdue <= 30) {
        contact.buckets.current += amountDue;
      } else if (invoice.daysOverdue <= 60) {
        contact.buckets.thirtyDays += amountDue;
      } else if (invoice.daysOverdue <= 90) {
        contact.buckets.sixtyDays += amountDue;
      } else {
        contact.buckets.ninetyPlus += amountDue;
      }
    }

    const contacts = Array.from(contactMap.values()).sort(
      (a, b) => b.totalOutstanding - a.totalOutstanding
    );

    // Calculate summary buckets
    const buckets: AgeingBucket[] = [
      {
        label: "0-30 days",
        minDays: 0,
        maxDays: 30,
        totalOutstanding: 0,
        invoiceCount: 0,
      },
      {
        label: "31-60 days",
        minDays: 31,
        maxDays: 60,
        totalOutstanding: 0,
        invoiceCount: 0,
      },
      {
        label: "61-90 days",
        minDays: 61,
        maxDays: 90,
        totalOutstanding: 0,
        invoiceCount: 0,
      },
      {
        label: "90+ days",
        minDays: 91,
        maxDays: null,
        totalOutstanding: 0,
        invoiceCount: 0,
      },
    ];

    for (const contact of contacts) {
      buckets[0].totalOutstanding += contact.buckets.current;
      buckets[1].totalOutstanding += contact.buckets.thirtyDays;
      buckets[2].totalOutstanding += contact.buckets.sixtyDays;
      buckets[3].totalOutstanding += contact.buckets.ninetyPlus;
    }

    // Count invoices per bucket
    for (const invoice of result.invoices) {
      const amountDue =
        Number.parseFloat(invoice.total) -
        Number.parseFloat(invoice.amountPaid);
      if (amountDue <= 0) {
        continue;
      }

      if (invoice.daysOverdue <= 30) {
        buckets[0].invoiceCount += 1;
      } else if (invoice.daysOverdue <= 60) {
        buckets[1].invoiceCount += 1;
      } else if (invoice.daysOverdue <= 90) {
        buckets[2].invoiceCount += 1;
      } else {
        buckets[3].invoiceCount += 1;
      }
    }

    const response: AgeingReportResponse = {
      asOf: result.asOf,
      summary: {
        totalOutstanding: contacts.reduce(
          (sum, c) => sum + c.totalOutstanding,
          0
        ),
        invoiceCount: result.invoices.filter(
          (inv) =>
            Number.parseFloat(inv.total) - Number.parseFloat(inv.amountPaid) > 0
        ).length,
        contactCount: contacts.length,
      },
      buckets,
      contacts,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[AR Ageing Report] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
