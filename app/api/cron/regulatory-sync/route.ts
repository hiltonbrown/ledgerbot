import { NextResponse } from "next/server";
import { runScrapingJob } from "@/lib/regulatory/scraper";

/**
 * GET /api/cron/regulatory-sync
 * Scheduled job for syncing high-priority Australian regulatory documents
 *
 * This endpoint should be called by a cron service (e.g., Vercel Cron)
 * Authorization: Bearer token in CRON_SECRET environment variable
 */
export async function GET(request: Request) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (authHeader !== expectedAuth) {
      console.log("❌ Unauthorized cron request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("⏰ Scheduled regulatory sync started");

    // Run scraping job for high-priority Australian sources
    const job = await runScrapingJob({
      country: "AU",
      priority: "high",
    });

    console.log(
      `✅ Scheduled sync completed: ${job.documentsScraped} scraped, ${job.documentsUpdated} updated`
    );

    return NextResponse.json({
      success: true,
      jobId: job.id,
      documentsScraped: job.documentsScraped,
      documentsUpdated: job.documentsUpdated,
      documentsArchived: job.documentsArchived,
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    console.error("❌ Scheduled sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
