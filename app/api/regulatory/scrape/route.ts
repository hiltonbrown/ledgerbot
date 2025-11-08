import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../lib/auth/clerk-helpers";
import { getRecentScrapingJobs } from "../../../../lib/db/queries";
import { runScrapingJob } from "../../../../lib/regulatory/scraper";

/**
 * @swagger
 * /api/regulatory/scrape:
 *   post:
 *     summary: Manually trigger a regulatory scraping job
 *     description: Requires authentication. Kicks off a new scraping job based on optional filters.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               country: { type: string, example: 'AU' }
 *               category: { type: string, example: 'tax_ruling' }
 *               priority: { type: string, example: 'high' }
 *     responses:
 *       200:
 *         description: Job started successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 jobId: { type: string }
 *                 status: { type: string }
 *                 documentsScraped: { type: number }
 *                 documentsUpdated: { type: number }
 *       401:
 *         description: Not authenticated.
 *       500:
 *         description: Internal server error.
 */
export async function POST(req: Request) {
  try {
    await getAuthUser(); // Authentication check
    console.log("[API] Received request to trigger scraping job.");

    let filters = {};
    try {
      filters = await req.json();
    } catch {
      filters = {};
    }
    console.log("[API] Job filters:", filters);

    // Do not await this, run in background
    runScrapingJob(filters);

    return NextResponse.json({
      success: true,
      message:
        "Scraping job started in the background. Check the job status for progress.",
    });
  } catch (error) {
    console.error("[API] Error triggering scraping job:", error);
    if (error instanceof Error && error.message.includes("Not authenticated")) {
      return new NextResponse("Not authenticated", { status: 401 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * @swagger
 * /api/regulatory/scrape:
 *   get:
 *     summary: Get recent scraping jobs
 *     description: Requires authentication. Retrieves the 20 most recent scraping jobs.
 *     responses:
 *       200:
 *         description: A list of recent jobs.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobs: { type: array, items: { $ref: '#/components/schemas/RegulatoryScrapeJob' } }
 *       401:
 *         description: Not authenticated.
 *       500:
 *         description: Internal server error.
 */
export async function GET() {
  try {
    await getAuthUser(); // Authentication check
    console.log("[API] Fetching recent scraping jobs.");

    const jobs = await getRecentScrapingJobs(20);

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("[API] Error fetching recent scraping jobs:", error);
    if (error instanceof Error && error.message.includes("Not authenticated")) {
      return new NextResponse("Not authenticated", { status: 401 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
