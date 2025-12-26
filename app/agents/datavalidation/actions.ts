"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, db as drizzleDb } from "@/lib/db/queries";
import {
  deleteContact,
  getAllContactIds,
  getLastWebhookEvent,
  getLatestVerification,
  getVerificationSummary,
  listContacts,
  saveVerificationResult,
  upsertContact,
} from "@/lib/db/queries/datavalidation";
import { dvContacts } from "@/lib/db/schema/datavalidation";
import { verificationService } from "@/lib/services/verification-service";
import {
  getRobustXeroClient,
  paginateXeroAPI,
} from "@/lib/xero/client-helpers";
import type { XeroContactRecord } from "@/types/datavalidation";

// import { auth } from "@clerk/nextjs"; // Or internal auth helper

// Mock user ID getter for now, replace with actual auth
import { requireAuth } from "@/lib/auth/clerk-helpers";
import { getXeroConnectionByTenantId } from "@/lib/db/queries";

// Get authenticated user ID
const getUserId = async () => {
  const user = await requireAuth();
  return user.id;
};

export async function syncContactsAction(tenantId: string) {
  try {
    const userId = await getUserId();
    // We trust the tenantId passed from the client, but getRobustXeroClient will verify access/ownership
    const { client } = await getRobustXeroClient(userId, tenantId);

    const seenContactIds = new Set<string>();
    let upsertCount = 0;

    // 1. Fetch ALL contacts from Xero (active only)
    const contacts = await paginateXeroAPI(
      async (page) => {
        const response = await client.accountingApi.getContacts(
          tenantId,
          undefined, // ifModifiedSince (we want all for reconciliation)
          undefined, // where
          undefined, // order
          undefined, // IDs
          page,
          false, // includeArchived = false (we want to delete archived/missing)
          undefined, // summaryOnly
          undefined, // searchTerm
          100 // pageSize
        );
        return {
          results: response.body.contacts || [],
          headers: response.response.headers,
        };
      },
      undefined, // limit (all)
      100 // pageSize
    );

    // Upsert batch
    const promises = contacts.map(async (c) => {
      if (!c.contactID) return;
      seenContactIds.add(c.contactID);

      const record: XeroContactRecord = {
        contactId: c.contactID,
        name: c.name || "Unknown",
        isCustomer: c.isCustomer || false,
        isSupplier: c.isSupplier || false,
        emailAddress: c.emailAddress,
        taxNumber: c.taxNumber,
        companyNumber: c.companyNumber,
        phone: c.phones?.[0]?.phoneNumber,
        addresses: c.addresses?.map((a) => ({
          addressType: String(a.addressType),
          addressLine1: a.addressLine1,
          city: a.city,
          region: a.region,
          postalCode: a.postalCode,
          country: a.country,
        })),
      };
      await upsertContact(userId, record, tenantId);
      upsertCount++;
    });
    await Promise.all(promises);

    // 2. Identify and Delete Missing Contacts
    // Fetch all local contact IDs for this tenant
    const localContactIds = await getAllContactIds(tenantId);
    let deletedCount = 0;

    for (const localId of localContactIds) {
      if (!seenContactIds.has(localId)) {
        await deleteContact(tenantId, localId);
        deletedCount++;
      }
    }

    console.log(
      `[Sync] Tenant ${tenantId}: Upserted ${upsertCount}, Deleted ${deletedCount}`
    );

    revalidatePath("/agents/datavalidation");
    return { success: true, count: upsertCount, deleted: deletedCount };
  } catch (error) {
    console.error("Sync failed:", error);
    return { success: false, error: "Sync failed" };
  }
}

export async function bulkVerifyContactsAction(tenantId: string) {
  try {
    const userId = await getUserId();
    
    // Security check
    const connection = await getXeroConnectionByTenantId(userId, tenantId);
    if (!connection) {
       return { success: false, error: "Unauthorized access to tenant" };
    }

    // 1. Fetch all contacts for this tenant (Shared Cache)
    const contacts = await drizzleDb.query.dvContacts.findMany({
      where: (t, { eq }) => eq(t.xeroTenantId, tenantId),
    });

    if (contacts.length === 0) {
      return { success: true, count: 0, message: "No contacts to verify" };
    }

    let processedCount = 0;
    const errors: string[] = [];

    // 2. Process in chunks to avoid overwhelming the system
    const CHUNK_SIZE = 10;
    for (let i = 0; i < contacts.length; i += CHUNK_SIZE) {
      const chunk = contacts.slice(i, i + CHUNK_SIZE);

      // We are waiting for the chunk to complete
      await Promise.all(
        chunk.map(async (contact) => {
          try {
            if (!contact.rawData) return;

            // Run verification logic
            const result = await verificationService.verifyContact(
              contact.rawData as any
            );

            // Save result
            await saveVerificationResult(contact.id, result);
            processedCount++;
          } catch (err) {
            console.error(`Failed to verify contact ${contact.id}:`, err);
            errors.push(`Failed contact ${contact.id}`);
          }
        })
      );
    }

    revalidatePath("/agents/datavalidation");

    return {
      success: true,
      count: processedCount,
      total: contacts.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Bulk verification failed:", error);
    return { success: false, error: "Bulk verification failed" };
  }
}

export async function verifyContactAction(
  tenantId: string,
  contactId: string
) {
  try {
    const userId = await getUserId();
    // Security check
    const connection = await getXeroConnectionByTenantId(userId, tenantId);
    if (!connection) {
       return { success: false, error: "Unauthorized access to tenant" };
    }

    // 1. Fetch contact from DB
    const contactRecord = await db.query.dvContacts.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.xeroTenantId, tenantId), eq(t.xeroContactId, contactId)),
    });

    if (!contactRecord || !contactRecord.rawData) {
      return { success: false, error: "Contact not found" };
    }

    // 2. Run verification
    const result = await verificationService.verifyContact(
      contactRecord.rawData as any
    );

    // 3. Save result
    await saveVerificationResult(contactRecord.id, result);

    revalidatePath("/agents/datavalidation");
    return { success: true, data: result };
  } catch (error) {
    console.error("Verification failed:", error);
    return { success: false, error: "Verification failed" };
  }
}

export async function getDashboardData(
  tenantId: string,
  page = 1,
  search = ""
) {
  const userId = await getUserId();
  
  // Security check
  const connection = await getXeroConnectionByTenantId(userId, tenantId);
  if (!connection) {
      // In a server action used for data fetching, we might want to return empty structure or throw
      // For now, throw so UI Error Boundary catches it, or return empty
      throw new Error("Unauthorized access to tenant");
  }

  const stats = await getVerificationSummary(userId, tenantId);
  const lastWebhook = await getLastWebhookEvent(tenantId);

  const contactList = await listContacts(userId, tenantId, {
    page,
    pageSize: 50,
    search,
  });

  // Enrich contacts with latest verification
  const enrichedContacts = await Promise.all(
    contactList.map(async (c) => {
      const verification = await getLatestVerification(c.id);
      return {
        contact: c.rawData as any,
        verification: verification
          ? {
              ...verification,
              // Cast JSON types back to specific types if needed
              verificationStatus: verification.verificationStatus as any,
              issues: verification.issues as any,
              asicCompanyMatch: verification.asicCompanyData as any,
              abrRecord: verification.abrData as any,
            }
          : undefined,
        updatedAt: c.updatedAt || new Date(),
      };
    })
  );

  return {
    stats: {
        ...stats,
        lastWebhookReceived: lastWebhook?.createdAt || null,
    },
    contacts: enrichedContacts,
  };
}
