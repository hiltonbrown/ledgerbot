/**
 * Regulatory document scraper orchestration
 * Manages scraping jobs and saves results to database
 */

import { eq } from "drizzle-orm";
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
  countTokens,
  extractTextFromHtml,
  scrapeUrl,
} from "./firecrawl-client";

/**
 * Result of scraping and saving a document
 */
export type ScrapeDocumentResult = {
  action: "created" | "updated" | "unchanged" | "failed";
  documentId?: string;
  error?: string;
};

/**
 * Scrapes a regulatory document from a source
 * @param source - The regulatory source to scrape
 * @returns Promise resolving to RegulatoryDocumentInsert object or null on failure
 */
export async function scrapeRegulatoryDocument(
  source: RegulatorySource
): Promise<RegulatoryDocumentInsert | null> {
  try {
    console.log(`🔍 Scraping: ${source.subsection} (${source.url})`);

    // Scrape the URL
    const result = await scrapeUrl(source.url, {
      formats: ["markdown", "html"],
      onlyMainContent: true,
    });

    if (!result.success) {
      console.error(`  ❌ Failed to scrape: ${result.error}`);
      return null;
    }

    // Extract text and count tokens
    const extractedText = extractTextFromHtml(result.html);
    const tokenCount = countTokens(extractedText);

    console.log("  ✅ Scraped successfully");
    console.log(`  📊 Content: ${result.markdown.length} chars markdown`);
    console.log(`  📊 Extracted: ${extractedText.length} chars text`);
    console.log(`  📊 Tokens: ${tokenCount}`);

    // Prepare document insert object
    const document: RegulatoryDocumentInsert = {
      country: source.country,
      category: source.category,
      title: result.title || source.subsection,
      sourceUrl: source.url,
      content: result.markdown,
      extractedText,
      tokenCount,
      status: "active",
      scrapedAt: result.scrapedAt,
      lastCheckedAt: result.scrapedAt,
      metadata: {
        section: source.section,
        subsection: source.subsection,
        updateFrequency: source.updateFrequency,
        priority: source.priority,
      },
    };

    return document;
  } catch (error) {
    console.error("  ❌ Error scraping document:", error);
    return null;
  }
}

/**
 * Scrapes a document and saves it to the database
 * Handles create, update, and archiving logic
 * @param source - The regulatory source to scrape
 * @returns Promise resolving to ScrapeDocumentResult
 */
