import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/queries";
import { type RegulatoryDocument, regulatoryDocument } from "../db/schema";

/**
 * Represents a single item in a list of search results.
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
 * Defines the available filters for a search query.
 */
export type SearchFilters = {
  country?: string;
  category?: string[];
  dateRange?: { start: Date; end: Date };
  limit?: number;
};

/**
 * Searches regulatory documents using full-text search.
 * @param query The search query string.
 * @param filters Optional filters for the search.
 * @returns A promise that resolves to an array of SearchResult objects.
 */
export async function searchRegulatoryDocuments(
  query: string,
  filters?: SearchFilters
): Promise<SearchResult[]> {
  const limit = filters?.limit ?? 10;
  const tsQuery = sql`plainto_tsquery('english', ${query})`;

  try {
    const conditions = [
      sql`${regulatoryDocument.searchVector} @@ ${tsQuery}`,
      eq(regulatoryDocument.status, "active"),
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

    const results = await db
      .select({
        documentId: regulatoryDocument.id,
        title: regulatoryDocument.title,
        sourceUrl: regulatoryDocument.sourceUrl,
        category: regulatoryDocument.category,
        country: regulatoryDocument.country,
        relevanceScore: sql<number>`ts_rank(${regulatoryDocument.searchVector}, ${tsQuery})`,
        excerpt: sql<string>`ts_headline('english', ${regulatoryDocument.extractedText}, ${tsQuery}, 'MaxWords=50, MinWords=20, MaxFragments=1')`,
        effectiveDate: regulatoryDocument.effectiveDate,
        metadata: regulatoryDocument.metadata,
      })
      .from(regulatoryDocument)
      .where(and(...conditions))
      .orderBy(
        desc(sql`ts_rank(${regulatoryDocument.searchVector}, ${tsQuery})`)
      )
      .limit(limit);

    return results as SearchResult[];
  } catch (error) {
    console.error("Error searching regulatory documents:", error);
    throw new Error("Failed to execute search for regulatory documents.");
  }
}

/**
 * Finds documents that are similar to a given document by searching for its title.
 * @param documentId The ID of the source document for comparison.
 * @param limit The maximum number of similar documents to return.
 * @returns A promise that resolves to an array of SearchResult objects.
 */
export async function getSimilarDocuments(
  documentId: string,
  limit = 5
): Promise<SearchResult[]> {
  try {
    const sourceDocument = await db.query.regulatoryDocument.findFirst({
      where: eq(regulatoryDocument.id, documentId),
    });

    if (!sourceDocument || !sourceDocument.title) {
      return [];
    }

    const similar = await searchRegulatoryDocuments(sourceDocument.title, {
      limit: limit + 1,
    });

    // Filter out the source document itself from the results
    return similar
      .filter((doc) => doc.documentId !== documentId)
      .slice(0, limit);
  } catch (error) {
    console.error(
      `Error finding similar documents for ID ${documentId}:`,
      error
    );
    throw new Error("Failed to get similar documents.");
  }
}

/**
 * Retrieves a list of active documents for a specific category.
 * @param category The category to filter by.
 * @param limit The maximum number of documents to return.
 * @returns A promise that resolves to an array of RegulatoryDocument objects.
 */
export async function getDocumentsByCategory(
  category: string,
  limit = 20
): Promise<RegulatoryDocument[]> {
  try {
    return await db.query.regulatoryDocument.findMany({
      where: and(
        eq(regulatoryDocument.category, category),
        eq(regulatoryDocument.status, "active")
      ),
      orderBy: desc(regulatoryDocument.scrapedAt),
      limit,
    });
  } catch (error) {
    console.error(`Error getting documents for category ${category}:`, error);
    throw new Error("Failed to get documents by category.");
  }
}
