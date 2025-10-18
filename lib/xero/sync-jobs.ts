import "server-only";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { XeroClient } from "xero-node";
import {
  db,
  getXeroConnectionByTenant,
} from "@/lib/db/queries";
import {
  xeroConnection,
  xeroInvoiceCache,
} from "@/lib/db/schema";
import {
  cacheAccounts,
  cacheBankTransactions,
  cacheContacts,
  cacheInvoices,
  clearExpiredCache,
} from "@/lib/xero/cache-manager";
import { getConnectionSafe } from "@/lib/xero/connection-pool";
import { withXeroContext } from "@/lib/xero/request-context";

function createClient(connection: {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
}) {
  const client = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID || "",
    clientSecret: process.env.XERO_CLIENT_SECRET || "",
    redirectUris: [process.env.XERO_REDIRECT_URI || ""],
    scopes: connection.scopes,
  });

  client.setTokenSet({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    token_type: "Bearer",
    expires_in: Math.max(
      Math.floor((new Date(connection.expiresAt).getTime() - Date.now()) / 1000),
      0
    ),
  });

  return client;
}

export async function fullSyncJob(): Promise<void> {
  const connections = await db
    .select({ tenantId: xeroConnection.tenantId })
    .from(xeroConnection)
    .where(eq(xeroConnection.isActive, true));

  const uniqueTenantIds = Array.from(
    new Set(connections.map((connection) => connection.tenantId))
  );

  for (const tenantId of uniqueTenantIds) {
    await syncTenant(tenantId);
  }
}

async function syncTenant(tenantId: string) {
  const record = await getXeroConnectionByTenant(tenantId);

  if (!record) {
    return;
  }

  const connection = await getConnectionSafe(record.userId, record.tenantId);

  if (!connection) {
    return;
  }

  const client = createClient(connection);

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  await withXeroContext(
    {
      userId: record.userId,
      tenantId: record.tenantId,
      requestId: randomUUID(),
    },
    async () => {
      const invoiceResponse = await client.accountingApi.getInvoices(
        tenantId,
        undefined,
        `Date>=DateTime(${ninetyDaysAgo.toISOString().split("T")[0]})`
      );

      if (invoiceResponse.body.invoices) {
        await cacheInvoices(tenantId, invoiceResponse.body.invoices);
      }

      const contactResponse = await client.accountingApi.getContacts(tenantId);
      if (contactResponse.body.contacts) {
        await cacheContacts(tenantId, contactResponse.body.contacts);
      }

      const accountsResponse = await client.accountingApi.getAccounts(tenantId);
      if (accountsResponse.body.accounts) {
        await cacheAccounts(tenantId, accountsResponse.body.accounts);
      }

      const bankResponse = await client.accountingApi.getBankTransactions(
        tenantId
      );
      if (bankResponse.body.bankTransactions) {
        await cacheBankTransactions(
          tenantId,
          bankResponse.body.bankTransactions
        );
      }
    }
  );
}

export async function cleanupJob(): Promise<void> {
  await clearExpiredCache();
}

export async function staleRefreshJob(): Promise<void> {
  const rows = await db
    .select({ tenantId: xeroInvoiceCache.tenantId })
    .from(xeroInvoiceCache)
    .where(eq(xeroInvoiceCache.isStale, true));

  const uniqueTenantIds = Array.from(new Set(rows.map((row) => row.tenantId)));

  for (const tenantId of uniqueTenantIds) {
    await refreshStaleInvoices(tenantId);
  }
}

async function refreshStaleInvoices(tenantId: string) {
  const record = await getXeroConnectionByTenant(tenantId);

  if (!record) {
    return;
  }

  const connection = await getConnectionSafe(record.userId, record.tenantId);

  if (!connection) {
    return;
  }

  const client = createClient(connection);

  const staleInvoices = await db
    .select({ invoiceId: xeroInvoiceCache.invoiceId })
    .from(xeroInvoiceCache)
    .where(
      and(
        eq(xeroInvoiceCache.tenantId, tenantId),
        eq(xeroInvoiceCache.isStale, true)
      )
    )
    .limit(50);

  if (staleInvoices.length === 0) {
    return;
  }

  const ids = staleInvoices.map((invoice) => invoice.invoiceId).join(",");

  await withXeroContext(
    {
      userId: record.userId,
      tenantId: record.tenantId,
      requestId: randomUUID(),
    },
    async () => {
      const response = await client.accountingApi.getInvoices(
        tenantId,
        undefined,
        undefined,
        undefined,
        ids
      );

      if (response.body.invoices) {
        await cacheInvoices(tenantId, response.body.invoices);
      }
    }
  );
}
