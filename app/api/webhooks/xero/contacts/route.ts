import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";

// Webhook key from Xero Developer Portal
const WEBHOOK_KEY = process.env.XERO_WEBHOOK_KEY;

function verifySignature(payload: string, signature: string, key: string) {
  const hmac = crypto.createHmac("sha256", key);
  hmac.update(payload);
  const calculatedSignature = hmac.digest("base64");
  return calculatedSignature === signature;
}

export async function POST(req: NextRequest) {
  if (!WEBHOOK_KEY) {
    console.error("XERO_WEBHOOK_KEY is not set");
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  const signature = req.headers.get("x-xero-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const rawBody = await req.text();

  if (!verifySignature(rawBody, signature, WEBHOOK_KEY)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse events
  // Events structure: { events: [], firstEventSequence: 123, lastEventSequence: 124, entropy: "..." }
  const payload = JSON.parse(rawBody);
  const events = payload.events || [];

  console.log(`Received ${events.length} Xero webhook events`);

  // We only care about Contact events
  // EventTypes: CREATE, UPDATE
  // ResourceType: Contact
  const contactEvents = events.filter((e: any) => e.resourceType === "Contact");

  if (contactEvents.length > 0) {
    // Process asynchronously to avoid timeout
    // In a real app, this should go to a queue (Inngest/bullmq)
    // For this MVP, we'll try to process immediately but catch errors

    const distinctTenantIds = new Set(
      contactEvents.map((e: any) => e.tenantId)
    );

    // We need a userId to associate these with.
    // Webhooks don't carry userId. We map tenantId -> userId via XeroConnection table.
    // For now, we'll assume we can resolve it or we have a synced cache.
    // This part is tricky without a Tenant->User mapping service.

    // Implementation Note:
    // We should really just queue a "SyncContacts" job for this tenant.
    // But let's look up the contact directly from Xero API using the ID and tenantID.

    for (const event of contactEvents) {
      try {
        // TODO: resolving connection using tenantId
        // const connection = await db.query.xeroConnection.findFirst({ where: eq(tenantId, event.tenantId) });
        // if (!connection) continue;

        // const xero = await getXeroClient();
        // xero.setTokenSet(connection.tokenSet);
        // const contact = await xero.accountingApi.getContact(event.tenantId, event.resourceId);

        // await upsertContact(connection.userId, mapXeroToRecord(contact), event.tenantId);

        console.log(
          `Processing contact event: ${event.eventType} for ${event.resourceId}`
        );
      } catch (err) {
        console.error(
          "Failed to process webhook event for contact %s",
          event.resourceId,
          err
        );
      }
    }
  }

  return NextResponse.json({ status: "success" });
}
