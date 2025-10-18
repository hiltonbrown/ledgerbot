import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db/queries";
import { xeroWebhookEvent } from "@/lib/db/schema";
import { invalidateCache } from "@/lib/xero/cache-manager";

const WEBHOOK_KEY = process.env.XERO_WEBHOOK_KEY || "";

function verifySignature(payload: string, signature: string): boolean {
  const hmac = crypto.createHmac("sha256", WEBHOOK_KEY);
  hmac.update(payload);
  return hmac.digest("base64") === signature;
}

function mapEventCategory(
  category: string
): "invoice" | "contact" | "account" | "bankTransaction" | null {
  switch (category.toUpperCase()) {
    case "INVOICE":
      return "invoice";
    case "CONTACT":
      return "contact";
    case "ACCOUNT":
      return "account";
    case "BANKTRANSACTION":
      return "bankTransaction";
    default:
      return null;
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-xero-signature");
    const payload = await request.text();

    if (!signature || !verifySignature(payload, signature)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = JSON.parse(payload) as { events: any[] };

    for (const event of data.events ?? []) {
      // Generate a unique eventId using a SHA-256 hash of the key fields
      const eventIdSource = `${event.tenantId}|${event.resourceId}|${event.eventDateUtc}`;
      const eventId = crypto.createHash("sha256").update(eventIdSource).digest("hex");
      await db.insert(xeroWebhookEvent).values({
        eventId,
        tenantId: event.tenantId,
        tenantType: event.tenantType,
        eventCategory: event.eventCategory,
        eventType: event.eventType,
        eventDateUtc: new Date(event.eventDateUtc),
        resourceId: event.resourceId,
        resourceUrl: event.resourceUrl,
        payload: event,
        processed: false,
      });

      const entityType = mapEventCategory(event.eventCategory);
      if (entityType) {
        await invalidateCache(event.tenantId, entityType, event.resourceId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Failed to handle webhook", error);
    return NextResponse.json(
      { error: "Failed to handle webhook" },
      { status: 500 }
    );
  }
}
