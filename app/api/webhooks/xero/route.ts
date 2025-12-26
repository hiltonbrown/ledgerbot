import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  processWebhookPayload,
  verifyXeroWebhookSignature,
  type XeroWebhookPayload,
} from "@/lib/xero/webhook-handler";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const headersList = await headers();
    const signature = headersList.get("x-xero-signature");

    if (!process.env.XERO_WEBHOOK_KEY) {
      console.error("XERO_WEBHOOK_KEY is not set");
      return NextResponse.json(
        { error: "Configuration Error" },
        { status: 500 }
      );
    }

    if (!signature) {
      return NextResponse.json({ error: "Missing Signature" }, { status: 401 });
    }

    const isValid = verifyXeroWebhookSignature(
      rawBody,
      signature,
      process.env.XERO_WEBHOOK_KEY
    );

    if (!isValid) {
      console.warn("Invalid Xero Webhook Signature");
      return NextResponse.json({ error: "Invalid Signature" }, { status: 401 });
    }

    // Process payload
    const payload: XeroWebhookPayload = JSON.parse(rawBody);
    
    // We process asynchronously to respond quickly to Xero (they expect 200 OK within 5s)
    // In Vercel serverless, we should use waitUntil if available or keep it simple.
    // For critical data consistency, we should await. Xero's timeout is generous enough for simple DB inserts.
    // If we do heavy fetching, we should offload to a queue (Inngest/bull/etc).
    // For this prototype/CLI context, we await to ensure it runs.
    
    await processWebhookPayload(payload);

    return NextResponse.json({ status: "OK" });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
