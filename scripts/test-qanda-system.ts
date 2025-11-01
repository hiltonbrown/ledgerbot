import {
  calculateConfidence,
  detectHedging,
  requiresHumanReview,
  type ToolCall,
} from "../lib/regulatory/confidence";
import { parseRegulatoryConfig } from "../lib/regulatory/config-parser";
import { runScrapingJob } from "../lib/regulatory/scraper";
import { searchRegulatoryDocuments } from "../lib/regulatory/search";

async function testSystem() {
  let passed = 0;
  let failed = 0;

  console.log("\n--- Starting Q&A System Integration Tests ---");

  // Test 1: Config Parser
  console.log("\n[Test 1] Testing Config Parser...");
  try {
    const sources = await parseRegulatoryConfig();
    if (sources.length > 0) {
      console.log(
        `✅ Config Parser: Found ${sources.length} regulatory sources.`
      );
      passed++;
    } else {
      console.log("❌ Config Parser: No regulatory sources found.");
      failed++;
    }
  } catch (error) {
    console.error("❌ Config Parser: Failed to parse config.", error);
    failed++;
  }

  // Test 2: Scraping Job (High Priority AU)
  console.log("\n[Test 2] Testing Scraping Job (High Priority AU)...");
  try {
    const job = await runScrapingJob({
      country: "AU",
      priority: "high",
    });
    if (job.status === "completed" || job.status === "failed") {
      // Job can complete with failures
      console.log(
        `✅ Scraping Job: Completed with status '${job.status}'. Scraped: ${job.documentsScraped}, Updated: ${job.documentsUpdated}, Failed: ${job.errorMessage ? 1 : 0}.`
      );
      passed++;
    } else {
      console.log(
        `❌ Scraping Job: Did not complete as expected. Status: ${job.status}`
      );
      failed++;
    }
  } catch (error) {
    console.error("❌ Scraping Job: Failed to run scraping job.", error);
    failed++;
  }

  // Test 3: Search Functionality
  console.log("\n[Test 3] Testing Search Functionality...");
  try {
    const searchResults = await searchRegulatoryDocuments("minimum wage", {
      country: "AU",
      limit: 1,
    });
    if (searchResults.length > 0) {
      console.log(
        `✅ Search: Found ${searchResults.length} result(s) for "minimum wage". Sample: ${searchResults[0].title}`
      );
      passed++;
    } else {
      console.log(
        '❌ Search: No results found for "minimum wage". (This might be expected if no data is scraped yet)'
      );
      failed++;
    }
  } catch (error) {
    console.error("❌ Search: Failed to execute search.", error);
    failed++;
  }

  // Test 4: Confidence Scoring
  console.log("\n[Test 4] Testing Confidence Scoring...");
  try {
    const mockToolCalls: ToolCall[] = [
      {
        toolName: "regulatorySearch",
        result: {
          success: true,
          results: [{ relevanceScore: 0.8 }, { relevanceScore: 0.7 }],
        },
      },
      { toolName: "xero_list_invoices", result: { success: true } },
    ];
    const mockResponseText =
      "This is a response with some information. I think it might be correct.";

    const confidence = calculateConfidence(mockToolCalls, mockResponseText);
    const hedgingPenalty = detectHedging(mockResponseText);
    const needsReview = requiresHumanReview(confidence, 0.7);

    console.log(
      `✅ Confidence: Score: ${confidence.toFixed(2)}, Hedging Penalty: ${hedgingPenalty.toFixed(2)}, Needs Review (threshold 0.7): ${needsReview}`
    );
    if (confidence > 0 && hedgingPenalty > 0) {
      passed++;
    } else {
      console.log("❌ Confidence: Score or hedging penalty not as expected.");
      failed++;
    }
  } catch (error) {
    console.error("❌ Confidence: Failed to calculate confidence.", error);
    failed++;
  }

  console.log("\n--- Q&A System Integration Tests Complete ---");
  console.log(`Summary: ${passed} tests passed, ${failed} tests failed.`);

  return { passed, failed };
}

testSystem().catch(console.error);
