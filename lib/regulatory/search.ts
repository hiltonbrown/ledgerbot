/**
 * Full-text search for regulatory documents using PostgreSQL tsvector
 */

import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../db/queries";
import { type RegulatoryDocument, regulatoryDocument } from "../db/schema";

/**
 * Search result with relevance scoring and excerpts
 */
export type SearchResult = {
  documentId: string;
  title: string;
  sourceUrl: string;
  category: string;
  country: string;
  relevanceScore: number;
  excerpt: string;
  effectiveDate: Date | null;
  metadata: Record<string, unknown>;
};

/**
 * Filters for search queries
 */
export type SearchFilters = {
  country?: string;
  category?: string[];
  dateRange?: { start: Date; end: Date };
  limit?: number;
};

/**
 * Searches regulatory documents using PostgreSQL full-text search
 * @param query - Search query string
 * @param filters - Optional filters for country, category, date range, and limit
 * @returns Promise resolving to array of SearchResult objects ordered by relevance
 */
export async function searchRegulatoryDocuments(
  query: string,
  filters?: SearchFilters
): Promise<SearchResult[]> {
  try {
    console.log(`🔍 Searching regulatory documents: "${query}"`);
    if (filters) {
      console.log("📋 Filters:", filters);
    }

    const limit = filters?.limit ?? 10;

    // Build WHERE conditions
    const conditions = [
      eq(regulatoryDocument.status, "active"),
      sql`${regulatoryDocument.searchVector} @@ plainto_tsquery('english', ${query})`,
    ];

    if (filters?.country) {
      conditions.push(eq(regulatoryDocument.country, filters.country));
    }

    if (filters?.category && filters.category.length > 0) {
      conditions.push(inArray(regulatoryDocument.category, filters.category));
    }

    if (filters?.dateRange) {
      conditions.push(
        sql`${regulatoryDocument.effectiveDate} >= ${filters.dateRange.start}`
      );
      conditions.push(
        sql`${regulatoryDocument.effectiveDate} <= ${filters.dateRange.end}`
      );
    }

    // Execute search query with relevance scoring and excerpts
    const results = await db
      .select({
        documentId: regulatoryDocument.id,
        title: regulatoryDocument.title,
        sourceUrl: regulatoryDocument.sourceUrl,
        category: regulatoryDocument.category,
        country: regulatoryDocument.country,
        relevanceScore: sql<number>`ts_rank(${regulatoryDocument.searchVector}, plainto_tsquery('english', ${query}))`,
        excerpt: sql<string>`ts_headline('english', ${regulatoryDocument.extractedText}, plainto_tsquery('english', ${query}), 'MaxWords=50, MinWords=20, MaxFragments=1')`,
        effectiveDate: regulatoryDocument.effectiveDate,
        metadata: regulatoryDocument.metadata,
      })
      .from(regulatoryDocument)
      .where(and(...conditions))
      .orderBy(
        sql`ts_rank(${regulatoryDocument.searchVector}, plainto_tsquery('english', ${query})) DESC`
      )
      .limit(limit);

    console.log(`✅ Found ${results.length} matching documents`);

    return results.map((row) => ({
      documentId: row.documentId,
      title: row.title,
      sourceUrl: row.sourceUrl,
      category: row.category,
      country: row.country,
      relevanceScore: row.relevanceScore,
      excerpt: row.excerpt,
      effectiveDate: row.effectiveDate,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }));
  } catch (error) {
    console.error("❌ Error searching regulatory documents:", error);
    throw new Error(
      `Failed to search regulatory documents: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Finds documents similar to a given document
 * @param documentId - The ID of the source document
 * @param limit - Maximum number of similar documents to return (default: 5)
 * @returns Promise resolving to array of SearchResult objects
 */
export async function getSimilarDocuments(
  documentId: string,
  limit = 5
): Promise<SearchResult[]> {
  try {
    console.log(`🔍 Finding documents similar to: ${documentId}`);

    // Get the source document
    const [sourceDoc] = await db
      .select()
      .from(regulatoryDocument)
      .where(eq(regulatoryDocument.id, documentId))
      .limit(1);

    if (!sourceDoc) {
      console.log("❌ Source document not found");
      return [];
    }

    console.log(`📄 Source document: "${sourceDoc.title}"`);

    // Use the source document's title as the search query
    const query = sourceDoc.title;

    // Search for similar documents, excluding the source document
    const results = await db
      .select({
        documentId: regulatoryDocument.id,
        title: regulatoryDocument.title,
        sourceUrl: regulatoryDocument.sourceUrl,
        category: regulatoryDocument.category,
        country: regulatoryDocument.country,
        relevanceScore: sql<number>`ts_rank(${regulatoryDocument.searchVector}, plainto_tsquery('english', ${query}))`,
        excerpt: sql<string>`ts_headline('english', ${regulatoryDocument.extractedText}, plainto_tsquery('english', ${query}), 'MaxWords=50, MinWords=20, MaxFragments=1')`,
        effectiveDate: regulatoryDocument.effectiveDate,
        metadata: regulatoryDocument.metadata,
      })
      .from(regulatoryDocument)
      .where(
        and(
          eq(regulatoryDocument.status, "active"),
          ne(regulatoryDocument.id, documentId),
          sql`${regulatoryDocument.searchVector} @@ plainto_tsquery('english', ${query})`
        )
      )
      .orderBy(
        sql`ts_rank(${regulatoryDocument.searchVector}, plainto_tsquery('english', ${query})) DESC`
      )
      .limit(limit);

    console.log(`✅ Found ${results.length} similar documents`);

    return results.map((row) => ({
      documentId: row.documentId,
      title: row.title,
      sourceUrl: row.sourceUrl,
      category: row.category,
      country: row.country,
      relevanceScore: row.relevanceScore,
      excerpt: row.excerpt,
      effectiveDate: row.effectiveDate,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }));
  } catch (error) {
    console.error("❌ Error finding similar documents:", error);
    throw new Error(
      `Failed to find similar documents: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Gets documents by category
 * @param category - The category to filter by
 * @param limit - Maximum number of documents to return (default: 20)
 * @returns Promise resolving to array of RegulatoryDocument objects
 */
export async function getDocumentsByCategory(
  category: string,
  limit = 20
): Promise<RegulatoryDocument[]> {
  try {
    console.log(`📂 Getting documents for category: ${category}`);

    const results = await db
      .select()
      .from(regulatoryDocument)
      .where(
        and(
          eq(regulatoryDocument.category, category),
          eq(regulatoryDocument.status, "active")
        )
      )
      .orderBy(desc(regulatoryDocument.scrapedAt))
      .limit(limit);

    console.log(`✅ Found ${results.length} documents in category ${category}`);

    return results;
  } catch (error) {
    console.error("❌ Error getting documents by category:", error);
    throw new Error(
      `Failed to get documents by category: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
