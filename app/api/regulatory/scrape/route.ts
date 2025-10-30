import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getRecentScrapingJobs } from "@/lib/db/queries";
import { runScrapingJob } from "@/lib/regulatory/scraper";

/**
 * POST /api/regulatory/scrape
 * Triggers a new regulatory document scraping job
 */
export async function POST(request: Request) {
  try {
    // Require authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`🔐 User ${user.id} triggered scraping job`);

    // Parse request body
    const body = await request.json();
    const { country, category, priority, force } = body;

    console.log("📋 Scraping job parameters:", {
      country,
      category,
      priority,
      force,
    });

    // Build filters
    const filters: {
      country?: string;
      category?: string;
      priority?: string;
    } = {};

    if (country) {
      filters.country = country;
    }
    if (category) {
      filters.category = category;
    }
    if (priority) {
      filters.priority = priority;
    }

    // Run scraping job
    console.log("🚀 Starting scraping job...");
    const job = await runScrapingJob(filters);

    console.log(`✅ Scraping job completed: ${job.id}`);
    console.log(`📊 Status: ${job.status}`);
    console.log(`📊 Documents scraped: ${job.documentsScraped}`);
    console.log(`📊 Documents updated: ${job.documentsUpdated}`);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      documentsScraped: job.documentsScraped,
      documentsUpdated: job.documentsUpdated,
      documentsArchived: job.documentsArchived,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
    });
  } catch (error) {
    console.error("❌ Error in scraping job:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/regulatory/scrape
 * Returns recent scraping jobs
 */
export async function GET() {
  try {
    // Require authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`🔐 User ${user.id} requested recent scraping jobs`);

    // Get recent jobs
    const jobs = await getRecentScrapingJobs(20);

    console.log(`📊 Returning ${jobs.length} recent scraping jobs`);

    return NextResponse.json({
      jobs,
    });
  } catch (error) {
    console.error("❌ Error fetching scraping jobs:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
