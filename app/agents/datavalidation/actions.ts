"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, db as drizzleDb } from "@/lib/db/queries";
import {
  getLatestVerification,
  getVerificationSummary,
  listContacts,
  saveVerificationResult,
  upsertContact,
} from "@/lib/db/queries/datavalidation";
import { xeroContact } from "@/lib/db/schema";
import { dvContacts } from "@/lib/db/schema/datavalidation";
import { verificationService } from "@/lib/services/verification-service";
import { getRobustXeroClient } from "@/lib/xero/client-helpers";
import { getDecryptedConnection } from "@/lib/xero/connection-manager";
import { syncContacts } from "@/lib/xero/sync-manager";
import type { XeroContactRecord } from "@/types/datavalidation";

// import { auth } from "@clerk/nextjs"; // Or internal auth helper

// Mock user ID getter for now, replace with actual auth
import { requireAuth } from "@/lib/auth/clerk-helpers";

// Get authenticated user ID
const getUserId = async () => {
  const user = await requireAuth();
  return user.id;
};

export async function syncContactsAction() {
  try {
    const userId = await getUserId();
    const connection = await getDecryptedConnection(userId);

    if (!connection) {
      return { success: false, error: "No Xero connection found" };
    }

    // 1. Sync from Xero to Generic Cache (XeroContact table)
    const { client } = await getRobustXeroClient(userId);
    const count = await syncContacts(client, connection.tenantId);

    // 2. Map Generic Cache to Agent Cache (dv_contacts)
    // We fetch all contacts for this tenant from Generic Cache
    const genericContacts = await drizzleDb.query.xeroContact.findMany({
      where: eq(xeroContact.tenantId, connection.tenantId),
    });

    if (genericContacts.length > 0) {
      // Transform and Upsert into Data Validation Cache
      const batchPromises = genericContacts.map(async (c) => {
        const record: XeroContactRecord = {
          contactId: c.xeroId,
          name: c.name || "Unknown",
          isCustomer: c.isCustomer || false,
          isSupplier: c.isSupplier || false,
          emailAddress: c.email || undefined,
          taxNumber: (c.data as any).taxNumber || undefined,
          companyNumber: (c.data as any).companyNumber || undefined,
          phone: (c.data as any).phones?.[0]?.phoneNumber || undefined,
          addresses: (c.data as any).addresses,
        };
        return upsertContact(userId, record, connection.tenantId);
      });

      await Promise.all(batchPromises);
    }

    revalidatePath("/agents/datavalidation");
    return { success: true, count };
  } catch (error) {
    console.error("Sync failed:", error);
    return { success: false, error: "Sync failed" };
  }
}

export async function bulkVerifyContactsAction() {
  try {
    const userId = await getUserId();

    // 1. Fetch all contacts for this user
    const contacts = await drizzleDb.query.dvContacts.findMany({
      where: eq(dvContacts.userId, userId),
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

export async function verifyContactAction(contactId: string) {
  try {
    // 1. Fetch contact from DB
    const contactRecord = await db.query.dvContacts.findFirst({
      where: eq(dvContacts.xeroContactId, contactId),
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

export async function getDashboardData(page = 1, search = "") {
  const userId = await getUserId(); // TODO: Use real auth

  const stats = await getVerificationSummary(userId);
  const contactList = await listContacts(userId, {
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
    stats,
    contacts: enrichedContacts,
  };
}
