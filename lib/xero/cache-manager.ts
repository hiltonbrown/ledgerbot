import "server-only";

import { and, asc, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { db } from "@/lib/db/queries";
import {
  xeroAccountCache,
  xeroBankTransactionCache,
  xeroCacheSyncStatus,
  xeroContactCache,
  xeroInvoiceCache,
} from "@/lib/db/schema";

const CACHE_TTL = {
  invoices: 5 * 60 * 1000,
  contacts: 15 * 60 * 1000,
  accounts: 60 * 60 * 1000,
  bankTransactions: 5 * 60 * 1000,
} as const;

const STALE_THRESHOLD = {
  invoices: 2 * 60 * 1000,
  contacts: 10 * 60 * 1000,
  accounts: 30 * 60 * 1000,
  bankTransactions: 2 * 60 * 1000,
} as const;

export type EntityType =
  | "invoice"
  | "contact"
  | "account"
  | "bankTransaction";

export interface CacheFetchResult<T> {
  data: T[];
  fromCache: boolean;
  isStale: boolean;
}

function isStale(cachedAt: Date, threshold: number): boolean {
  const now = Date.now();
  return now - cachedAt.getTime() > threshold;
}

export async function getCachedInvoices(
  tenantId: string,
  filters?: {
    status?: string;
    contactId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }
): Promise<CacheFetchResult<any>> {
  const conditions = [eq(xeroInvoiceCache.tenantId, tenantId)];

  if (filters?.status) {
    conditions.push(eq(xeroInvoiceCache.status, filters.status));
  }

  if (filters?.contactId) {
    conditions.push(eq(xeroInvoiceCache.contactId, filters.contactId));
  }

  if (filters?.dateFrom) {
    conditions.push(gte(xeroInvoiceCache.date, filters.dateFrom));
  }

  if (filters?.dateTo) {
    conditions.push(lte(xeroInvoiceCache.date, filters.dateTo));
  }

  let query = db
    .select()
    .from(xeroInvoiceCache)
    .where(and(...conditions))
    .orderBy(desc(xeroInvoiceCache.date), desc(xeroInvoiceCache.cachedAt));

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const cached = await query;

  if (cached.length === 0) {
    return { data: [], fromCache: false, isStale: false };
  }

  const stale = cached.some((invoice) =>
    isStale(invoice.cachedAt, STALE_THRESHOLD.invoices)
  );

  return {
    data: cached.map((invoice) => invoice.data),
    fromCache: true,
    isStale: stale,
  };
}

export async function cacheInvoices(
  tenantId: string,
  invoices: any[]
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL.invoices);

  for (const invoice of invoices) {
    await db
      .insert(xeroInvoiceCache)
      .values({
        tenantId,
        invoiceId: invoice.invoiceID,
        invoiceNumber: invoice.invoiceNumber ?? null,
        data: invoice,
        cachedAt: now,
        lastModifiedAt: invoice.updatedDateUTC
          ? new Date(invoice.updatedDateUTC)
          : now,
        expiresAt,
        isStale: false,
        status: invoice.status ?? null,
        contactId: invoice.contact?.contactID ?? null,
        date: invoice.date ? new Date(invoice.date) : null,
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
        total: invoice.total ?? null,
        amountDue: invoice.amountDue ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [xeroInvoiceCache.tenantId, xeroInvoiceCache.invoiceId],
        set: {
          invoiceNumber: invoice.invoiceNumber ?? null,
          data: invoice,
          cachedAt: now,
          lastModifiedAt: invoice.updatedDateUTC
            ? new Date(invoice.updatedDateUTC)
            : now,
          expiresAt,
          isStale: false,
          status: invoice.status ?? null,
          contactId: invoice.contact?.contactID ?? null,
          date: invoice.date ? new Date(invoice.date) : null,
          dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
          total: invoice.total ?? null,
          amountDue: invoice.amountDue ?? null,
          updatedAt: now,
        },
      });
  }

  await updateSyncStatus(tenantId, "invoice", "success", invoices.length);
}

export async function getCachedContacts(
  tenantId: string,
  filters?: {
    searchTerm?: string;
    limit?: number;
  }
): Promise<CacheFetchResult<any>> {
  const conditions = [eq(xeroContactCache.tenantId, tenantId)];

  if (filters?.searchTerm) {
    conditions.push(
      or(
        ilike(xeroContactCache.name, `%${filters.searchTerm}%`),
        ilike(xeroContactCache.emailAddress, `%${filters.searchTerm}%`)
      )
    );
  }

  let query = db
    .select()
    .from(xeroContactCache)
    .where(and(...conditions))
    .orderBy(desc(xeroContactCache.cachedAt));

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const cached = await query;

  if (cached.length === 0) {
    return { data: [], fromCache: false, isStale: false };
  }

  const stale = cached.some((contact) =>
    isStale(contact.cachedAt, STALE_THRESHOLD.contacts)
  );

  return {
    data: cached.map((contact) => contact.data),
    fromCache: true,
    isStale: stale,
  };
}

