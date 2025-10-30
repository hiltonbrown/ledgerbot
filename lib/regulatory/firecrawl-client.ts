/**
 * Firecrawl MCP client wrapper with rate limiting for regulatory document scraping
 */

/**
 * Result of a web scraping operation
 */
export type ScrapeResult = {
  url: string;
  markdown: string;
  html: string;
  title?: string;
  success: boolean;
  error?: string;
  scrapedAt: Date;
};

/**
 * Options for scraping operations
 */
export type ScrapeOptions = {
  formats?: ("markdown" | "html")[];
  onlyMainContent?: boolean;
  timeout?: number;
};

// Rate limiting configuration
const RATE_LIMIT_MS = 2000; // 1 request per 2 seconds (Firecrawl free tier)
let lastRequestTime = 0;

/**
 * Waits if necessary to respect rate limits
 * @returns Promise that resolves when it's safe to make the next request
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const waitTime = Math.max(0, RATE_LIMIT_MS - timeSinceLastRequest);

  if (waitTime > 0) {
    console.log(`⏳ Rate limit: waiting ${waitTime}ms before next request`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

/**
 * Scrapes a single URL with rate limiting
 * @param url - The URL to scrape
 * @param options - Scraping options
 * @returns Promise resolving to scrape result
 */
export async function scrapeUrl(
  url: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const {
    formats = ["markdown", "html"],
    onlyMainContent = true,
    timeout = 30_000,
  } = options;

  console.log(`🔍 Scraping: ${url}`);

  try {
    // Wait for rate limit
    await waitForRateLimit();

    // TODO: Replace with actual Firecrawl MCP integration
    // For now, return mock data
    console.log(`  ✓ Formats: ${formats.join(", ")}`);
    console.log(`  ✓ Main content only: ${onlyMainContent}`);
    console.log(`  ✓ Timeout: ${timeout}ms`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockMarkdown = `# Mock Content for ${url}\n\nThis is placeholder content that will be replaced with actual scraped data from Firecrawl MCP.\n\n## Section 1\nSample regulatory text...\n\n## Section 2\nMore regulatory information...`;

    const mockHtml = `<!DOCTYPE html>
<html>
<head><title>Mock Page</title></head>
<body>
<h1>Mock Content for ${url}</h1>
<p>This is placeholder content that will be replaced with actual scraped data from Firecrawl MCP.</p>
<h2>Section 1</h2>
<p>Sample regulatory text...</p>
<h2>Section 2</h2>
<p>More regulatory information...</p>
</body>
</html>`;

    const result: ScrapeResult = {
      url,
      markdown: formats.includes("markdown") ? mockMarkdown : "",
      html: formats.includes("html") ? mockHtml : "",
      title: "Mock Page Title",
      success: true,
      scrapedAt: new Date(),
    };

    console.log(`  ✅ Successfully scraped ${url}`);
    return result;
  } catch (error) {
    console.error(`  ❌ Failed to scrape ${url}:`, error);
    return {
      url,
      markdown: "",
      html: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      scrapedAt: new Date(),
    };
  }
}

/**
 * Scrapes multiple URLs sequentially with rate limiting
 * @param urls - Array of URLs to scrape
 * @param options - Scraping options
 * @returns Promise resolving to array of scrape results
 */
export async function batchScrapeUrls(
  urls: string[],
  options: ScrapeOptions = {}
): Promise<ScrapeResult[]> {
  console.log(`\n📦 Batch scraping ${urls.length} URLs...`);

  const results: ScrapeResult[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n[${i + 1}/${urls.length}] Processing: ${url}`);

    const result = await scrapeUrl(url, options);
    results.push(result);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;
    console.log(
      `  📊 Progress: ${results.length}/${urls.length} (✅ ${successCount} success, ❌ ${failureCount} failed)`
    );
  }

  console.log("\n✅ Batch scraping complete!");
  console.log(
    `  Total: ${results.length}, Success: ${results.filter((r) => r.success).length}, Failed: ${results.filter((r) => !r.success).length}`
  );

  return results;
}

/**
 * Extracts plain text from HTML content
 * @param html - HTML string to process
 * @returns Plain text with HTML tags removed
 */
import * as cheerio from 'cheerio';

export function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html, { decodeEntities: true });
  // Remove all script and style tags
  $("script, style").remove();
  let text = $.text();
  // Collapse multiple whitespace characters into single space and trim
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Estimates token count for text (rough approximation)
 * @param text - Text to count tokens for
 * @returns Estimated token count (1 token ≈ 4 characters)
 */
export function countTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters
  // This is a simplified estimate; actual tokenization varies by model
  return Math.ceil(text.length / 4);
}
