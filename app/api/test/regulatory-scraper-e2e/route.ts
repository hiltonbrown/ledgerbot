import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "../../../../lib/db/queries";
import {
  regulatoryDocument,
  regulatoryScrapeJob,
} from "../../../../lib/db/schema";
import type { RegulatorySource } from "../../../../lib/regulatory/config-parser";
import {
  runScrapingJob,
  scrapeAndSaveDocument,
  scrapeRegulatoryDocument,
} from "../../../../lib/regulatory/scraper";

// Test data - single source for quick testing
const testSource: RegulatorySource = {
  country: "AU",
  section: "Fair Work (Employment Law)",
  subsection: "Minimum Wages",
  sourceType: "web_scraping",
  url: "https://www.fairwork.gov.au/pay-and-wages/minimum-wages",
  updateFrequency: "weekly",
  priority: "high",
  category: "award",
};

export async function GET(request: Request) {
  try {
    // Simple auth check for test endpoint - require test-secret header
    const testSecret = request.headers.get("x-test-secret");
    if (testSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized - provide x-test-secret header",
        },
        { status: 401 }
      );
    }

    const results: any[] = [];
    results.push({ step: "START", message: "Starting end-to-end test" });

    // TEST 1: Scrape document (Firecrawl API call)
    results.push({
      step: "TEST_1",
      message: "Scraping document from Firecrawl API",
    });

    const documentData = await scrapeRegulatoryDocument(testSource);

    if (!documentData) {
      return NextResponse.json(
        {
          success: false,
          error: "scrapeRegulatoryDocument returned null",
          results,
        },
        { status: 500 }
      );
    }

    results.push({
      step: "TEST_1_PASSED",
      message: "Document scraped successfully",
      data: {
        title: documentData.title,
        extractedTextLength: documentData.extractedText?.length || 0,
        tokenCount: documentData.tokenCount,
        sourceUrl: documentData.sourceUrl,
        category: documentData.category,
        country: documentData.country,
      },
    });

    // TEST 2: Save to database (first time - should create)
    results.push({ step: "TEST_2", message: "Saving document to database" });

    const saveResult1 = await scrapeAndSaveDocument(testSource);

    if (saveResult1.action === "failed") {
      return NextResponse.json(
        {
          success: false,
          error: saveResult1.error || "Save failed",
          results,
        },
        { status: 500 }
      );
    }

    results.push({
      step: "TEST_2_PASSED",
      message: `Document saved with action: ${saveResult1.action}`,
      data: {
        action: saveResult1.action,
        documentId: saveResult1.documentId,
      },
    });

    // TEST 3: Save again (should be unchanged)
    results.push({ step: "TEST_3", message: "Saving same document again" });

    const saveResult2 = await scrapeAndSaveDocument(testSource);

    results.push({
      step: "TEST_3_PASSED",
      message: `Second save result: ${saveResult2.action}`,
      data: {
        action: saveResult2.action,
        documentId: saveResult2.documentId,
      },
    });

    // TEST 4: Query database to verify
    results.push({
      step: "TEST_4",
      message: "Querying database for saved document",
    });

    const savedDoc = await db.query.regulatoryDocument.findFirst({
      where: eq(regulatoryDocument.sourceUrl, testSource.url),
      orderBy: [desc(regulatoryDocument.scrapedAt)],
    });

    if (!savedDoc) {
      return NextResponse.json(
        {
          success: false,
          error: "Document not found in database",
          results,
        },
        { status: 500 }
      );
    }

    results.push({
      step: "TEST_4_PASSED",
      message: "Document found in database",
      data: {
        id: savedDoc.id,
        title: savedDoc.title,
        tokenCount: savedDoc.tokenCount,
        scrapedAt: savedDoc.scrapedAt,
        status: savedDoc.status,
      },
    });

    // TEST 5: Run full scraping job (limited to high priority only)
    results.push({
      step: "TEST_5",
      message: "Running full scraping job (high priority sources)",
    });

    const job = await runScrapingJob({
      country: "AU",
      priority: "high",
    });

    results.push({
      step: "TEST_5_PASSED",
      message: "Scraping job completed",
      data: {
        jobId: job.id,
        status: job.status,
        documentsScraped: job.documentsScraped,
        documentsUpdated: job.documentsUpdated,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        errorMessage: job.errorMessage,
      },
    });

    // TEST 6: Verify job record in database
    results.push({
      step: "TEST_6",
      message: "Verifying job record in database",
    });

    const jobRecord = await db.query.regulatoryScrapeJob.findFirst({
      where: eq(regulatoryScrapeJob.id, job.id),
    });

    if (!jobRecord) {
      return NextResponse.json(
        {
          success: false,
          error: "Job record not found in database",
          results,
        },
        { status: 500 }
      );
    }

    results.push({
      step: "TEST_6_PASSED",
      message: "Job record verified",
      data: {
        jobId: jobRecord.id,
        status: jobRecord.status,
        documentsScraped: jobRecord.documentsScraped,
        documentsUpdated: jobRecord.documentsUpdated,
      },
    });

    // TEST 7: Count documents in database
    results.push({ step: "TEST_7", message: "Counting regulatory documents" });

    const allDocs = await db.query.regulatoryDocument.findMany({
      where: eq(regulatoryDocument.status, "active"),
    });

    results.push({
      step: "TEST_7_PASSED",
      message: `Found ${allDocs.length} active documents`,
      data: {
        totalDocuments: allDocs.length,
        sampleDocuments: allDocs.slice(0, 5).map((doc) => ({
          title: doc.title,
          tokenCount: doc.tokenCount,
          sourceUrl: doc.sourceUrl,
        })),
      },
    });

    // Final summary
    results.push({
      step: "SUCCESS",
      message: "All tests passed! End-to-end pipeline verified.",
    });

    return NextResponse.json({
      success: true,
      message: "End-to-end test completed successfully",
      results,
    });
  } catch (error) {
    console.error("E2E test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
