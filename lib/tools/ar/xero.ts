/**
 * Xero integration for AR agent with deterministic mocks
 */

import "server-only";

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

    // CRITICAL FIX: Pass the full connection object, not just tenantId
    return getRealXeroProvider(connection);
  } catch (error) {
    console.error(
      "[AR Xero] Error getting connection, falling back to mock:",
      error
    );
    return getMockXeroProvider();
  }
}

/**
 * Create real Xero provider with proper pagination and error handling
 * CRITICAL: Must initialize XeroClient with actual tokens from connection
 */
function getRealXeroProvider(
  connection: import("@/lib/xero/types").DecryptedXeroConnection
): XeroProvider {
  // Import xero-node dynamically to avoid build issues when not configured
  const { XeroClient } = require("xero-node");

  // CRITICAL FIX: Create client with proper configuration
  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    redirectUris: [process.env.XERO_REDIRECT_URI!],
    scopes: ["accounting.transactions", "accounting.contacts"],
    httpTimeout: 10_000, // 10 seconds
  });

  // CRITICAL FIX: Initialize client and set tokens before ANY API calls
  let initialized = false;
  const ensureInitialized = async () => {
    if (!initialized) {
      await xero.initialize();
      await xero.setTokenSet({
        access_token: connection.accessToken,
        refresh_token: connection.refreshToken,
        token_type: "Bearer",
        expires_in: Math.floor(
          (new Date(connection.expiresAt).getTime() - Date.now()) / 1000
        ),
      });
      initialized = true;
      console.log("[AR Xero] Client initialized with active tokens");
    }
  };

  /**
   * Helper to format ISO date to Xero DateTime format
   * @param isoDate - Date string in ISO format (YYYY-MM-DD)
   * @returns Xero DateTime format (YYYY,MM,DD)
   */
  const formatXeroDate = (isoDate: string): string => {
    const datePart = isoDate.split("T")[0].trim();
    return datePart.replace(/-/g, ",");
  };

  /**
   * Paginate through Xero API results
   */
  const paginateResults = async <T>(
    fetchPage: (page: number) => Promise<T[]>
  ): Promise<T[]> => {
    const allResults: T[] = [];
    let currentPage = 1;
    let consecutiveEmptyPages = 0;
    const MAX_CONSECUTIVE_EMPTY = 2;
    const MAX_PAGES = 100;

    while (currentPage <= MAX_PAGES) {
      try {
        const pageResults = await fetchPage(currentPage);

        if (!pageResults || pageResults.length === 0) {
          consecutiveEmptyPages++;
          if (consecutiveEmptyPages >= MAX_CONSECUTIVE_EMPTY) {
            break;
          }
        } else {
          consecutiveEmptyPages = 0;
          allResults.push(...pageResults);
        }

        currentPage++;
      } catch (error) {
        console.error(`[AR Xero] Error fetching page ${currentPage}:`, error);
        // Return what we have so far rather than failing completely
        if (allResults.length > 0) {
          console.warn(
            `[AR Xero] Returning ${allResults.length} results collected before error`
          );
          break;
        }
        throw error;
      }
    }

    return allResults;
  };

  return {
    isUsingMock: false,

    async listInvoices(params) {
      try {
        // CRITICAL FIX: Ensure client is initialized before ANY API calls
        await ensureInitialized();

        const where = [];

        // CRITICAL FIX: Always filter for ACCREC (customer invoices) in AR context
        where.push('Type=="ACCREC"');

        if (params.status) {
          where.push(`Status=="${params.status.toUpperCase()}"`);
        }
        if (params.contactIds && params.contactIds.length > 0) {
          const contactFilter = params.contactIds
            .map((id) => `Contact.ContactID==Guid("${id}")`)
            .join(" OR ");
          where.push(`(${contactFilter})`);
        }

        // CRITICAL FIX: Use proper Xero DateTime format
        if (params.dateFrom) {
          where.push(`Date>=DateTime(${formatXeroDate(params.dateFrom)})`);
        }
        if (params.dateTo) {
          where.push(`Date<=DateTime(${formatXeroDate(params.dateTo)})`);
        }

        const whereClause = where.length > 0 ? where.join(" AND ") : undefined;

        console.log(`[AR Xero] Fetching invoices with WHERE: ${whereClause}`);

        // CRITICAL FIX: Use pagination to get ALL invoices, not just first page
        const allInvoices = await paginateResults<XeroInvoice>(async (page) => {
          const response = await xero.accountingApi.getInvoices(
            connection.tenantId,
            undefined, // ifModifiedSince
            whereClause, // where
            undefined, // order
            undefined, // IDs
            undefined, // invoiceNumbers
            undefined, // contactIDs
            undefined, // statuses
            page, // page number
            undefined, // includeArchived
            undefined, // createdByMyApp
            undefined, // unitdp
            undefined, // summaryOnly
            100 // pageSize
          );

          // Transform Xero API invoices to our format
          return (response.body.invoices || []).map((inv: any) => ({
            invoiceID: inv.invoiceID || "",
            invoiceNumber: inv.invoiceNumber || "",
            type: inv.type || "",
            contact: {
              contactID: inv.contact?.contactID || "",
              name: inv.contact?.name || "",
              emailAddress: inv.contact?.emailAddress,
              phones: inv.contact?.phones,
            },
            dateString: inv.date
              ? new Date(inv.date).toISOString().split("T")[0]
              : "",
            dueDateString: inv.dueDate
              ? new Date(inv.dueDate).toISOString().split("T")[0]
              : "",
            status: inv.status || "",
            lineAmountTypes: inv.lineAmountTypes || "",
            subTotal: inv.subTotal || 0,
            totalTax: inv.totalTax || 0,
            total: inv.total || 0,
            amountDue: inv.amountDue || 0,
            amountPaid: inv.amountPaid || 0,
            currencyCode: inv.currencyCode || "AUD",
          }));
        });

        console.log(`[AR Xero] Retrieved ${allInvoices.length} total invoices`);
        return allInvoices;
      } catch (error) {
        console.error("[AR Xero] Error listing invoices:", error);
        throw new Error(
          `Failed to list invoices from Xero: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },

    async markPaid(invoiceId, payment) {
      try {
        // CRITICAL FIX: Ensure client is initialized before ANY API calls
        await ensureInitialized();

        const paymentData = {
          invoice: { invoiceID: invoiceId },
          account: { code: "200" }, // Default bank account
          date: payment.date,
          amount: payment.amount,
          reference: payment.reference,
        };

        const response = await xero.accountingApi.createPayment(
          connection.tenantId,
          paymentData
        );

        // Validate response
        if (!response.body.payments || response.body.payments.length === 0) {
          return {
            success: false,
            error: "Payment creation returned no results",
          };
        }

        const createdPayment = response.body.payments[0];
        if (createdPayment.hasValidationErrors) {
          return {
            success: false,
            error: `Validation errors: ${JSON.stringify(createdPayment.validationErrors)}`,
          };
        }

        console.log(
          `[AR Xero] Successfully created payment for invoice ${invoiceId}`
        );
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
        // CRITICAL FIX: Ensure client is initialized before ANY API calls
        await ensureInitialized();

        const where = [];
        if (params?.isCustomer) {
          where.push("IsCustomer==true");
        }

        const whereClause = where.length > 0 ? where.join(" AND ") : undefined;

        console.log(`[AR Xero] Fetching contacts with WHERE: ${whereClause}`);

        // CRITICAL FIX: Use pagination to get ALL contacts
        const allContacts = await paginateResults<XeroContact>(async (page) => {
          const response = await xero.accountingApi.getContacts(
            connection.tenantId,
            undefined, // ifModifiedSince
            whereClause, // where
            undefined, // order
            undefined, // IDs
            page, // page number
            undefined, // includeArchived
            undefined, // summaryOnly
            params?.searchTerm, // searchTerm
            100 // pageSize
          );

          return (response.body.contacts || []) as XeroContact[];
        });

        console.log(`[AR Xero] Retrieved ${allContacts.length} total contacts`);
        return allContacts;
      } catch (error) {
        console.error("[AR Xero] Error listing contacts:", error);
        throw new Error(
          `Failed to list contacts from Xero: ${error instanceof Error ? error.message : "Unknown error"}`
        );
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
          (inv) => inv.status === params.status?.toUpperCase()
        );
      }

      if (params.contactIds && params.contactIds.length > 0) {
        filtered = filtered.filter((inv) =>
          params.contactIds?.includes(inv.contact.contactID)
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
