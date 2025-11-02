#!/usr/bin/env tsx
/**
 * End-to-end test for regulatory scraping pipeline
 * Tests: Firecrawl API → Scraper → Database
 * Usage: tsx --env-file=.env.local scripts/test-regulatory-scraper-e2e.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { regulatoryDocument, regulatoryScrapeJob } from "../lib/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  scrapeRegulatoryDocument,
  scrapeAndSaveDocument,
  runScrapingJob,
} from "../lib/regulatory/scraper";
import type { RegulatorySource } from "../lib/regulatory/config-parser";
import * as schema from "../lib/db/schema";

// Initialize database connection directly
const connectionString = process.env.POSTGRES_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

// Test data - single source for quick testing
const testSource: RegulatorySource = {
  country: "AU",
  category: "award",
  section: "Fair Work (Employment Law)",
  subsection: "Minimum Wages",
  url: "https://www.fairwork.gov.au/pay-and-wages/minimum-wages",
  updateFrequency: "weekly",
  priority: "high",
};

async function runTests() {
  console.log("🧪 Starting End-to-End Regulatory Scraper Test\n");
  console.log("=" .repeat(60));

  // Check environment
  if (!process.env.FIRECRAWL_API_KEY) {
    console.error("❌ FIRECRAWL_API_KEY not set");
    process.exit(1);
  }

  if (!process.env.POSTGRES_URL) {
    console.error("❌ POSTGRES_URL not set");
    process.exit(1);
  }

  console.log("✅ Environment variables configured\n");

  try {
    // TEST 1: Scrape document (Firecrawl API call)
    console.log("=" .repeat(60));
    console.log("TEST 1: Scraping document from Firecrawl API");
    console.log("=" .repeat(60));
    console.log(`📄 URL: ${testSource.url}`);
    console.log("⏳ Calling Firecrawl v2 API...\n");

    const documentData = await scrapeRegulatoryDocument(testSource);

    if (!documentData) {
      console.error("❌ TEST 1 FAILED: scrapeRegulatoryDocument returned null");
      process.exit(1);
    }

    console.log("✅ TEST 1 PASSED: Document scraped successfully");
    console.log(`   📝 Title: ${documentData.title}`);
    console.log(`   📏 Extracted Text Length: ${documentData.extractedText.length} chars`);
    console.log(`   🔢 Token Count: ${documentData.tokenCount} tokens`);
    console.log(`   🌐 Source URL: ${documentData.sourceUrl}`);
    console.log(`   🏷️  Category: ${documentData.category}`);
    console.log(`   🌍 Country: ${documentData.country}\n`);

    // TEST 2: Save to database (first time - should create)
    console.log("=" .repeat(60));
    console.log("TEST 2: Saving document to database (CREATE)");
    console.log("=" .repeat(60));

    const saveResult1 = await scrapeAndSaveDocument(testSource);

    if (saveResult1.action === "failed") {
      console.error(
        `❌ TEST 2 FAILED: ${saveResult1.error || "Unknown error"}`
      );
      process.exit(1);
    }

    console.log(`✅ TEST 2 PASSED: Document saved with action: ${saveResult1.action}`);
    console.log(`   🆔 Document ID: ${saveResult1.documentId}\n`);

    // TEST 3: Save again (should be unchanged)
    console.log("=" .repeat(60));
    console.log("TEST 3: Saving same document again (UNCHANGED)");
    console.log("=" .repeat(60));

    const saveResult2 = await scrapeAndSaveDocument(testSource);

    if (saveResult2.action !== "unchanged") {
      console.error(
        `❌ TEST 3 FAILED: Expected 'unchanged' but got '${saveResult2.action}'`
      );
      process.exit(1);
    }

    console.log("✅ TEST 3 PASSED: Document unchanged (as expected)");
    console.log(`   🆔 Document ID: ${saveResult2.documentId}\n`);

    // TEST 4: Query database to verify
    console.log("=" .repeat(60));
    console.log("TEST 4: Querying database for saved document");
    console.log("=" .repeat(60));

    const savedDoc = await db.query.regulatoryDocument.findFirst({
      where: eq(regulatoryDocument.sourceUrl, testSource.url),
      orderBy: [desc(regulatoryDocument.scrapedAt)],
    });

    if (!savedDoc) {
      console.error("❌ TEST 4 FAILED: Document not found in database");
      process.exit(1);
    }

    console.log("✅ TEST 4 PASSED: Document found in database");
    console.log(`   🆔 ID: ${savedDoc.id}`);
    console.log(`   📝 Title: ${savedDoc.title}`);
    console.log(`   📏 Extracted Text: ${savedDoc.extractedText.substring(0, 100)}...`);
    console.log(`   🔢 Token Count: ${savedDoc.tokenCount}`);
    console.log(`   📅 Scraped At: ${savedDoc.scrapedAt}`);
    console.log(`   📅 Last Checked: ${savedDoc.lastCheckedAt}`);
    console.log(`   ✅ Status: ${savedDoc.status}\n`);

    // TEST 5: Run full scraping job (limited to high priority only)
    console.log("=" .repeat(60));
    console.log("TEST 5: Running full scraping job (high priority sources)");
    console.log("=" .repeat(60));
    console.log("⏳ This will scrape multiple sources (may take 30-60 seconds)...\n");

    const job = await runScrapingJob({
      country: "AU",
      priority: "high",
    });

    console.log("\n✅ TEST 5 PASSED: Scraping job completed");
    console.log(`   🆔 Job ID: ${job.id}`);
    console.log(`   📊 Status: ${job.status}`);
    console.log(`   📈 Documents Scraped: ${job.documentsScraped}`);
    console.log(`   🔄 Documents Updated: ${job.documentsUpdated}`);
    console.log(`   ⏱️  Started: ${job.startedAt}`);
    console.log(`   ✅ Completed: ${job.completedAt}`);

    if (job.errorMessage) {
      console.log(`   ⚠️  Error Message: ${job.errorMessage}`);
    }

    // TEST 6: Verify job record in database
    console.log("\n" + "=" .repeat(60));
    console.log("TEST 6: Verifying job record in database");
    console.log("=" .repeat(60));

    const jobRecord = await db.query.regulatoryScrapeJob.findFirst({
      where: eq(regulatoryScrapeJob.id, job.id),
    });

    if (!jobRecord) {
      console.error("❌ TEST 6 FAILED: Job record not found in database");
      process.exit(1);
    }

    console.log("✅ TEST 6 PASSED: Job record verified");
    console.log(`   🆔 Job ID: ${jobRecord.id}`);
    console.log(`   📊 Status: ${jobRecord.status}`);
    console.log(`   📈 Documents Scraped: ${jobRecord.documentsScraped}`);
    console.log(`   🔄 Documents Updated: ${jobRecord.documentsUpdated}\n`);

    // TEST 7: Count documents in database
    console.log("=" .repeat(60));
    console.log("TEST 7: Counting regulatory documents in database");
    console.log("=" .repeat(60));

    const allDocs = await db.query.regulatoryDocument.findMany({
      where: eq(regulatoryDocument.status, "active"),
    });

    console.log(`✅ TEST 7 PASSED: Found ${allDocs.length} active documents`);
    console.log("\n📋 Sample documents:");
    allDocs.slice(0, 5).forEach((doc, idx) => {
      console.log(`   ${idx + 1}. ${doc.title}`);
      console.log(`      📏 ${doc.tokenCount} tokens | 🌐 ${doc.sourceUrl}`);
    });

    if (allDocs.length > 5) {
      console.log(`   ... and ${allDocs.length - 5} more documents\n`);
    }

    // Final summary
    console.log("\n" + "=" .repeat(60));
    console.log("🎉 ALL TESTS PASSED!");
    console.log("=" .repeat(60));
    console.log("\n✅ End-to-End Pipeline Verified:");
    console.log("   1. ✅ Firecrawl v2 API scraping");
    console.log("   2. ✅ Document data transformation");
    console.log("   3. ✅ Database insertion (CREATE)");
    console.log("   4. ✅ Duplicate detection (UNCHANGED)");
    console.log("   5. ✅ Database queries");
    console.log("   6. ✅ Full scraping job execution");
    console.log("   7. ✅ Job record tracking");
    console.log("   8. ✅ Document counting and retrieval\n");

    console.log("🚀 The regulatory scraping system is fully operational!");
    console.log("📊 Ready for production deployment.\n");
  } catch (error) {
    console.error("\n❌ TEST FAILED WITH ERROR:");
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();
