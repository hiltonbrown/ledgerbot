// This script should be run once to populate the database with initial regulatory content.
// After initial population, use the Vercel Cron job for daily updates.
//
// IMPORTANT: This script imports server-only modules and cannot be run directly with `tsx`.
// It must be executed within a Next.js server environment (e.g., via an API route).

import { runScrapingJob } from "../lib/regulatory/scraper";

async function populateData() {
  console.log("Starting full regulatory data population...");
  console.warn(
    "WARNING: This may take 30-60 minutes due to rate limiting and external API calls."
  );

  try {
    const job = await runScrapingJob({}); // No filters for a full scrape

    console.log("\n--- Full Regulatory Data Population Complete ---");
    console.log(`Job ID: ${job.id}`);
    console.log(`Status: ${job.status}`);
    console.log(`Documents Scraped: ${job.documentsScraped}`);
    console.log(`Documents Updated: ${job.documentsUpdated}`);
    console.log(`Errors: ${job.errorMessage || "None"}`);
    console.log("------------------------------------------------");

    if (job.status === "failed") {
      console.error("❌ Data population failed. Check logs for details.");
    } else {
      console.log("✅ Data population successful.");
    }
  } catch (error) {
    console.error(
      "❌ An unexpected error occurred during data population:",
      error
    );
  }
}

populateData().catch(console.error);
