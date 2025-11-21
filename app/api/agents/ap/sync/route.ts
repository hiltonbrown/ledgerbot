import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getActiveXeroConnection } from "@/lib/db/queries";
import { executeXeroMCPTool } from "@/lib/ai/xero-mcp-client";
import { upsertContacts, upsertBills } from "@/lib/db/queries/ap";
import type { ApContactInsert, ApBillInsert } from "@/lib/db/schema/ap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/agents/ap/sync
 * Sync bills and payments from Xero for the current user
 */
export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check for active Xero connection
    const xeroConnection = await getActiveXeroConnection(user.id);
    if (!xeroConnection) {
      return NextResponse.json(
        {
          success: false,
          error: "No active Xero connection found. Please connect to Xero first.",
        },
        { status: 400 }
      );
    }

    console.log("[AP Sync] Starting sync for user:", user.id);

    // Step 1: Fetch suppliers (ACCPAY contacts)
    const contactsResult = await executeXeroMCPTool(
      user.id,
      "xero_list_contacts",
      { limit: 1000 }
    );

    const contactsData = JSON.parse(contactsResult.content[0].text);
    console.log("[AP Sync] Fetched contacts:", contactsData.contacts?.length || 0);

    // Filter for suppliers (IsSupplier = true)
    const suppliers = contactsData.contacts?.filter(
      (c: { isSupplier?: boolean }) => c.isSupplier
    ) || [];

    // Step 2: Upsert suppliers to database
    const supplierInserts: Omit<ApContactInsert, "userId">[] = suppliers.map(
      (supplier: {
        contactID: string;
        name: string;
        emailAddress?: string;
        phone?: string;
        taxNumber?: string;
        contactStatus?: string;
      }) => ({
        name: supplier.name,
        email: supplier.emailAddress,
        phone: supplier.phone,
        abn: supplier.taxNumber,
        externalRef: supplier.contactID,
        status:
          supplier.contactStatus === "ACTIVE"
            ? ("active" as const)
            : ("inactive" as const),
        riskLevel: "low" as const,
        metadata: {},
      })
    );

    const upsertedSuppliers = await upsertContacts(user.id, supplierInserts);
    console.log("[AP Sync] Upserted suppliers:", upsertedSuppliers.length);

    // Create a map of externalRef to contactId
    const supplierMap = new Map<string, string>();
    for (const supplier of upsertedSuppliers) {
      if (supplier.externalRef) {
        supplierMap.set(supplier.externalRef, supplier.id);
      }
    }

    // Step 3: Fetch bills (ACCPAY invoices)
    const billsResult = await executeXeroMCPTool(user.id, "xero_list_invoices", {
      invoiceType: "ACCPAY",
      limit: 1000,
    });

    const billsData = JSON.parse(billsResult.content[0].text);
    console.log("[AP Sync] Fetched bills:", billsData.invoices?.length || 0);

    // Step 4: Upsert bills to database
    const billInserts: Omit<ApBillInsert, "userId">[] = [];

    for (const bill of billsData.invoices || []) {
      const contactId = supplierMap.get(bill.contact?.contactID);
      if (!contactId) {
        console.warn("[AP Sync] Skipping bill - supplier not found:", bill.invoiceNumber);
        continue;
      }

      // Map Xero status to our status
      let status: string = "draft";
      if (bill.status === "PAID") {
        status = "paid";
      } else if (bill.status === "AUTHORISED") {
        status = "approved";
      } else if (bill.status === "VOIDED") {
        status = "cancelled";
      }

      // Calculate days overdue
      const dueDate = new Date(bill.dueDate || bill.date);
      const isOverdue = dueDate < new Date() && status !== "paid";

      billInserts.push({
        contactId,
        number: bill.invoiceNumber || bill.invoiceID,
        reference: bill.reference,
        issueDate: new Date(bill.date),
        dueDate,
        currency: bill.currencyCode || "AUD",
        subtotal: bill.subTotal?.toString() || "0",
        tax: bill.totalTax?.toString() || "0",
        total: bill.total?.toString() || "0",
        amountPaid: bill.amountPaid?.toString() || "0",
        status: isOverdue && status === "approved" ? "overdue" : status,
        approvalStatus: status === "approved" || status === "paid" ? "approved" : "pending",
        hasAttachment: false,
        externalRef: bill.invoiceID,
        lineItems: bill.lineItems?.map((item: {
          description?: string;
          accountCode?: string;
          quantity?: number;
          unitAmount?: number;
          lineAmount?: number;
          taxType?: string;
          taxAmount?: number;
        }) => ({
          description: item.description || "",
          accountCode: item.accountCode,
          quantity: item.quantity || 1,
          unitAmount: item.unitAmount || 0,
          lineAmount: item.lineAmount || 0,
          taxType: item.taxType,
          taxAmount: item.taxAmount || 0,
        })) || [],
        metadata: {},
      });
    }

    const upsertedBills = await upsertBills(user.id, billInserts);
    console.log("[AP Sync] Upserted bills:", upsertedBills.length);

    return NextResponse.json({
      success: true,
      summary: {
        suppliersSync: upsertedSuppliers.length,
        billsSync: upsertedBills.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[AP Sync API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to sync AP data from Xero",
      },
      { status: 500 }
    );
  }
}
