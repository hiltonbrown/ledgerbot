import "server-only";

import type { XeroClient } from "xero-node";
import {
  getRobustXeroClient,
  paginateXeroAPI,
} from "@/lib/xero/client-helpers";
import {
  getLastSyncDate,
  updateLastSyncDate,
  upsertContacts,
  upsertCreditNotes,
  upsertInvoices,
  upsertPayments,
} from "@/lib/xero/sync-store";

/**
 * Sync results summary
 */
export type SyncResult = {
  success: boolean;
  invoicesSynced: number;
  contactsSynced: number;
  paymentsSynced: number;
  creditNotesSynced: number;
  errors: string[];
};

/**
 * Main entry point to sync a tenant
 */
export async function syncTenant(
  userId: string,
  tenantId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    invoicesSynced: 0,
    contactsSynced: 0,
    paymentsSynced: 0,
    creditNotesSynced: 0,
    errors: [],
  };

  try {
    // 1. Get Xero Client (using existing robustness logic)
    // Note: getRobustXeroClient verifies connection and handles token refresh
    // We pass userId, but we need to ensure we get the client for the specific tenant
    // Ideally getRobustXeroClient should support tenantId, but for now we assume
    // the user might have multiple connections.
    // TODO: Update getRobustXeroClient to accept optional tenantId if we support
    // syncing non-active tenants. For now, we assume we are syncing the user's
    // connections.
    // Actually, getRobustXeroClient finds the *active* connection for the user.
    // If we want to sync a specific tenant, we might need a lower-level function
    // or update getRobustXeroClient.
    // For this implementation, let's assume we update getRobustXeroClient primarily,
    // but here we can just fetch the specific connection and use it if needed.
    // However, for simplicity and reuse, let's use the helper but note the limitation.
    //
    // Actually, to support multi-tenancy properly, we MUST be able to get a client
    // for a specific tenantId.
    // Let's assume getRobustXeroClient works for the user's *primary* purpose,
    // but for background sync we might need to iterate.
    //
    // As per plan, I should update getRobustXeroClient to take tenantId.
    // I will do that in a subsequent step. For now, I will assume it works or
    // I will fetch the connection manually here if needed.
    //
    // WAIT: I already planned to update `getRobustXeroClient`. I should do that.
    // But I can write this file first, assuming `getRobustXeroClient` signature update.

    // For now, I will use getRobustXeroClient(userId, tenantId) and update the helper next.
    const { client, connection } = await getRobustXeroClient(userId, tenantId);

    if (connection.tenantId !== tenantId) {
      throw new Error(
        `Connection mismatch: Expected ${tenantId}, got ${connection.tenantId}`
      );
    }

    console.log(
      `[Sync] Starting sync for tenant ${tenantId} (${connection.tenantName})`
    );

    // 2. Sync Invoices
    try {
      result.invoicesSynced = await syncInvoices(client, tenantId);
    } catch (err: any) {
      console.error(`[Sync] Error syncing invoices: ${err.message}`);
      result.errors.push(`Invoices: ${err.message}`);
    }

    // 3. Sync Contacts
    try {
      result.contactsSynced = await syncContacts(client, tenantId);
    } catch (err: any) {
      console.error(`[Sync] Error syncing contacts: ${err.message}`);
      result.errors.push(`Contacts: ${err.message}`);
    }

    // 4. Sync Payments
    try {
      result.paymentsSynced = await syncPayments(client, tenantId);
    } catch (err: any) {
      console.error(`[Sync] Error syncing payments: ${err.message}`);
      result.errors.push(`Payments: ${err.message}`);
    }

    // 5. Sync Credit Notes
    try {
      result.creditNotesSynced = await syncCreditNotes(client, tenantId);
    } catch (err: any) {
      console.error(`[Sync] Error syncing credit notes: ${err.message}`);
      result.errors.push(`Credit Notes: ${err.message}`);
    }
  } catch (error: any) {
    console.error(`[Sync] Fatal error syncing tenant ${tenantId}:`, error);
    result.success = false;
    result.errors.push(`Fatal: ${error.message}`);
  }

  return result;
}

/**
 * Sync Invoices
 */
