import "server-only";

import { randomUUID } from "crypto";
import { and, asc, eq, isNull, lte, or } from "drizzle-orm";
import { XeroClient } from "xero-node";
import {
  db,
  getXeroConnectionByTenant,
} from "@/lib/db/queries";
import { xeroWebhookEvent } from "@/lib/db/schema";
import {
  cacheAccounts,
  cacheBankTransactions,
  cacheContacts,
  cacheInvoices,
} from "@/lib/xero/cache-manager";
import { getConnectionSafe } from "@/lib/xero/connection-pool";
import { withXeroContext } from "@/lib/xero/request-context";
import type { DecryptedXeroConnection } from "@/lib/xero/types";

function createClient(connection: DecryptedXeroConnection) {
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

const MAX_RETRY_ATTEMPTS = 5;

export async function processWebhookEvents(): Promise<void> {
  const now = new Date();

  const events = await db
    .select()
    .from(xeroWebhookEvent)
    .where(
      and(
        eq(xeroWebhookEvent.processed, false),
        or(
          isNull(xeroWebhookEvent.nextAttemptAt),
          lte(xeroWebhookEvent.nextAttemptAt, now)
        )
      )
    )
    .orderBy(asc(xeroWebhookEvent.createdAt))
    .limit(100);

  for (const event of events) {
    try {
      await processEvent(event);

      await db
        .update(xeroWebhookEvent)
        .set({
          processed: true,
          processedAt: new Date(),
          processingError: null,
          retryCount: 0,
          nextAttemptAt: null,
        })
        .where(eq(xeroWebhookEvent.id, event.id));
    } catch (error) {
      const retryCount = event.retryCount + 1;
      const message =
        error instanceof Error ? error.message : "Unknown error";

      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        await db
          .update(xeroWebhookEvent)
          .set({
            processed: true,
            processedAt: new Date(),
            processingError: message,
            retryCount,
            nextAttemptAt: null,
          })
          .where(eq(xeroWebhookEvent.id, event.id));
      } else {
        const delaySeconds = Math.min(2 ** retryCount, 300);
        const nextAttemptAt = new Date(
          Date.now() + delaySeconds * 1000
        );

        await db
          .update(xeroWebhookEvent)
          .set({
            processed: false,
            processedAt: new Date(),
            processingError: message,
            retryCount,
            nextAttemptAt,
          })
          .where(eq(xeroWebhookEvent.id, event.id));
      }
    }
  }
}

async function processEvent(event: typeof xeroWebhookEvent.$inferSelect) {
  const record = await getXeroConnectionByTenant(event.tenantId);

  if (!record) {
    return;
  }

  const connection = await getConnectionSafe(record.userId, record.tenantId);

  if (!connection) {
    return;
  }

  const client = createClient(connection);

  await withXeroContext(
    {
      userId: record.userId,
      tenantId: record.tenantId,
      requestId: randomUUID(),
    },
    async () => {
      switch (event.eventCategory.toUpperCase()) {
        case "INVOICE": {
          const response = await client.accountingApi.getInvoice(
            event.tenantId,
            event.resourceId
          );
          if (response.body.invoices) {
            await cacheInvoices(event.tenantId, response.body.invoices);
          }
          break;
        }
        case "CONTACT": {
          const response = await client.accountingApi.getContact(
            event.tenantId,
            event.resourceId
          );
          if (response.body.contacts) {
            await cacheContacts(event.tenantId, response.body.contacts);
          }
          break;
        }
        case "ACCOUNT": {
          const response = await client.accountingApi.getAccounts(
            event.tenantId
          );
          if (response.body.accounts) {
            await cacheAccounts(event.tenantId, response.body.accounts);
          }
          break;
        }
        case "BANKTRANSACTION": {
          const response = await client.accountingApi.getBankTransaction(
            event.tenantId,
            event.resourceId
          );
          if (response.body.bankTransactions) {
            await cacheBankTransactions(
              event.tenantId,
              response.body.bankTransactions
            );
          }
          break;
        }
        case "PAYMENT": {
          const response = await client.accountingApi.getPayment(
            event.tenantId,
            event.resourceId
          );
          const payment = response.body.payments?.[0];

          if (payment?.invoice?.invoiceID) {
            const invoice = await client.accountingApi.getInvoice(
              event.tenantId,
              payment.invoice.invoiceID
            );
            if (invoice.body.invoices) {
              await cacheInvoices(event.tenantId, invoice.body.invoices);
            }
          }
          break;
        }
        default:
          break;
      }
    }
  );
}
