import { and, eq } from "drizzle-orm";
import { db } from "../db/queries";
import {
  type RegulatoryDocumentInsert,
  type RegulatoryScrapeJob,
  regulatoryDocument,
  regulatoryScrapeJob,
} from "../db/schema";
import {
  getSourcesByCategory,
  getSourcesByCountry,
  parseRegulatoryConfig,
  type RegulatorySource,
} from "./config-parser";
import {
  type RegulatoryScrapeSummary,
  runRegulatorySummary,
} from "./regulatory-summary";
import { countTokens, extractTextFromHtml } from "./text-utils";

/**
 * Represents the result of scraping and saving a single document.
 */
export interface ScrapeDocumentResult {
  action: "created" | "updated" | "unchanged" | "failed";
  documentId?: string;
  error?: string;
}

/**
 * Scrapes a URL and transforms the content into a database-ready object.
 * @param source The regulatory source to scrape.
 * @returns A promise that resolves to a RegulatoryDocumentInsert object or null on failure.
 */
const REQUEST_TIMEOUT_MS = 45_000;
const DEFAULT_USER_AGENT =
  "LedgerBotRegulatoryScraper/1.0 (+https://ledgerbot.ai/regulatory)";

async function fetchSourceHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    const html = await response.text();
    const contentType = response.headers.get("content-type") ?? "unknown";
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);

    return {
      html,
      finalUrl: response.url,
      status: response.status,
      contentType,
      title: titleMatch ? titleMatch[1]?.trim() : undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseOptionalDate(value?: string | null) {
  if (!value) {
    return;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function scrapeRegulatoryDocument(
  source: RegulatorySource
): Promise<RegulatoryDocumentInsert | null> {
  console.log(`[Scraper]  Scraping source: ${source.url}`);
  try {
    const { html, title: fallbackTitle } = await fetchSourceHtml(source.url);

    if (!html || html.trim().length < 40) {
      console.error(`❌ Empty response while scraping ${source.url}`);
      return null;
    }

    const extractedText = extractTextFromHtml(html);
    const tokenCount = countTokens(extractedText);
    const regulatorySummary = await runRegulatorySummary({
      source,
      extractedText,
    });

    const effectiveDate = parseOptionalDate(regulatorySummary?.effectiveDate);

    const documentData: RegulatoryDocumentInsert = {
      country: source.country,
      category: source.category,
      title: regulatorySummary?.title || fallbackTitle || source.subsection,
      sourceUrl: source.url,
      content: html,
      extractedText,
      tokenCount,
      status: "active",
      scrapedAt: new Date(),
      lastCheckedAt: new Date(),
      effectiveDate,
      metadata: regulatorySummary
        ? {
            summary: regulatorySummary.summary,
            obligations: regulatorySummary.obligations,
            citations: regulatorySummary.citations,
            regulatoryVersion: "v1",
          }
        : undefined,
    };

    return documentData;
  } catch (error) {
    console.error(`❌ Unexpected error scraping ${source.url}:`, error);
    return null;
  }
}

/**
 * Scrapes a document and saves it to the database, handling creation, updates, and archival.
 * @param source The regulatory source to process.
 * @returns A promise that resolves to a ScrapeDocumentResult.
 */
export async function scrapeAndSaveDocument(
  source: RegulatorySource
): Promise<ScrapeDocumentResult> {
  const newDocumentData = await scrapeRegulatoryDocument(source);

  if (!newDocumentData) {
    return { action: "failed", error: "Scraping returned no data" };
  }

  try {
    const existingDocument = await db.query.regulatoryDocument.findFirst({
      where: and(
        eq(regulatoryDocument.sourceUrl, source.url),
        eq(regulatoryDocument.status, "active")
      ),
    });

    if (!existingDocument) {
      const [inserted] = await db
        .insert(regulatoryDocument)
        .values(newDocumentData)
        .returning();
      console.log(`✅ Created: ${inserted.title} (ID: ${inserted.id})`);
      return { action: "created", documentId: inserted.id };
    }

    // Simple content check (compare extracted text)
    if (existingDocument.extractedText === newDocumentData.extractedText) {
      await db
        .update(regulatoryDocument)
        .set({ lastCheckedAt: new Date() })
        .where(eq(regulatoryDocument.id, existingDocument.id));
      console.log(`ℹ️ Unchanged: ${existingDocument.title}`);
      return { action: "unchanged", documentId: existingDocument.id };
    }

    // Content has changed, archive old and insert new
    const [newVersion] = await db.transaction(async (tx) => {
      await tx
        .update(regulatoryDocument)
        .set({ status: "superseded", expiryDate: new Date() })
        .where(eq(regulatoryDocument.id, existingDocument.id));

      const [inserted] = await tx
        .insert(regulatoryDocument)
        .values(newDocumentData)
        .returning();
      return [inserted];
    });

    console.log(
      `🔄 Updated: ${newVersion.title} (New ID: ${newVersion.id}, Old ID: ${existingDocument.id})`
    );
    return { action: "updated", documentId: newVersion.id };
  } catch (error) {
    console.error(`❌ Database error for ${source.url}:`, error);
    return {
      action: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function refreshSourcesForCategories({
  categories,
  limitPerCategory = 2,
}: {
  categories: string[];
  limitPerCategory?: number;
}) {
  const catalogue = await parseRegulatoryConfig();
  const normalized = categories.length
    ? catalogue.filter((source) => categories.includes(source.category))
    : catalogue;

  const queue: RegulatorySource[] = [];
  for (const category of categories) {
    const matches = normalized.filter((source) => source.category === category);
    queue.push(...matches.slice(0, limitPerCategory));
  }

  if (queue.length === 0) {
    console.warn("[regulatory] No sources available for refresh", categories);
    return { processed: 0, created: 0, updated: 0, unchanged: 0, failed: 0 };
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const source of queue) {
    const result = await scrapeAndSaveDocument(source);
    switch (result.action) {
      case "created":
        created++;
        break;
      case "updated":
        updated++;
        break;
      case "unchanged":
        unchanged++;
        break;
      case "failed":
        failed++;
        break;
    }
  }

  return { processed: queue.length, created, updated, unchanged, failed };
}

/**
 * Runs a full scraping job based on filtered sources and records the results.
 * @param filters Optional filters for country, category, or priority.
 * @returns A promise that resolves to the completed RegulatoryScrapeJob record.
 */
export async function runScrapingJob(filters?: {
  country?: string;
  category?: any;
  priority?: any;
}): Promise<RegulatoryScrapeJob> {
  console.log("🚀 Starting new scraping job...");
  const [job] = await db
    .insert(regulatoryScrapeJob)
    .values({ status: "pending" })
    .returning();

  try {
    await db
      .update(regulatoryScrapeJob)
      .set({ status: "in_progress", startedAt: new Date() })
      .where(eq(regulatoryScrapeJob.id, job.id));

    let sources = await parseRegulatoryConfig();
    if (filters?.country) {
      sources = sources.filter((s) => s.country === filters.country);
    }
    if (filters?.category) {
      sources = sources.filter((s) => s.category === filters.category);
    }
    if (filters?.priority) {
      sources = sources.filter((s) => s.priority === filters.priority);
    }

    console.log(`Found ${sources.length} sources to process.`);

    let created = 0,
      updated = 0,
      unchanged = 0,
      failed = 0;

    for (const source of sources) {
      const result = await scrapeAndSaveDocument(source);
      switch (result.action) {
        case "created":
          created++;
          break;
        case "updated":
          updated++;
          break;
        case "unchanged":
          unchanged++;
          break;
        case "failed":
          failed++;
          break;
      }
    }

    const finalStatus =
      failed > 0 && created + updated + unchanged === 0
        ? "failed"
        : "completed";
    const [completedJob] = await db
      .update(regulatoryScrapeJob)
      .set({
        status: finalStatus,
        completedAt: new Date(),
        documentsScraped: created + updated,
        documentsUpdated: updated,
        // documentsArchived is implicitly handled by 'updated' count
      })
      .where(eq(regulatoryScrapeJob.id, job.id))
      .returning();

    console.log(`🏁 Scraping job finished with status: ${finalStatus}`);
    console.log(
      `📊 Stats: ${created} created, ${updated} updated, ${unchanged} unchanged, ${failed} failed.`
    );
    return completedJob;
  } catch (error) {
    console.error("❌ Fatal error during scraping job:", error);
    const [failedJob] = await db
      .update(regulatoryScrapeJob)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
      })
      .where(eq(regulatoryScrapeJob.id, job.id))
      .returning();
    return failedJob;
  }
}
