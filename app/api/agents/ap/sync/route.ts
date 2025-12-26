import { generateText } from "ai";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { myProvider } from "@/lib/ai/providers";
import { executeXeroMCPTool } from "@/lib/ai/xero-mcp-client";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  db,
  getActiveXeroConnection,
  updateConnectionLastSyncedAt,
} from "@/lib/db/queries";
import {
  createCommsArtefact,
  upsertBills,
  upsertContacts,
} from "@/lib/db/queries/ap";
import type { ApBill, ApBillInsert, ApContactInsert } from "@/lib/db/schema/ap";
import { apBill, apContact } from "@/lib/db/schema/ap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/agents/ap/sync
 * Production-ready sync for bills and suppliers from Xero
 */
export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const xeroConnection = await getActiveXeroConnection(user.id);
    if (!xeroConnection) {
      return NextResponse.json(
        {
          success: false,
          error: "No active Xero connection found.",
        },
        { status: 400 }
      );
    }

    const tenantId = xeroConnection.tenantId;
    const lastSyncedAt = xeroConnection.lastSyncedAt;
    const ifModifiedSince = lastSyncedAt
      ? lastSyncedAt.toISOString()
      : undefined;

    console.log(`[AP Sync] Syncing tenant ${tenantId} for user ${user.id}`);

    // 1. Fetch updated contacts from Xero
    const contactsResult = await executeXeroMCPTool(
      user.id,
      "xero_list_contacts",
      {
        ifModifiedSince,
        limit: 1000,
      }
    );

    const contacts = JSON.parse(contactsResult.content[0].text);
    const suppliers = Array.isArray(contacts)
      ? contacts.filter((c: any) => c.isSupplier)
      : [];

    // 2. Upsert suppliers
    const supplierInserts: Omit<ApContactInsert, "userId" | "tenantId">[] =
      suppliers.map((s: any) => ({
        name: s.name,
        email: s.emailAddress,
        phone: s.phone,
        abn: s.taxNumber?.replace(/\s/g, ""),
        externalRef: s.contactID,
        status: s.contactStatus === "ACTIVE" ? "active" : "inactive",
        riskLevel: "low",
        xeroUpdatedDateUtc: s.updatedDateUTC
          ? new Date(s.updatedDateUTC)
          : new Date(),
        xeroModifiedDateUtc: s.updatedDateUTC
          ? new Date(s.updatedDateUTC)
          : new Date(),
        metadata: {},
      }));

    const upsertedSuppliers = await upsertContacts(
      user.id,
      tenantId,
      supplierInserts
    );

    // 3. Build comprehensive contact map (externalRef -> internalId) for this tenant
    // This avoids N+1 queries during bill processing
    const supplierMap = new Map<string, string>();
    const allContacts = await db
      .select({ id: apContact.id, externalRef: apContact.externalRef })
      .from(apContact)
      .where(eq(apContact.tenantId, tenantId));

    for (const c of allContacts) {
      if (c.externalRef) supplierMap.set(c.externalRef, c.id);
    }

    // 4. Fetch updated bills (ACCPAY) from Xero
    const billsResult = await executeXeroMCPTool(
      user.id,
      "xero_list_invoices",
      {
        invoiceType: "ACCPAY",
        ifModifiedSince,
        limit: 1000,
      }
    );

    const bills = JSON.parse(billsResult.content[0].text);
    const billList = Array.isArray(bills) ? bills : [];

    // 5. Pre-fetch existing bills for commentary change detection
    const billXeroIds = billList.map((b: any) => b.invoiceID);
    const existingBillsMap = new Map<string, ApBill>();

    if (billXeroIds.length > 0) {
      const CHUNK_SIZE = 500;
      for (let i = 0; i < billXeroIds.length; i += CHUNK_SIZE) {
        const chunk = billXeroIds.slice(i, i + CHUNK_SIZE);
        const existing = await db
          .select()
          .from(apBill)
          .where(
            and(
              eq(apBill.tenantId, tenantId),
              inArray(apBill.externalRef, chunk)
            )
          );
        for (const b of existing) {
          if (b.externalRef) existingBillsMap.set(b.externalRef, b);
        }
      }
    }

    // 6. Process and Upsert Bills
    const billInserts: Omit<ApBillInsert, "userId" | "tenantId">[] = [];
    const billsToCheckForCommentary: {
      newBill: any;
      oldBill: ApBill | undefined;
    }[] = [];

    for (const bill of billList) {
      const contactId = supplierMap.get(bill.contact?.contactID);
      if (!contactId) continue;

      let status = "draft";
      if (bill.status === "PAID") status = "paid";
      else if (bill.status === "AUTHORISED") status = "approved";
      else if (bill.status === "VOIDED") status = "cancelled";

      const dueDate = new Date(bill.dueDate || bill.date);
      const isOverdue = dueDate < new Date() && status !== "paid";

      const billInsert = {
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
        approvalStatus:
          status === "approved" || status === "paid" ? "approved" : "pending",
        hasAttachment: bill.hasAttachments || false,
        externalRef: bill.invoiceID,
        xeroUpdatedDateUtc: bill.updatedDateUTC
          ? new Date(bill.updatedDateUTC)
          : new Date(),
        xeroModifiedDateUtc: bill.updatedDateUTC
          ? new Date(bill.updatedDateUTC)
          : new Date(),
        lineItems:
          bill.lineItems?.map((item: any) => ({
            description: item.description || "",
            accountCode: item.accountCode,
            quantity: item.quantity || 1,
            unitAmount: item.unitAmount || 0,
            lineAmount: item.lineAmount || 0,
            taxType: item.taxType,
            taxAmount: item.taxAmount || 0,
          })) || [],
        metadata: {},
      };

      billInserts.push(billInsert);
      billsToCheckForCommentary.push({
        newBill: billInsert,
        oldBill: existingBillsMap.get(bill.invoiceID),
      });
    }

    const upsertedBills = await upsertBills(user.id, tenantId, billInserts);

    // 7. Generate Commentary
    let commentaryCount = 0;
    const MAX_COMMENTARY_UPDATES = 20;

    for (const { newBill, oldBill } of billsToCheckForCommentary) {
      if (commentaryCount >= MAX_COMMENTARY_UPDATES) break;

      let shouldRegenerate = !oldBill;
      if (oldBill) {
        if (newBill.status !== oldBill.status) shouldRegenerate = true;
        const oldTotal = Number.parseFloat(oldBill.total);
        const newTotal = Number.parseFloat(newBill.total);
        if (oldTotal > 0 && Math.abs((newTotal - oldTotal) / oldTotal) > 0.05)
          shouldRegenerate = true;
      }

      if (shouldRegenerate) {
        const targetBill = upsertedBills.find(
          (b) => b.externalRef === newBill.externalRef
        );
        if (targetBill) {
          await regenerateCommentary(user.id, targetBill);
          commentaryCount++;
        }
      }
    }

    await updateConnectionLastSyncedAt(xeroConnection.id, new Date());

    return NextResponse.json({
      success: true,
      summary: {
        suppliersSync: upsertedSuppliers.length,
        billsSync: upsertedBills.length,
        commentaryUpdates: commentaryCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[AP Sync API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync AP data." },
      { status: 500 }
    );
  }
}

async function regenerateCommentary(userId: string, bill: ApBill) {
  try {
    const { text: commentary } = await generateText({
      model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
      system:
        "You are an expert accounts payable analyst. Generate a brief, professional commentary.",
      prompt: `Analyze this bill:
      Amount: ${bill.total} ${bill.currency}
      Due: ${bill.dueDate instanceof Date ? bill.dueDate.toDateString() : String(bill.dueDate)}
      Status: ${bill.status}
      Paid: ${bill.amountPaid}`,
    });

    await createCommsArtefact({
      userId,
      billId: bill.id,
      contactId: bill.contactId,
      purpose: "internal_commentary",
      channel: "system",
      body: commentary,
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    console.error(`[AP Sync] Commentary failed for ${bill.id}:`, error);
  }
}