export async function cacheContacts(
  tenantId: string,
  contacts: any[]
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL.contacts);

  for (const contact of contacts) {
    await db
      .insert(xeroContactCache)
      .values({
        tenantId,
        contactId: contact.contactID,
        data: contact,
        cachedAt: now,
        lastModifiedAt: contact.updatedDateUTC
          ? new Date(contact.updatedDateUTC)
          : now,
        expiresAt,
        isStale: false,
        name: contact.name ?? null,
        emailAddress: contact.emailAddress ?? null,
        contactStatus: contact.contactStatus ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [xeroContactCache.tenantId, xeroContactCache.contactId],
        set: {
          data: contact,
          cachedAt: now,
          lastModifiedAt: contact.updatedDateUTC
            ? new Date(contact.updatedDateUTC)
            : now,
          expiresAt,
          isStale: false,
          name: contact.name ?? null,
          emailAddress: contact.emailAddress ?? null,
          contactStatus: contact.contactStatus ?? null,
          updatedAt: now,
        },
      });
  }

  await updateSyncStatus(tenantId, "contact", "success", contacts.length);
}

export async function getCachedAccounts(
  tenantId: string,
  filters?: {
    type?: string;
  }
): Promise<CacheFetchResult<any>> {
  const conditions = [eq(xeroAccountCache.tenantId, tenantId)];

  if (filters?.type) {
    conditions.push(eq(xeroAccountCache.type, filters.type));
  }

  const cached = await db
    .select()
    .from(xeroAccountCache)
    .where(and(...conditions))
    .orderBy(asc(xeroAccountCache.code), desc(xeroAccountCache.cachedAt));

  if (cached.length === 0) {
    return { data: [], fromCache: false, isStale: false };
  }

  const stale = cached.some((account) =>
    isStale(account.cachedAt, STALE_THRESHOLD.accounts)
  );

  return {
    data: cached.map((account) => account.data),
    fromCache: true,
    isStale: stale,
  };
}

export async function cacheAccounts(
  tenantId: string,
  accounts: any[]
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL.accounts);

  for (const account of accounts) {
    await db
      .insert(xeroAccountCache)
      .values({
        tenantId,
        accountId: account.accountID,
        data: account,
        cachedAt: now,
        lastModifiedAt: account.updatedDateUTC
          ? new Date(account.updatedDateUTC)
          : now,
        expiresAt,
        isStale: false,
        code: account.code ?? null,
        name: account.name ?? null,
        type: account.type ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [xeroAccountCache.tenantId, xeroAccountCache.accountId],
        set: {
          data: account,
          cachedAt: now,
          lastModifiedAt: account.updatedDateUTC
            ? new Date(account.updatedDateUTC)
            : now,
          expiresAt,
          isStale: false,
          code: account.code ?? null,
          name: account.name ?? null,
          type: account.type ?? null,
          updatedAt: now,
        },
      });
  }

  await updateSyncStatus(tenantId, "account", "success", accounts.length);
}

export async function getCachedBankTransactions(
  tenantId: string,
  filters?: {
    bankAccountId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }
): Promise<CacheFetchResult<any>> {
  const conditions = [eq(xeroBankTransactionCache.tenantId, tenantId)];

  if (filters?.bankAccountId) {
    conditions.push(
      eq(xeroBankTransactionCache.bankAccountId, filters.bankAccountId)
    );
  }

  if (filters?.dateFrom) {
    conditions.push(gte(xeroBankTransactionCache.date, filters.dateFrom));
  }

  if (filters?.dateTo) {
    conditions.push(lte(xeroBankTransactionCache.date, filters.dateTo));
  }

  let query = db
    .select()
    .from(xeroBankTransactionCache)
    .where(and(...conditions))
    .orderBy(desc(xeroBankTransactionCache.date), desc(xeroBankTransactionCache.cachedAt));

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const cached = await query;

  if (cached.length === 0) {
    return { data: [], fromCache: false, isStale: false };
  }

  const stale = cached.some((transaction) =>
    isStale(transaction.cachedAt, STALE_THRESHOLD.bankTransactions)
  );

  return {
    data: cached.map((transaction) => transaction.data),
    fromCache: true,
    isStale: stale,
  };
}

