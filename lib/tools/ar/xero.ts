/**
 * Xero integration for AR agent with deterministic mocks
 */

import "server-only";

import type { XeroClient } from "xero-node";
import { addDays } from "@/lib/util/dates";
import { getDecryptedConnection } from "@/lib/xero/connection-manager";

export type XeroInvoice = {
  invoiceID: string;
  invoiceNumber: string;
  type: string;
  contact: {
    contactID: string;
    name: string;
    emailAddress?: string;
    phones?: Array<{ phoneType: string; phoneNumber: string }>;
  };
  dateString: string;
  dueDateString: string;
  status: string;
  lineAmountTypes: string;
  subTotal: number;
  totalTax: number;
  total: number;
  amountDue: number;
  amountPaid: number;
  currencyCode: string;
};

export type XeroContact = {
  contactID: string;
  name: string;
  emailAddress?: string;
  phones?: Array<{
    phoneType: string;
    phoneNumber: string;
    phoneCountryCode?: string;
  }>;
  isCustomer?: boolean;
  isSupplier?: boolean;
};

export type XeroProvider = {
  isUsingMock: boolean;
  listInvoices: (params: {
    status?: string;
    contactIds?: string[];
    dateFrom?: string;
    dateTo?: string;
  }) => Promise<XeroInvoice[]>;
  markPaid: (
    invoiceId: string,
    payment: {
      amount: number;
      date: string;
      reference?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  listContacts: (params?: {
    searchTerm?: string;
    isCustomer?: boolean;
  }) => Promise<XeroContact[]>;
};

/**
 * Get Xero provider - real or mock based on credentials
 */
export async function getXeroProvider(userId: string): Promise<XeroProvider> {
  const hasCredentials =
    process.env.XERO_CLIENT_ID &&
    process.env.XERO_CLIENT_SECRET &&
    process.env.XERO_REDIRECT_URI;

  if (!hasCredentials) {
    console.log("[AR Xero] Using mock provider - credentials not configured");
    return getMockXeroProvider();
  }

  try {
    const connection = await getDecryptedConnection(userId);
    if (!connection) {
      console.log("[AR Xero] Using mock provider - no active connection");
      return getMockXeroProvider();
    }

    return getRealXeroProvider(connection.tenantId);
  } catch (error) {
    console.error(
      "[AR Xero] Error getting connection, falling back to mock:",
      error
    );
    return getMockXeroProvider();
  }
}

/**
 * Create real Xero provider
 */
function getRealXeroProvider(tenantId: string): XeroProvider {
  // Import xero-node dynamically to avoid build issues when not configured
  const { XeroClient } = require("xero-node");
  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    redirectUris: [process.env.XERO_REDIRECT_URI!],
    scopes: ["accounting.transactions", "accounting.contacts"],
  });

  return {
    isUsingMock: false,

    async listInvoices(params) {
      try {
        const where = [];
        if (params.status) {
          where.push(`Status=="${params.status.toUpperCase()}"`);
        }
        if (params.contactIds && params.contactIds.length > 0) {
          const contactFilter = params.contactIds
            .map((id) => `Contact.ContactID==Guid("${id}")`)
            .join(" OR ");
          where.push(`(${contactFilter})`);
        }
        if (params.dateFrom) {
          where.push(`Date>=DateTime(${params.dateFrom})`);
        }
        if (params.dateTo) {
          where.push(`Date<=DateTime(${params.dateTo})`);
        }

        const response = await xero.accountingApi.getInvoices(
          tenantId,
          undefined,
          where.length > 0 ? where.join(" AND ") : undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        );

        return response.body.invoices || [];
      } catch (error) {
        console.error("[AR Xero] Error listing invoices:", error);
        throw new Error("Failed to list invoices from Xero");
      }
    },

    async markPaid(invoiceId, payment) {
      try {
        const paymentData = {
          invoice: { invoiceID: invoiceId },
          account: { code: "200" }, // Default bank account
          date: payment.date,
          amount: payment.amount,
          reference: payment.reference,
        };

        await xero.accountingApi.createPayment(tenantId, paymentData);
        return { success: true };
      } catch (error) {
        console.error("[AR Xero] Error marking invoice paid:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },

    async listContacts(params) {
      try {
        const where = [];
        if (params?.isCustomer) {
          where.push("IsCustomer==true");
        }

        const response = await xero.accountingApi.getContacts(
          tenantId,
          undefined,
          where.length > 0 ? where.join(" AND ") : undefined,
          undefined,
          undefined,
          params?.searchTerm
        );

        return response.body.contacts || [];
      } catch (error) {
        console.error("[AR Xero] Error listing contacts:", error);
        throw new Error("Failed to list contacts from Xero");
      }
    },
  };
}

/**
 * Create deterministic mock Xero provider for testing/dev
 * Mock data is keyed by date for repeatable results
 */
function getMockXeroProvider(): XeroProvider {
  const mockContacts: XeroContact[] = [
    {
      contactID: "contact-001",
      name: "Acme Pty Ltd",
      emailAddress: "accounts@acme.example.com",
      phones: [{ phoneType: "DEFAULT", phoneNumber: "+61 2 9876 5432" }],
      isCustomer: true,
      isSupplier: false,
    },
    {
      contactID: "contact-002",
      name: "Smith & Co",
      emailAddress: "billing@smith.example.com",
      phones: [{ phoneType: "DEFAULT", phoneNumber: "+61 3 5555 1234" }],
      isCustomer: true,
      isSupplier: false,
    },
    {
      contactID: "contact-003",
      name: "Tech Solutions Ltd",
      emailAddress: "accounts@techsol.example.com",
      phones: [{ phoneType: "MOBILE", phoneNumber: "+61 412 345 678" }],
      isCustomer: true,
      isSupplier: false,
    },
  ];

  const today = new Date();
  const mockInvoices: XeroInvoice[] = [
    {
      invoiceID: "inv-001",
      invoiceNumber: "INV-2025-001",
      type: "ACCREC",
      contact: {
        contactID: "contact-001",
        name: "Acme Pty Ltd",
        emailAddress: "accounts@acme.example.com",
        phones: [{ phoneType: "DEFAULT", phoneNumber: "+61 2 9876 5432" }],
      },
      dateString: addDays(today, -45).toISOString().split("T")[0],
      dueDateString: addDays(today, -15).toISOString().split("T")[0], // 15 days overdue
      status: "AUTHORISED",
      lineAmountTypes: "Exclusive",
      subTotal: 5000.0,
      totalTax: 500.0,
      total: 5500.0,
      amountDue: 5500.0,
      amountPaid: 0.0,
      currencyCode: "AUD",
    },
    {
      invoiceID: "inv-002",
      invoiceNumber: "INV-2025-002",
      type: "ACCREC",
      contact: {
        contactID: "contact-002",
        name: "Smith & Co",
        emailAddress: "billing@smith.example.com",
        phones: [{ phoneType: "DEFAULT", phoneNumber: "+61 3 5555 1234" }],
      },
      dateString: addDays(today, -35).toISOString().split("T")[0],
      dueDateString: addDays(today, -5).toISOString().split("T")[0], // 5 days overdue
      status: "AUTHORISED",
      lineAmountTypes: "Exclusive",
      subTotal: 3200.0,
      totalTax: 320.0,
      total: 3520.0,
      amountDue: 3520.0,
      amountPaid: 0.0,
      currencyCode: "AUD",
    },
    {
      invoiceID: "inv-003",
      invoiceNumber: "INV-2025-003",
      type: "ACCREC",
      contact: {
        contactID: "contact-003",
        name: "Tech Solutions Ltd",
        emailAddress: "accounts@techsol.example.com",
        phones: [{ phoneType: "MOBILE", phoneNumber: "+61 412 345 678" }],
      },
      dateString: addDays(today, -60).toISOString().split("T")[0],
      dueDateString: addDays(today, -30).toISOString().split("T")[0], // 30 days overdue
      status: "AUTHORISED",
      lineAmountTypes: "Exclusive",
      subTotal: 12_000.0,
      totalTax: 1200.0,
      total: 13_200.0,
      amountDue: 13_200.0,
      amountPaid: 0.0,
      currencyCode: "AUD",
    },
    {
      invoiceID: "inv-004",
      invoiceNumber: "INV-2025-004",
      type: "ACCREC",
      contact: {
        contactID: "contact-001",
        name: "Acme Pty Ltd",
        emailAddress: "accounts@acme.example.com",
        phones: [{ phoneType: "DEFAULT", phoneNumber: "+61 2 9876 5432" }],
      },
      dateString: addDays(today, -20).toISOString().split("T")[0],
      dueDateString: addDays(today, 10).toISOString().split("T")[0], // Not yet due
      status: "AUTHORISED",
      lineAmountTypes: "Exclusive",
      subTotal: 2750.0,
      totalTax: 275.0,
      total: 3025.0,
      amountDue: 3025.0,
      amountPaid: 0.0,
      currencyCode: "AUD",
    },
  ];

  return {
    isUsingMock: true,

    async listInvoices(params) {
      console.log("[AR Xero Mock] Listing invoices with params:", params);

      let filtered = [...mockInvoices];

      if (params.status) {
        filtered = filtered.filter(
          (inv) => inv.status === params.status!.toUpperCase()
        );
      }

      if (params.contactIds && params.contactIds.length > 0) {
        filtered = filtered.filter((inv) =>
          params.contactIds!.includes(inv.contact.contactID)
        );
      }

      if (params.dateFrom) {
        filtered = filtered.filter((inv) => inv.dateString >= params.dateFrom!);
      }

      if (params.dateTo) {
        filtered = filtered.filter((inv) => inv.dateString <= params.dateTo!);
      }

      return filtered;
    },

    async markPaid(invoiceId, payment) {
      console.log("[AR Xero Mock] Marking invoice paid:", {
        invoiceId,
        payment,
      });

      const invoice = mockInvoices.find((inv) => inv.invoiceID === invoiceId);
      if (!invoice) {
        return { success: false, error: "Invoice not found" };
      }

      // In mock, we just simulate success
      return { success: true };
    },

    async listContacts(params) {
      console.log("[AR Xero Mock] Listing contacts with params:", params);

      let filtered = [...mockContacts];

      if (params?.isCustomer !== undefined) {
        filtered = filtered.filter(
          (contact) => contact.isCustomer === params.isCustomer
        );
      }

      if (params?.searchTerm) {
        const searchLower = params.searchTerm.toLowerCase();
        filtered = filtered.filter(
          (contact) =>
            contact.name.toLowerCase().includes(searchLower) ||
            contact.emailAddress?.toLowerCase().includes(searchLower)
        );
      }

      return filtered;
    },
  };
}
