import * as cheerio from "cheerio";
import he from "he";

/**
 * Represents the result of a scraping operation for a single URL.
 */
export interface ScrapeResult {
  url: string;
  markdown: string;
  html: string;
  title?: string;
  success: boolean;
  error?: string;
  scrapedAt: Date;
}

/**
 * Defines the options available for a scraping operation.
 */
export interface ScrapeOptions {
  formats?: ("markdown" | "html")[];
  onlyMainContent?: boolean;
  timeout?: number; // in milliseconds
}

const RATE_LIMIT_MS = 2000; // 1 request per 2 seconds for Firecrawl free tier
let lastRequestTime = 0;

/**
 * Waits if necessary to respect the rate limit.
 */
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    const delay = RATE_LIMIT_MS - timeSinceLastRequest;
    console.log(`Rate limiting: waiting for ${delay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Scrapes a single URL with rate limiting using Firecrawl API.
 *
 * @param url The URL to scrape.
 * @param options Optional scraping parameters.
 * @returns A promise that resolves to a ScrapeResult object.
 */
export async function scrapeUrl(
  url: string,
  options?: ScrapeOptions
): Promise<ScrapeResult> {
  console.log(`[Firecrawl] Scraping URL: ${url}`);
  await waitForRateLimit();
  lastRequestTime = Date.now();

  const timeout = options?.timeout ?? 30_000;

  try {
    const formats = options?.formats ?? ["markdown", "html"];
    const onlyMainContent = options?.onlyMainContent ?? true;

    // Call Firecrawl API via fetch
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlApiKey) {
      throw new Error("FIRECRAWL_API_KEY environment variable is not set");
    }

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firecrawlApiKey}`,
      },
      body: JSON.stringify({
        url,
        formats,
        onlyMainContent,
        timeout,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Firecrawl API error (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Firecrawl scraping failed");
    }

    const markdown = data.data?.markdown || "";
    const html = data.data?.html || data.data?.rawHtml || "";
    const title = data.data?.metadata?.title || "";

    console.log(`[Firecrawl] Successfully scraped: ${url}`);
    return {
      url,
      markdown,
      html,
      title,
      success: true,
      scrapedAt: new Date(),
    };
  } catch (error) {
    console.error(`[Firecrawl] Error scraping ${url}:`, error);
    return {
      url,
      markdown: "",
      html: "",
      success: false,
      error: error instanceof Error ? error.message : String(error),
      scrapedAt: new Date(),
    };
  }
}

/**
 * Scrapes a list of URLs sequentially with rate limiting between requests.
 *
 * @param urls An array of URLs to scrape.
 * @param options Optional scraping parameters for each URL.
 * @returns A promise that resolves to an array of ScrapeResult objects.
 */
export async function batchScrapeUrls(
  urls: string[],
  options?: ScrapeOptions
): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];
  let count = 0;
  for (const url of urls) {
    count++;
    console.log(`[Firecrawl] Processing batch: ${count}/${urls.length}`);
    const result = await scrapeUrl(url, options);
    results.push(result);
  }
  return results;
}

/**
 * Extracts plain text from an HTML string.
 * It removes HTML tags, decodes entities, and collapses whitespace.
 *
 * @param html The HTML string to process.
 * @returns The extracted plain text.
 */
export function extractTextFromHtml(html: string): string {
  try {
    const $ = cheerio.load(html);
    const text = $("body").text();
    const decodedText = he.decode(text);
    // Collapse whitespace (multiple spaces/newlines to a single space)
    return decodedText.replace(/\s+/g, " ").trim();
  } catch (error) {
    console.error("Error extracting text from HTML:", error);
    return "";
  }
}

/**
 * Provides a rough approximation of the number of tokens in a string.
 * (Based on the approximation that 1 token ≈ 4 characters)
 *
 * @param text The input string.
 * @returns The estimated number of tokens.
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