export async function scrapeAndSaveDocument(
  source: RegulatorySource
): Promise<ScrapeDocumentResult> {
  try {
    // Scrape the document
    const scrapedDoc = await scrapeRegulatoryDocument(source);

    if (!scrapedDoc) {
      return {
        action: "failed",
        error: "Failed to scrape document",
      };
    }

    // Check if document already exists
    const [existingDoc] = await db
      .select()
      .from(regulatoryDocument)
      .where(eq(regulatoryDocument.sourceUrl, source.url))
      .limit(1);

    if (!existingDoc) {
      // Create new document
      console.log("  ✅ Creating new document");
      const [created] = await db
        .insert(regulatoryDocument)
        .values(scrapedDoc)
        .returning();

      return {
        action: "created",
        documentId: created.id,
      };
    }

    // Document exists - check if content changed
    const contentChanged =
      existingDoc.content !== scrapedDoc.content ||
      existingDoc.extractedText !== scrapedDoc.extractedText;

    if (!contentChanged) {
      // Content unchanged - just update lastCheckedAt
      console.log("  ℹ️ Content unchanged, updating lastCheckedAt");
      await db
        .update(regulatoryDocument)
        .set({ lastCheckedAt: new Date() })
        .where(eq(regulatoryDocument.id, existingDoc.id));

      return {
        action: "unchanged",
        documentId: existingDoc.id,
      };
    }

    // Content changed - archive old and create new
    console.log("  🔄 Content changed, archiving old and creating new");

    await db.transaction(async (tx) => {
      // Archive the old document
      await tx
        .update(regulatoryDocument)
        .set({
          status: "superseded",
          updatedAt: new Date(),
        })
        .where(eq(regulatoryDocument.id, existingDoc.id));

      // Insert new version
      await tx.insert(regulatoryDocument).values(scrapedDoc);
    });

    return {
      action: "updated",
      documentId: existingDoc.id,
    };
  } catch (error) {
    console.error("  ❌ Error saving document:", error);
    return {
      action: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Runs a scraping job with optional filters
 * @param filters - Optional filters for country, category, or priority
 * @returns Promise resolving to completed RegulatoryScrapeJob
 */
export async function runScrapingJob(filters?: {
  country?: string;
  category?: string;
  priority?: string;
}): Promise<RegulatoryScrapeJob> {
  console.log("\n🚀 Starting regulatory scraping job");
  if (filters) {
    console.log("📋 Filters:", filters);
  }

  // Create job record
  const [job] = await db
    .insert(regulatoryScrapeJob)
    .values({
      sourceUrl: "config://regulatory-sources.md",
      country: filters?.country || null,
      category: filters?.category || null,
      status: "pending",
      metadata: filters || {},
    })
    .returning();

  console.log(`📝 Created job: ${job.id}`);

  try {
    // Get sources based on filters
    let sources: RegulatorySource[] = [];

    if (filters?.country && filters?.category) {
      const countrySources = await getSourcesByCountry(filters.country);
      sources = countrySources.filter(
        (s: RegulatorySource) =>
          s.category.toLowerCase() === filters.category?.toLowerCase()
      );
    } else if (filters?.country) {
      sources = await getSourcesByCountry(filters.country);
    } else if (filters?.category) {
      sources = await getSourcesByCategory(filters.category);
    } else {
      sources = await parseRegulatoryConfig();
    }

    // Apply priority filter if specified
    if (filters?.priority) {
      sources = sources.filter(
        (s) => s.priority.toLowerCase() === filters.priority?.toLowerCase()
      );
    }

    console.log(`📦 Found ${sources.length} sources to scrape`);

    if (sources.length === 0) {
      throw new Error("No sources found matching filters");
    }

    // Update job status to in_progress
    await db
      .update(regulatoryScrapeJob)
      .set({
        status: "in_progress",
        startedAt: new Date(),
      })
      .where(eq(regulatoryScrapeJob.id, job.id));

    // Scrape each source
    let documentsCreated = 0;
    let documentsUpdated = 0;
    let documentsUnchanged = 0;
    let documentsFailed = 0;

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      console.log(
        `\n[${i + 1}/${sources.length}] Processing: ${source.subsection}`
      );

      const result = await scrapeAndSaveDocument(source);

      switch (result.action) {
        case "created":
          documentsCreated++;
          console.log(`  ✅ Created document ${result.documentId}`);
          break;
        case "updated":
          documentsUpdated++;
          console.log(`  🔄 Updated document ${result.documentId}`);
          break;
        case "unchanged":
          documentsUnchanged++;
          console.log(`  ℹ️ Document unchanged ${result.documentId}`);
          break;
        case "failed":
          documentsFailed++;
          console.log(`  ❌ Failed: ${result.error}`);
          break;
        default:
          // Should never reach here
          break;
      }

      // Update job progress
      await db
        .update(regulatoryScrapeJob)
        .set({
          documentsScraped:
            documentsCreated + documentsUpdated + documentsUnchanged,
          documentsUpdated,
        })
        .where(eq(regulatoryScrapeJob.id, job.id));
    }

    // Complete the job
    const [completedJob] = await db
      .update(regulatoryScrapeJob)
      .set({
        status: "completed",
        completedAt: new Date(),
        documentsScraped:
          documentsCreated + documentsUpdated + documentsUnchanged,
        documentsUpdated,
        documentsArchived: documentsUpdated, // Updated docs have old versions archived
      })
      .where(eq(regulatoryScrapeJob.id, job.id))
      .returning();

    console.log("\n✅ Scraping job completed!");
    console.log("📊 Summary:");
    console.log(`  ✅ Created: ${documentsCreated}`);
    console.log(`  🔄 Updated: ${documentsUpdated}`);
    console.log(`  ℹ️ Unchanged: ${documentsUnchanged}`);
    console.log(`  ❌ Failed: ${documentsFailed}`);
    console.log(`  📦 Total processed: ${sources.length}`);

    return completedJob;
  } catch (error) {
    console.error("\n❌ Scraping job failed:", error);

    // Mark job as failed
    const [failedJob] = await db
      .update(regulatoryScrapeJob)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(regulatoryScrapeJob.id, job.id))
      .returning();

    return failedJob;
  }
}