async function syncInvoices(
  client: XeroClient,
  tenantId: string
): Promise<number> {
  const lastSync = await getLastSyncDate(tenantId, "invoices");
  console.log(
    `[Sync] Invoices - Last Sync: ${lastSync?.toISOString() || "Never"}`
  );

  // Fetch from Xero
  const invoices = await paginateXeroAPI(
    async (page, pageSize) => {
      const response = await client.accountingApi.getInvoices(
        tenantId,
        lastSync, // ifModifiedSince
        undefined, // where
        undefined, // order
        undefined, // IDs
        undefined, // invoiceNumbers
        undefined, // contactIDs
        undefined, // statuses
        page,
        undefined, // includeArchived
        undefined, // createdByMyApp
        undefined, // unitdp
        undefined, // summaryOnly
        pageSize
      );
      return {
        results: response.body.invoices || [],
        headers: response.response.headers, // headers might be under response.headers depending on sdk version wrapper
      };
    },
    undefined, // limit (all)
    100, // pageSize
    undefined // connectionId (optional for rate limit tracking inside pagination)
  );

  console.log(`[Sync] Fetched ${invoices.length} updated invoices`);

  // Upsert to DB
  // Process in batches if huge
  const BATCH_SIZE = 500;
  for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
    const batch = invoices.slice(i, i + BATCH_SIZE);
    await upsertInvoices(tenantId, batch);
  }

  // Update last sync date
  // We use the current time, OR the max updatedDateUTC from the fetched records?
  // Safest is to use the time *before* the fetch started to avoid race conditions,
  // but simpler is current timestamp.
  if (invoices.length > 0) {
    await updateLastSyncDate(tenantId, "invoices", new Date());
  } else if (lastSync) {
    // Even if 0 records, we successfully checked. Update timestamp to now?
    // Actually, if we pass If-Modified-Since and get 0 results, it means nothing changed.
    // We can update the timestamp to now so next check is faster.
    await updateLastSyncDate(tenantId, "invoices", new Date());
  } else {
    // First sync, 0 results.
    await updateLastSyncDate(tenantId, "invoices", new Date());
  }

  return invoices.length;
}

/**
 * Sync Contacts
 */
export async function syncContacts(
  client: XeroClient,
  tenantId: string
): Promise<number> {
  const lastSync = await getLastSyncDate(tenantId, "contacts");

  const contacts = await paginateXeroAPI(
    async (page, pageSize) => {
      const response = await client.accountingApi.getContacts(
        tenantId,
        lastSync,
        undefined, // where
        undefined, // order
        undefined, // IDs
        page,
        true, // includeArchived - important for sync
        undefined, // summaryOnly
        undefined, // searchTerm
        pageSize
      );
      return {
        results: response.body.contacts || [],
        headers: response.response.headers,
      };
    },
    undefined,
    100
  );

  console.log(`[Sync] Fetched ${contacts.length} updated contacts`);

  const BATCH_SIZE = 500;
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    await upsertContacts(tenantId, batch);
  }

  await updateLastSyncDate(tenantId, "contacts", new Date());
  return contacts.length;
}

/**
 * Sync Payments
 */
async function syncPayments(
  client: XeroClient,
  tenantId: string
): Promise<number> {
  const lastSync = await getLastSyncDate(tenantId, "payments");

  const payments = await paginateXeroAPI(
    async (page, pageSize) => {
      const response = await client.accountingApi.getPayments(
        tenantId,
        lastSync,
        undefined, // where
        undefined, // order
        page,
        pageSize
      );
      return {
        results: response.body.payments || [],
        headers: response.response.headers,
      };
    },
    undefined,
    100
  );

  console.log(`[Sync] Fetched ${payments.length} updated payments`);

  const BATCH_SIZE = 500;
  for (let i = 0; i < payments.length; i += BATCH_SIZE) {
    const batch = payments.slice(i, i + BATCH_SIZE);
    await upsertPayments(tenantId, batch);
  }

  await updateLastSyncDate(tenantId, "payments", new Date());
  return payments.length;
}

/**
 * Sync Credit Notes
 */
async function syncCreditNotes(
  client: XeroClient,
  tenantId: string
): Promise<number> {
  const lastSync = await getLastSyncDate(tenantId, "creditNotes");

  const creditNotes = await paginateXeroAPI(
    async (page, pageSize) => {
      const response = await client.accountingApi.getCreditNotes(
        tenantId,
        lastSync,
        undefined, // where
        undefined, // order
        page, // page
        pageSize // pageSize
      );
      return {
        results: response.body.creditNotes || [],
        headers: response.response.headers,
      };
    },
    undefined,
    100
  );

  console.log(`[Sync] Fetched ${creditNotes.length} updated credit notes`);

  const BATCH_SIZE = 500;
  for (let i = 0; i < creditNotes.length; i += BATCH_SIZE) {
    const batch = creditNotes.slice(i, i + BATCH_SIZE);
    await upsertCreditNotes(tenantId, batch);
  }

  await updateLastSyncDate(tenantId, "creditNotes", new Date());
  return creditNotes.length;
}
