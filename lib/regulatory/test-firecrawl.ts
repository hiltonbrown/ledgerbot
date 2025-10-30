import { batchScrapeUrls, scrapeUrl } from "./firecrawl-client";

async function test() {
  console.log("Test 1: Single URL scrape");
  const result = await scrapeUrl(
    "https://www.fairwork.gov.au/pay-and-wages/minimum-wages"
  );
  console.log(`Success: ${result.success}`);
  console.log(`Title: ${result.title}`);
  console.log(`Content length: ${result.markdown.length} chars\n`);

  console.log("Test 2: Batch scrape (2 URLs)");
  const urls = [
    "https://www.fairwork.gov.au/pay-and-wages/minimum-wages",
    "https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/payg-withholding",
  ];
  const results = await batchScrapeUrls(urls);
  console.log(
    `Completed: ${results.filter((r) => r.success).length}/${urls.length} successful`
  );
}

test().catch(console.error);
