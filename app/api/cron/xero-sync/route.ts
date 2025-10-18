import { NextResponse } from "next/server";
import {
  cleanupJob,
  fullSyncJob,
  staleRefreshJob,
} from "@/lib/xero/sync-jobs";
import { processWebhookEvents } from "@/lib/xero/webhook-processor";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json(
      { error: "Cron secret not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const job = searchParams.get("job");

  try {
    switch (job) {
      case "full-sync":
        await fullSyncJob();
        break;
      case "cleanup":
        await cleanupJob();
        break;
      case "stale-refresh":
        await staleRefreshJob();
        break;
      case "process-webhooks":
        await processWebhookEvents();
        break;
      default:
        return NextResponse.json({ error: "Invalid job" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Cron job ${job} failed`, error);
    return NextResponse.json({ error: "Job failed" }, { status: 500 });
  }
}
