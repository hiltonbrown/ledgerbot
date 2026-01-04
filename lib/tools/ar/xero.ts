/**
 * Xero integration for AR agent
 */

import "server-only";

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
 * Get Xero provider - real only, no mock fallback
 */
export async function getXeroProvider(userId: string): Promise<XeroProvider> {
  const hasCredentials =
    process.env.XERO_CLIENT_ID &&
    process.env.XERO_CLIENT_SECRET &&
    process.env.XERO_REDIRECT_URI;

  if (!hasCredentials) {
    throw new Error(
      "Xero API credentials are not configured. Please check environment variables."
    );
  }

  try {
    const connection = await getDecryptedConnection(userId);
    if (!connection) {
      throw new Error(
        "No active Xero connection found. Please connect your Xero organisation in settings."
      );
    }

    return getRealXeroProvider(connection);
  } catch (error) {
    console.error("[AR Xero] Error getting connection:", error);
    throw error;
  }
}

/**
 * Create real Xero provider with proper pagination and error handling
 */
function getRealXeroProvider(
  connection: import("@/lib/xero/types").DecryptedXeroConnection
): XeroProvider {
  // Import xero-node dynamically to avoid build issues when not configured
  const { XeroClient } = require("xero-node");

  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    redirectUris: [process.env.XERO_REDIRECT_URI!],
    scopes: ["accounting.transactions", "accounting.contacts"],
    httpTimeout: 10_000, // 10 seconds
  });

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

  const formatXeroDate = (isoDate: string): string => {
    const datePart = isoDate.split("T")[0].trim();
    return datePart.replace(/-/g, ",");
  };

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
        throw error; // Throw immediately, do not return partial results
      }
    }

    return allResults;
  };

  return {
    isUsingMock: false,

    async listInvoices(params) {
      try {
        await ensureInitialized();

        const where = [];
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

        if (params.dateFrom) {
          where.push(`Date>=DateTime(${formatXeroDate(params.dateFrom)})`);
        }
        if (params.dateTo) {
          where.push(`Date<=DateTime(${formatXeroDate(params.dateTo)})`);
        }

        const whereClause = where.length > 0 ? where.join(" AND ") : undefined;

        const allInvoices = await paginateResults<XeroInvoice>(async (page) => {
          const response = await xero.accountingApi.getInvoices(
            connection.tenantId,
            undefined,
            whereClause,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            page,
            undefined,
            undefined,
            undefined,
            undefined,
            100
          );

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

        return allInvoices;
      } catch (error) {
        console.error("[AR Xero] Error listing invoices:", error);
        throw error;
      }
    },

    async markPaid(invoiceId, payment) {
      try {
        await ensureInitialized();

        const paymentData = {
          invoice: { invoiceID: invoiceId },
          account: { code: "200" },
          date: payment.date,
          amount: payment.amount,
          reference: payment.reference,
        };

        const response = await xero.accountingApi.createPayment(
          connection.tenantId,
          paymentData
        );

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
        await ensureInitialized();

        const where = [];
        if (params?.isCustomer) {
          where.push("IsCustomer==true");
        }

        const whereClause = where.length > 0 ? where.join(" AND ") : undefined;

        const allContacts = await paginateResults<XeroContact>(async (page) => {
          const response = await xero.accountingApi.getContacts(
            connection.tenantId,
            undefined,
            whereClause,
            undefined,
            undefined,
            page,
            undefined,
            undefined,
            params?.searchTerm,
            100
          );

          return (response.body.contacts || []) as XeroContact[];
        });

        return allContacts;
      } catch (error) {
        console.error("[AR Xero] Error listing contacts:", error);
        throw error;
      }
    },
  };
}
