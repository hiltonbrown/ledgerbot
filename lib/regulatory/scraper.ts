import { db } from '../db/queries';
import { regulatoryDocument, regulatoryScrapeJob, RegulatoryDocumentInsert, RegulatoryScrapeJob } from '../db/schema';
import { scrapeUrl, extractTextFromHtml, countTokens } from './firecrawl-client';
import { parseRegulatoryConfig, getSourcesByCountry, getSourcesByCategory, RegulatorySource } from './config-parser';
import { eq, and } from 'drizzle-orm';

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
export async function scrapeRegulatoryDocument(source: RegulatorySource): Promise<RegulatoryDocumentInsert | null> {
  console.log(`[Scraper]  Scraping source: ${source.url}`);
  try {
    const scrapeResult = await scrapeUrl(source.url);

    if (!scrapeResult.success || !scrapeResult.html) {
      console.error(`❌ Failed to scrape ${source.url}: ${scrapeResult.error || 'No content'}`);
      return null;
    }

    const extractedText = extractTextFromHtml(scrapeResult.html);
    const tokenCount = countTokens(extractedText);

    const documentData: RegulatoryDocumentInsert = {
      country: source.country,
      category: source.category,
      title: scrapeResult.title || source.subsection,
      sourceUrl: source.url,
      content: scrapeResult.html, // Raw HTML/markdown
      extractedText,
      tokenCount,
      status: 'active',
      scrapedAt: scrapeResult.scrapedAt,
      lastCheckedAt: new Date(),
      // effectiveDate and expiryDate would need more advanced parsing
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
export async function scrapeAndSaveDocument(source: RegulatorySource): Promise<ScrapeDocumentResult> {
  const newDocumentData = await scrapeRegulatoryDocument(source);

  if (!newDocumentData) {
    return { action: 'failed', error: 'Scraping returned no data' };
  }

  try {
    const existingDocument = await db.query.regulatoryDocument.findFirst({
      where: and(eq(regulatoryDocument.sourceUrl, source.url), eq(regulatoryDocument.status, 'active')),
    });

    if (!existingDocument) {
      const [inserted] = await db.insert(regulatoryDocument).values(newDocumentData).returning();
      console.log(`✅ Created: ${inserted.title} (ID: ${inserted.id})`);
      return { action: 'created', documentId: inserted.id };
    }

    // Simple content check (compare extracted text)
    if (existingDocument.extractedText === newDocumentData.extractedText) {
      await db.update(regulatoryDocument)
        .set({ lastCheckedAt: new Date() })
        .where(eq(regulatoryDocument.id, existingDocument.id));
      console.log(`ℹ️ Unchanged: ${existingDocument.title}`);
      return { action: 'unchanged', documentId: existingDocument.id };
    }

    // Content has changed, archive old and insert new
    const [newVersion] = await db.transaction(async (tx) => {
      await tx.update(regulatoryDocument)
        .set({ status: 'superseded', expiryDate: new Date() })
        .where(eq(regulatoryDocument.id, existingDocument.id));
      
      const [inserted] = await tx.insert(regulatoryDocument).values(newDocumentData).returning();
      return [inserted];
    });

    console.log(`🔄 Updated: ${newVersion.title} (New ID: ${newVersion.id}, Old ID: ${existingDocument.id})`);
    return { action: 'updated', documentId: newVersion.id };

  } catch (error) {
    console.error(`❌ Database error for ${source.url}:`, error);
    return { action: 'failed', error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Runs a full scraping job based on filtered sources and records the results.
 * @param filters Optional filters for country, category, or priority.
 * @returns A promise that resolves to the completed RegulatoryScrapeJob record.
 */
export async function runScrapingJob(filters?: { country?: string; category?: any; priority?: any }): Promise<RegulatoryScrapeJob> {
  console.log('🚀 Starting new scraping job...');
  const [job] = await db.insert(regulatoryScrapeJob).values({ status: 'pending' }).returning();

  try {
    await db.update(regulatoryScrapeJob).set({ status: 'in_progress', startedAt: new Date() }).where(eq(regulatoryScrapeJob.id, job.id));

    let sources = await parseRegulatoryConfig();
    if (filters?.country) {
        sources = sources.filter(s => s.country === filters.country);
    }
    if (filters?.category) {
        sources = sources.filter(s => s.category === filters.category);
    }
    if (filters?.priority) {
        sources = sources.filter(s => s.priority === filters.priority);
    }

    console.log(`Found ${sources.length} sources to process.`);

    let created = 0, updated = 0, unchanged = 0, failed = 0;

    for (const source of sources) {
      const result = await scrapeAndSaveDocument(source);
      switch (result.action) {
        case 'created': created++; break;
        case 'updated': updated++; break;
        case 'unchanged': unchanged++; break;
        case 'failed': failed++; break;
      }
    }

    const finalStatus = failed > 0 && (created + updated + unchanged === 0) ? 'failed' : 'completed';
    const [completedJob] = await db.update(regulatoryScrapeJob)
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
    console.log(`📊 Stats: ${created} created, ${updated} updated, ${unchanged} unchanged, ${failed} failed.`);
    return completedJob;

  } catch (error) {
    console.error('❌ Fatal error during scraping job:', error);
    const [failedJob] = await db.update(regulatoryScrapeJob)
      .set({ status: 'failed', completedAt: new Date(), errorMessage: error instanceof Error ? error.message : String(error) })
      .where(eq(regulatoryScrapeJob.id, job.id))
      .returning();
    return failedJob;
  }
}