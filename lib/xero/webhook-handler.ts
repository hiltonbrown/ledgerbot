import crypto from "node:crypto";
import {
  db,
  getXeroConnectionByTenantIdSystem,
} from "@/lib/db/queries";
import {
  deleteContact,
  upsertContact,
} from "@/lib/db/queries/datavalidation";
import { webhookEvents } from "@/lib/db/schema/datavalidation";
import { getRobustXeroClient } from "@/lib/xero/client-helpers";
import type { XeroContactRecord } from "@/types/datavalidation";
import { eq } from "drizzle-orm";

export interface XeroWebhookEvent {
  resourceUrl: string;
  resourceId: string;
  tenantId: string;
  tenantType: string;
  eventCategory: string; // CONTACT, INVOICE
  eventType: string; // CREATE, UPDATE
  eventDateUtc: string;
}

export interface XeroWebhookPayload {
  events: XeroWebhookEvent[];
  firstEventSequence: number;
  lastEventSequence: number;
  entropy: string;
}

/**
 * Verify the Xero Webhook Signature
 * @param rawBody - The raw string body of the request
 * @param signature - The x-xero-signature header
 * @param webhookKey - The Xero Webhook Key from environment
 */
export function verifyXeroWebhookSignature(
  rawBody: string,
  signature: string,
  webhookKey: string
): boolean {
  const hmac = crypto
    .createHmac("sha256", webhookKey)
    .update(rawBody)
    .digest("base64");
  return hmac === signature;
}

/**
 * Process a Xero Webhook Payload
 * @param payload - The parsed JSON payload
 */
export async function processWebhookPayload(payload: XeroWebhookPayload) {
  console.log(`[Xero Webhook] Processing ${payload.events.length} events`);

  const results = await Promise.allSettled(
    payload.events.map(async (event) => {
      // 1. Idempotency Check (optional, but good for retries)
      // Since we don't have a unique event ID from Xero (only sequence + entropy implies uniqueness for the batch),
      // we can use (resourceId, eventDateUtc, eventType) as a proxy, or just process it.
      // We will log it first.

      try {
        await db.insert(webhookEvents).values({
          resourceId: event.resourceId,
          xeroTenantId: event.tenantId,
          eventType: event.eventType,
          eventCategory: event.eventCategory,
          payload: event,
          processedAt: new Date(),
        });

        // 2. Dispatch to specific handlers based on Category
        if (event.eventCategory === "CONTACT") {
          await handleContactEvent(event);
        } else if (event.eventCategory === "INVOICE") {
            // Placeholder for Prompt 3 extension
            console.log("[Xero Webhook] Invoice event received:", { resourceId: event.resourceId });
        }
      } catch (error) {
        console.error("[Xero Webhook] Error processing event:", { resourceId: event.resourceId, error });
        throw error;
      }
    })
  );

  return results;
}

async function handleContactEvent(event: XeroWebhookEvent) {
  console.log(
    "[Xero Webhook] Contact event:",
    { eventType: event.eventType, resourceId: event.resourceId }
  );

  // 1. Get Connection
  const connection = await getXeroConnectionByTenantIdSystem(event.tenantId);
  if (!connection) {
    console.warn(
      "[Xero Webhook] No active connection for tenant. Skipping.",
      { tenantId: event.tenantId }
    );
    return;
  }

  // 2. Handle Logic
  try {
    const { client } = await getRobustXeroClient(
      connection.userId,
      event.tenantId
    );
    const { body } = await client.accountingApi.getContact(
      event.tenantId,
      event.resourceId
    );

    const c = body.contacts?.[0];

    // If contact not found or ARCHIVED, treat as delete
    if (!c || String(c.contactStatus) === "ARCHIVED") {
      await deleteContact(event.tenantId, event.resourceId);
      console.log(
        "[Xero Webhook] Deleted/Archived contact",
        { resourceId: event.resourceId }
      );
      return;
    }

    const record: XeroContactRecord = {
      contactId: c.contactID!,
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

    await upsertContact(connection.userId, record, event.tenantId);
    console.log("[Xero Webhook] Synced contact", { resourceId: event.resourceId });
  } catch (err) {
    console.error(
      "[Xero Webhook] Failed to sync contact",
      { resourceId: event.resourceId, error: err }
    );
    throw err;
  }
}
