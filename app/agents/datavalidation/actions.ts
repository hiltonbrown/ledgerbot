"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/queries"; // Import from queries now
import {
  getLatestVerification,
  getVerificationSummary,
  listContacts,
  saveVerificationResult,
  upsertContact,
} from "@/lib/db/queries/datavalidation";
import { dvContacts } from "@/lib/db/schema/datavalidation";
import { verificationService } from "@/lib/services/verification-service";

// import { auth } from "@clerk/nextjs"; // Or internal auth helper

// Mock user ID getter for now, replace with actual auth
const getUserId = async () => "user_123";

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
