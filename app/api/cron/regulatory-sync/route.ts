import { NextResponse } from "next/server";
import { runScrapingJob } from "../../../../lib/regulatory/scraper";

// Configure route for Vercel cron jobs
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds max duration

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  console.log("⏰ Scheduled regulatory sync started");

  try {
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
      status: job.status,
    });
  } catch (error) {
    console.error("❌ Scheduled sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Scheduled sync failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
