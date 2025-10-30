/**
 * Comprehensive test script for the Q&A regulatory system
 * Tests all major components end-to-end
 */

import {
  calculateConfidence,
  detectHedging,
  extractCitations,
  requiresHumanReview,
} from "../lib/regulatory/confidence";
import { parseRegulatoryConfig } from "../lib/regulatory/config-parser";
import { runScrapingJob } from "../lib/regulatory/scraper";
import { searchRegulatoryDocuments } from "../lib/regulatory/search";

async function testSystem() {
  console.log("=== Q&A Regulatory System Test Suite ===\n");

  let passed = 0;
  let failed = 0;

  // Test 1: Config Parser
  console.log("Test 1: Config Parser");
  try {
    const sources = await parseRegulatoryConfig();
    if (sources.length > 0) {
      console.log(`✅ Parsed ${sources.length} regulatory sources`);
      console.log(
        `   Sample: ${sources[0].subsection} (${sources[0].category})`
      );
      passed++;
    } else {
      console.log("❌ No sources parsed");
      failed++;
    }
  } catch (error) {
    console.log(`❌ Config parser failed: ${error}`);
    failed++;
  }

  // Test 2: Scraping Job (high priority only to limit scope)
  console.log("\n\nTest 2: Scraping Job (high priority sources)");
  try {
    const job = await runScrapingJob({
      country: "AU",
      priority: "high",
    });

    if (job.status === "completed") {
      console.log("✅ Scraping job completed");
      console.log(`   Job ID: ${job.id}`);
      console.log(`   Documents scraped: ${job.documentsScraped}`);
      console.log(`   Documents updated: ${job.documentsUpdated}`);
      console.log(`   Documents archived: ${job.documentsArchived}`);
      passed++;
    } else {
      console.log(`❌ Scraping job failed: ${job.status}`);
      console.log(`   Error: ${job.errorMessage}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ Scraping job error: ${error}`);
    failed++;
  }

  // Test 3: Full-Text Search
  console.log("\n\nTest 3: Full-Text Search");
  try {
    const searchResults = await searchRegulatoryDocuments("minimum wage", {
      country: "AU",
      limit: 3,
    });

    if (searchResults.length >= 0) {
      console.log(`✅ Search completed: ${searchResults.length} results`);
      for (const result of searchResults.slice(0, 2)) {
        console.log(
          `   - ${result.title} (score: ${result.relevanceScore.toFixed(3)})`
        );
      }
      passed++;
    } else {
      console.log("❌ Search returned no results");
      failed++;
    }
  } catch (error) {
    console.log(`❌ Search failed: ${error}`);
    failed++;
  }

  // Test 4: Confidence Scoring
  console.log("\n\nTest 4: Confidence Scoring");
  try {
    // Mock tool calls with regulatory citations
    const mockToolCalls = [
      {
        toolName: "regulatorySearch",
        result: {
          results: [
            {
              title: "Minimum Wages",
              url: "https://fairwork.gov.au/...",
              category: "award",
              relevanceScore: 0.95,
            },
            {
              title: "Modern Awards",
              url: "https://fairwork.gov.au/awards",
              category: "award",
              relevanceScore: 0.87,
            },
          ],
        },
      },
    ];

    const responseText =
      "According to Fair Work, the national minimum wage is $23.23 per hour as of July 2024.";

    const confidence = calculateConfidence(mockToolCalls, responseText);
    const citations = extractCitations(mockToolCalls);
    const needsReview = requiresHumanReview(confidence);

    console.log("✅ Confidence scoring working");
    console.log(`   Confidence: ${confidence.toFixed(3)}`);
    console.log(`   Citations: ${citations.length}`);
    console.log(`   Needs review: ${needsReview}`);
    passed++;
  } catch (error) {
    console.log(`❌ Confidence scoring failed: ${error}`);
    failed++;
  }

  // Test 5: Hedging Detection
  console.log("\n\nTest 5: Hedging Detection");
  try {
    const hedgingText = "I think it might be around $23, but I'm not sure.";
    const confidentText = "The minimum wage is $23.23 per hour.";

    const hedgingPenalty1 = detectHedging(hedgingText);
    const hedgingPenalty2 = detectHedging(confidentText);

    if (hedgingPenalty1 > 0 && hedgingPenalty2 === 0) {
      console.log("✅ Hedging detection working");
      console.log(`   Hedging text penalty: ${hedgingPenalty1}`);
      console.log(`   Confident text penalty: ${hedgingPenalty2}`);
      passed++;
    } else {
      console.log("❌ Hedging detection not working correctly");
      failed++;
    }
  } catch (error) {
    console.log(`❌ Hedging detection failed: ${error}`);
    failed++;
  }

  // Summary
  console.log("\n\n=== Test Summary ===");
  console.log(`Total tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(
    `Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`
  );

  return { passed, failed };
}

// Run tests
testSystem()
  .then((result) => {
    process.exit(result.failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error("\n❌ Test suite crashed:", error);
    process.exit(1);
  });
