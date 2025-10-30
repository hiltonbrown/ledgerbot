import { runScrapingJob } from "./scraper";

async function test() {
  console.log("=== Testing Regulatory Scraper ===\n");

  // Test: Run scraping job for Australian sources
  console.log("Running scraping job for Australian sources...\n");

  const job = await runScrapingJob({
    country: "AU",
  });

  console.log("\n=== Job Complete ===");
  console.log(`Job ID: ${job.id}`);
  console.log(`Status: ${job.status}`);
  console.log(`Documents Scraped: ${job.documentsScraped}`);
  console.log(`Documents Updated: ${job.documentsUpdated}`);
  console.log(`Documents Archived: ${job.documentsArchived}`);
  console.log(`Started: ${job.startedAt}`);
  console.log(`Completed: ${job.completedAt}`);
}

test().catch(console.error);
