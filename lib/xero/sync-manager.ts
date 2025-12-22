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
 * Progress callback type
 */
export type SyncProgress = (status: {
  type: "progress" | "error" | "complete";
  message: string;
  data?: any;
}) => void;

/**
 * Job status type
 */
export type JobStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "cancelled";

/**
 * Sync job interface
 */
export interface SyncJob {
  id: string;
  userId: string;
  tenantId: string;
  status: JobStatus;
  progress: number; // 0-100
  message: string;
  result?: SyncResult;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  abortController: AbortController;
}

/**
 * In-memory job store
 */
const jobStore = new Map<string, SyncJob>();

/**
 * Get a job by ID
 */
export function getSyncJob(jobId: string): SyncJob | undefined {
  return jobStore.get(jobId);
}

/**
 * Cancel a sync job
 */
export function cancelSyncJob(jobId: string): boolean {
  const job = jobStore.get(jobId);
  if (job && (job.status === "pending" || job.status === "running")) {
    job.status = "cancelled";
    job.message = "Cancelled by user";
    job.abortController.abort();
    return true;
  }
  return false;
}

/**
 * In-memory locks for active syncs (per tenant)
 */
const tenantLocks = new Set<string>();

/**
 * Main entry point to sync a tenant via queue
 */
export async function startSyncJob(
  userId: string,
  tenantId: string
): Promise<SyncJob> {
  const jobId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const abortController = new AbortController();

  const job: SyncJob = {
    id: jobId,
    userId,
    tenantId,
    status: "pending",
    progress: 0,
    message: "Waiting to start...",
    abortController,
  };

  jobStore.set(jobId, job);

  // Background execution
  (async () => {
    const lockKey = `${userId}:${tenantId}`;

    // Check lock
    if (tenantLocks.has(lockKey)) {
      job.status = "failed";
      job.error = "A sync is already in progress for this organisation.";
      return;
    }

    tenantLocks.add(lockKey);
    job.status = "running";
    job.startedAt = new Date();

    try {
      const result = await syncTenant(
        userId,
        tenantId,
        (progress) => {
          job.message = progress.message;
          // Map internal steps to 0-100 progress roughly
          if (progress.message.includes("contacts")) job.progress = 20;
          if (progress.message.includes("invoices")) job.progress = 50;
          if (progress.message.includes("payments")) job.progress = 80;
        },
        abortController.signal
      );

      if (job.status !== "cancelled") {
        job.status = "success";
        job.progress = 100;
        job.message = "Sync completed successfully";
        job.result = result;
      }
    } catch (error: any) {
      if (error.name === "AbortError" || job.status === "cancelled") {
        job.status = "cancelled";
      } else {
        job.status = "failed";
        job.error = error.message;
      }
    } finally {
      job.completedAt = new Date();
      tenantLocks.delete(lockKey);
      // Optional: Cleanup old jobs from memory after some time
    }
  })();

  return job;
}

/**
 * Core sync logic (Internal)
 */
async function syncTenant(
  userId: string,
  tenantId: string,
  onProgress?: SyncProgress,
  signal?: AbortSignal
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
    if (signal?.aborted) throw new Error("Sync cancelled");

    onProgress?.({ type: "progress", message: "Connecting to Xero..." });
    const { client, connection } = await getRobustXeroClient(userId, tenantId);

    // 1. Sync Contacts
    if (signal?.aborted) throw new Error("Sync cancelled");
    onProgress?.({ type: "progress", message: "Syncing contacts..." });
    result.contactsSynced = await syncContacts(client, tenantId);

    // 2. Sync Invoices
    if (signal?.aborted) throw new Error("Sync cancelled");
    onProgress?.({ type: "progress", message: "Syncing invoices..." });
    result.invoicesSynced = await syncInvoices(client, tenantId);

    // 3. Sync Payments
    if (signal?.aborted) throw new Error("Sync cancelled");
    onProgress?.({ type: "progress", message: "Syncing payments..." });
    result.paymentsSynced = await syncPayments(client, tenantId);

    // 4. Sync Credit Notes
    if (signal?.aborted) throw new Error("Sync cancelled");
    onProgress?.({ type: "progress", message: "Syncing credit notes..." });
    result.creditNotesSynced = await syncCreditNotes(client, tenantId);
  } catch (error: any) {
    if (error.name === "AbortError") throw error;
    console.error(`[Sync] error syncing tenant ${tenantId}:`, error);
    throw error;
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
