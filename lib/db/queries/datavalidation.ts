import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/queries";
import {
  dvContacts,
  dvVerificationResults,
  webhookEvents,
} from "@/lib/db/schema/datavalidation"; // Adjusted import path to match implementation
import type {
  VerificationResult,
  XeroContactRecord,
} from "@/types/datavalidation";
// ... (rest of imports)

// ... (rest of file)

/**
 * Get all contact IDs for a tenant (for reconciliation)
 */
export async function getAllContactIds(tenantId: string) {
  const result = await db.query.dvContacts.findMany({
    where: eq(dvContacts.xeroTenantId, tenantId),
    columns: {
      xeroContactId: true,
    },
  });
  return result.map((r) => r.xeroContactId);
}

/**
 * Get the last webhook event for a tenant
 */
export async function getLastWebhookEvent(tenantId: string) {
  return db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.xeroTenantId, tenantId),
    orderBy: [desc(webhookEvents.createdAt)],
  });
}

// import { users } from "@/lib/db/schema"; // Ensure user/users consistency

/**
 * Upsert a contact into the data validation cache
 */
export async function upsertContact(
  userId: string,
  contact: XeroContactRecord,
  tenantId: string
) {
  // Check for existing contact by Tenant + XeroID (Natural Key)
  const existing = await db.query.dvContacts.findFirst({
    where: (t, { and, eq }) =>
      and(
        eq(t.xeroTenantId, tenantId),
        eq(t.xeroContactId, contact.contactId)
      ),
  });

  if (existing) {
    return db
      .update(dvContacts)
      .set({
        userId, // Update last modifier
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
 * Get contacts for a user with pagination and filtering, scoped to a tenant
 */
export async function listContacts(
  userId: string,
  tenantId: string,
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
        eq(t.xeroTenantId, tenantId),
        options.search ? ilike(t.name, `%${options.search}%`) : undefined
      ),
    limit: options.pageSize,
    offset,
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
  });

  return contacts;
}

/**
 * Get verification summary statistics for a specific tenant
 */
export async function getVerificationSummary(userId: string, tenantId: string) {
  const contacts = await db.query.dvContacts.findMany({
    where: (t, { eq }) => eq(t.xeroTenantId, tenantId),
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

/**
 * Hard delete a contact
 */
export async function deleteContact(tenantId: string, xeroContactId: string) {
  return db
    .delete(dvContacts)
    .where(
      and(
        eq(dvContacts.xeroTenantId, tenantId),
        eq(dvContacts.xeroContactId, xeroContactId)
      )
    )
    .returning();
}


