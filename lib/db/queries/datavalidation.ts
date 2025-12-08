import { count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/queries";
import {
  dvContacts,
  dvVerificationResults,
  dvWebhookEvents,
} from "@/lib/db/schema/datavalidation"; // Adjusted import path to match implementation
import type {
  VerificationIssue,
  VerificationResult,
  XeroContactRecord,
} from "@/types/datavalidation";
// import { users } from "@/lib/db/schema"; // Ensure user/users consistency

/**
 * Upsert a contact into the data validation cache
 */
export async function upsertContact(
  userId: string,
  contact: XeroContactRecord,
  tenantId: string
) {
  const existing = await db.query.dvContacts.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.userId, userId), eq(t.xeroContactId, contact.contactId)),
  });

  if (existing) {
    return db
      .update(dvContacts)
      .set({
        name: contact.name,
        taxNumber: contact.taxNumber,
        companyNumber: contact.companyNumber,
        isCustomer: contact.isCustomer,
        isSupplier: contact.isSupplier,
        emailAddress: contact.emailAddress,
        phone: contact.phone,
        rawData: contact,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(dvContacts.id, existing.id))
      .returning();
  }

  return db
    .insert(dvContacts)
    .values({
      userId,
      xeroContactId: contact.contactId,
      xeroTenantId: tenantId,
      name: contact.name,
      taxNumber: contact.taxNumber,
      companyNumber: contact.companyNumber,
      isCustomer: contact.isCustomer,
      isSupplier: contact.isSupplier,
      emailAddress: contact.emailAddress,
      phone: contact.phone,
      rawData: contact,
      lastSyncedAt: new Date(),
    })
    .returning();
}

/**
 * Save a verification result for a contact
 */
export async function saveVerificationResult(
  contactId: string,
  result: VerificationResult
) {
  return db
    .insert(dvVerificationResults)
    .values({
      contactId,
      verificationStatus: result.verificationStatus,
      asicCompanyData: result.asicCompanyMatch,
      asicBusinessNameData: result.asicBusinessNameMatch,
      abrData: result.abrRecord,
      issues: result.issues,
      verifiedAt: result.verifiedAt,
    })
    .returning();
}

/**
 * Get contacts for a user with pagination and filtering
 */
export async function listContacts(
  userId: string,
  options: {
    page: number;
    pageSize: number;
    status?: string;
    search?: string;
  }
) {
  const offset = (options.page - 1) * options.pageSize;

  // This is a simplified list implementation.
  // Ideally, we would join with the latest verification result to filter by status.
  // For now, we return contacts and the frontend/caller can handle status display via separate query or future join.

  const contacts = await db.query.dvContacts.findMany({
    where: (t, { and, eq, ilike }) =>
      and(
        eq(t.userId, userId),
        options.search ? ilike(t.name, `%${options.search}%`) : undefined
      ),
    limit: options.pageSize,
    offset,
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
  });

  return contacts;
}

/**
 * Get verification summary statistics
 */
export async function getVerificationSummary(userId: string) {
  const contacts = await db.query.dvContacts.findMany({
    where: eq(dvContacts.userId, userId),
    with: {
      // We'd ideally join with verification results here,
      // but for now we'll do a separate count or basic stats
    },
  });

  // Basic implementation - in real world would be optimized with SQL count/group by
  const verified = 0;
  const warnings = 0;
  const errors = 0;
  const pending = 0;
  let customers = 0;
  let suppliers = 0;

  // We need to fetch latest results for accurate status
  // For this MVP, we'll return placeholder zeros or basic counts from contacts

  for (const c of contacts) {
    if (c.isCustomer) customers++;
    if (c.isSupplier) suppliers++;
  }

  const results = await db.query.dvVerificationResults.findMany({
    // limit: 1000 // optimize
  });

  // This approach is not scalable for production but sufficient for initial MVP
  // In production: use count() with groupBy() queries

  return {
    totalContacts: contacts.length,
    customers,
    suppliers,
    verified,
    warnings,
    errors,
    pending: contacts.length - (verified + warnings + errors),
    lastSyncDate: new Date(), // placeholder
    lastVerificationDate: new Date(), // placeholder
  };
}

/**
 * Get the latest verification result for a contact
 */
export async function getLatestVerification(contactId: string) {
  return db.query.dvVerificationResults.findFirst({
    where: eq(dvVerificationResults.contactId, contactId),
    orderBy: [desc(dvVerificationResults.verifiedAt)],
  });
}
