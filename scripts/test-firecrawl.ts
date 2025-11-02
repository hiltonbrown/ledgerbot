#!/usr/bin/env tsx
/**
 * Test script to verify Firecrawl v2 API integration
 * Usage: tsx scripts/test-firecrawl.ts
 */

import "dotenv/config";

async function testFirecrawlV2() {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    console.error("❌ FIRECRAWL_API_KEY environment variable is not set");
    process.exit(1);
  }

  console.log("🔍 Testing Firecrawl v2 API...\n");

  const testUrl = "https://www.fairwork.gov.au/pay-and-wages/minimum-wages";

  try {
    console.log(`📄 Scraping: ${testUrl}`);
    console.log("⏳ This may take a few seconds...\n");

    const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: testUrl,
        formats: ["markdown", "html"],
        onlyMainContent: true,
        timeout: 30000,
      }),
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ API Error (${response.status}):`);
      console.error(errorText);
      process.exit(1);
    }

    const data = await response.json();

    if (!data.success) {
      console.error("\n❌ Scraping failed:");
      console.error(data.error || "Unknown error");
      process.exit(1);
    }

    const markdown = data.data?.markdown || "";
    const html = data.data?.html || data.data?.rawHtml || "";
    const title = data.data?.metadata?.title || "";

    console.log("\n✅ Success!");
    console.log(`📝 Title: ${title}`);
    console.log(
      `📏 Markdown Length: ${markdown.length} characters (${Math.ceil(markdown.length / 4)} tokens approx)`
    );
    console.log(`📏 HTML Length: ${html.length} characters`);
    console.log(`\n📋 First 200 characters of markdown:`);
    console.log(markdown.substring(0, 200) + "...\n");

    console.log("🎉 Firecrawl v2 API is working correctly!");
  } catch (error) {
    console.error("\n❌ Error occurred:");
    console.error(error);
    process.exit(1);
  }
}

testFirecrawlV2();