export async function cacheBankTransactions(
  tenantId: string,
  transactions: any[]
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL.bankTransactions);

  for (const transaction of transactions) {
    await db
      .insert(xeroBankTransactionCache)
      .values({
        tenantId,
        bankTransactionId: transaction.bankTransactionID,
        data: transaction,
        cachedAt: now,
        lastModifiedAt: transaction.updatedDateUTC
          ? new Date(transaction.updatedDateUTC)
          : now,
        expiresAt,
        isStale: false,
        bankAccountId: transaction.bankAccount?.accountID ?? null,
        date: transaction.date ? new Date(transaction.date) : null,
        status: transaction.status ?? null,
        total: transaction.total ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          xeroBankTransactionCache.tenantId,
          xeroBankTransactionCache.bankTransactionId,
        ],
        set: {
          data: transaction,
          cachedAt: now,
          lastModifiedAt: transaction.updatedDateUTC
            ? new Date(transaction.updatedDateUTC)
            : now,
          expiresAt,
          isStale: false,
          bankAccountId: transaction.bankAccount?.accountID ?? null,
          date: transaction.date ? new Date(transaction.date) : null,
          status: transaction.status ?? null,
          total: transaction.total ?? null,
          updatedAt: now,
        },
      });
  }

  await updateSyncStatus(
    tenantId,
    "bankTransaction",
    "success",
    transactions.length
  );
}

export async function invalidateCache(
  tenantId: string,
  entityType: EntityType,
  resourceId?: string
): Promise<void> {
  const now = new Date();

  switch (entityType) {
    case "invoice": {
      const conditions = [eq(xeroInvoiceCache.tenantId, tenantId)];
      if (resourceId) {
        conditions.push(eq(xeroInvoiceCache.invoiceId, resourceId));
      }
      await db
        .update(xeroInvoiceCache)
        .set({ isStale: true, updatedAt: now })
        .where(and(...conditions));
      break;
    }
    case "contact": {
      const conditions = [eq(xeroContactCache.tenantId, tenantId)];
      if (resourceId) {
        conditions.push(eq(xeroContactCache.contactId, resourceId));
      }
      await db
        .update(xeroContactCache)
        .set({ isStale: true, updatedAt: now })
        .where(and(...conditions));
      break;
    }
    case "account": {
      const conditions = [eq(xeroAccountCache.tenantId, tenantId)];
      if (resourceId) {
        conditions.push(eq(xeroAccountCache.accountId, resourceId));
      }
      await db
        .update(xeroAccountCache)
        .set({ isStale: true, updatedAt: now })
        .where(and(...conditions));
      break;
    }
    case "bankTransaction": {
      const conditions = [eq(xeroBankTransactionCache.tenantId, tenantId)];
      if (resourceId) {
        conditions.push(
          eq(xeroBankTransactionCache.bankTransactionId, resourceId)
        );
      }
      await db
        .update(xeroBankTransactionCache)
        .set({ isStale: true, updatedAt: now })
        .where(and(...conditions));
      break;
    }
  }
}

export async function clearExpiredCache(): Promise<void> {
  const now = new Date();

  await Promise.all([
    db.delete(xeroInvoiceCache).where(lte(xeroInvoiceCache.expiresAt, now)),
    db.delete(xeroContactCache).where(lte(xeroContactCache.expiresAt, now)),
    db.delete(xeroAccountCache).where(lte(xeroAccountCache.expiresAt, now)),
    db
      .delete(xeroBankTransactionCache)
      .where(lte(xeroBankTransactionCache.expiresAt, now)),
  ]);
}

export async function getSyncStatus(
  tenantId: string,
  entityType?: EntityType
) {
  const conditions = [eq(xeroCacheSyncStatus.tenantId, tenantId)];
  if (entityType) {
    conditions.push(eq(xeroCacheSyncStatus.entityType, entityType));
  }

  return db
    .select()
    .from(xeroCacheSyncStatus)
    .where(and(...conditions));
}

async function updateSyncStatus(
  tenantId: string,
  entityType: EntityType,
  status: "success" | "failed",
  recordCount?: number,
  errorMessage?: string
) {
  const now = new Date();
  const updateData: Record<string, unknown> = {
    syncStatus: status,
    lastSyncAt: now,
    updatedAt: now,
  };

  if (status === "success") {
    updateData.lastSuccessAt = now;
    if (recordCount !== undefined) {
      updateData.recordCount = recordCount;
    }
  } else {
    updateData.lastFailureAt = now;
    updateData.errorMessage = errorMessage ?? null;
  }

  await db
    .insert(xeroCacheSyncStatus)
    .values({
      tenantId,
      entityType,
      ...updateData,
    })
    .onConflictDoUpdate({
      target: [xeroCacheSyncStatus.tenantId, xeroCacheSyncStatus.entityType],
      set: updateData,
    });
}
