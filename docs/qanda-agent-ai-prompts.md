# Q&A Advisory Agent - AI Prompts for Implementation

**Purpose:** This file contains ready-to-use AI prompts for implementing the Q&A Advisory Agent. Copy each prompt to your AI coding assistant (Claude Code, Cursor, GitHub Copilot) in sequence.

**Target Audience:** Junior developers using AI tools

**Important:** Complete each prompt in order. Test after each prompt before moving to the next.

---

## How to Use This File

1. **Start with Phase 1, Prompt 1**
2. **Copy the entire prompt** (including the triple backticks)
3. **Paste into your AI assistant**
4. **Wait for the AI to complete the task**
5. **Test the result** using the test command provided
6. **Only proceed to the next prompt if the test passes**

---

# Phase 1: Database Schema & Configuration

## Prompt 1.1: Create Regulatory Document Tables

```
I need to add two new database tables to our Drizzle schema at lib/db/schema.ts:

1. regulatoryDocument table with these exact fields:
   - id: UUID primary key with defaultRandom()
   - country: varchar(2) not null (e.g., "AU", "NZ")
   - category: varchar(50) not null (values: "award", "tax_ruling", "payroll_tax", "custom")
   - title: text not null
   - sourceUrl: text not null unique
   - content: text (raw HTML/markdown from scraping)
   - extractedText: text (plain text for search)
   - tokenCount: integer default 0
   - effectiveDate: timestamp nullable
   - expiryDate: timestamp nullable
   - status: varchar(20) default "active" not null (values: "active", "superseded", "archived")
   - scrapedAt: timestamp not null
   - lastCheckedAt: timestamp not null
   - metadata: jsonb for additional data
   - createdAt: timestamp with defaultNow() not null
   - updatedAt: timestamp with defaultNow() not null

   Create indexes on: country, category, status, sourceUrl

2. regulatoryScrapeJob table with these exact fields:
   - id: UUID primary key with defaultRandom()
   - sourceUrl: text not null
   - country: varchar(2)
   - category: varchar(50)
   - status: varchar(20) default "pending" not null (values: "pending", "in_progress", "completed", "failed")
   - startedAt: timestamp nullable
   - completedAt: timestamp nullable
   - documentsScraped: integer default 0
   - documentsUpdated: integer default 0
   - documentsArchived: integer default 0
   - errorMessage: text nullable
   - metadata: jsonb nullable
   - createdAt: timestamp with defaultNow() not null

   Create indexes on: status, country, createdAt

Export TypeScript types for both tables:
- RegulatoryDocument / RegulatoryDocumentInsert
- RegulatoryScrapeJob / RegulatoryScrapeJobInsert

Follow the existing schema patterns in lib/db/schema.ts (look at User, Chat, Message_v2 tables for reference).
Use pgTable from drizzle-orm/pg-core.
```

**Test Command:**
```bash
pnpm tsc --noEmit
```

---

## Prompt 1.2: Generate Database Migration

```
Generate a Drizzle migration for the new regulatory tables I just added to lib/db/schema.ts.

Run: pnpm db:generate

Then open the generated migration file in lib/db/migrations/ and verify it contains:
1. CREATE TABLE statements for regulatory_document and regulatory_scrape_job
2. CREATE INDEX statements for all the indexes I defined
3. Proper column types and constraints

Show me the contents of the migration file so I can review it before running.
```

**Test Command:**
```bash
# Review migration file
cat lib/db/migrations/*/migration.sql | head -50
```

---

## Prompt 1.3: Create Regulatory Sources Configuration File

```
Create a new markdown configuration file at config/regulatory-sources.md with the following structure and content:

# Regulatory Sources Configuration

This file defines regulatory sources to scrape. Each source must have:
- **Source Type:** web_scraping
- **URL:** The webpage to scrape
- **Update Frequency:** daily, weekly, monthly, quarterly
- **Priority:** high, medium, low
- **Category:** award, tax_ruling, payroll_tax, custom

---

## Australia (AU)

### Fair Work (Employment Law)

#### Minimum Wages
- **Source Type:** web_scraping
- **URL:** https://www.fairwork.gov.au/pay-and-wages/minimum-wages
- **Update Frequency:** weekly
- **Priority:** high
- **Category:** award

#### Modern Awards List
- **Source Type:** web_scraping
- **URL:** https://www.fairwork.gov.au/employment-conditions/awards/list-of-awards
- **Update Frequency:** weekly
- **Priority:** high
- **Category:** award

### Australian Taxation Office (ATO)

#### Income Tax Rulings
- **Source Type:** web_scraping
- **URL:** https://www.ato.gov.au/law/view/menu?docid=ITR/TaxRulings/
- **Update Frequency:** monthly
- **Priority:** high
- **Category:** tax_ruling

#### PAYG Withholding
- **Source Type:** web_scraping
- **URL:** https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/payg-withholding
- **Update Frequency:** monthly
- **Priority:** high
- **Category:** tax_ruling

#### Superannuation Guarantee
- **Source Type:** web_scraping
- **URL:** https://www.ato.gov.au/businesses-and-organisations/super-for-employers/paying-super-contributions/how-much-super-to-pay
- **Update Frequency:** quarterly
- **Priority:** high
- **Category:** tax_ruling

### State Payroll Tax

#### New South Wales
- **Source Type:** web_scraping
- **URL:** https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/payroll-tax
- **Update Frequency:** quarterly
- **Priority:** medium
- **Category:** payroll_tax

#### Victoria
- **Source Type:** web_scraping
- **URL:** https://www.sro.vic.gov.au/payroll-tax
- **Update Frequency:** quarterly
- **Priority:** medium
- **Category:** payroll_tax

#### Queensland
- **Source Type:** web_scraping
- **URL:** https://www.business.qld.gov.au/running-business/employing/payroll-tax
- **Update Frequency:** quarterly
- **Priority:** medium
- **Category:** payroll_tax

#### South Australia
- **Source Type:** web_scraping
- **URL:** https://www.revenuesa.sa.gov.au/taxes-and-duties/payroll-tax
- **Update Frequency:** quarterly
- **Priority:** medium
- **Category:** payroll_tax

#### Western Australia
- **Source Type:** web_scraping
- **URL:** https://www.wa.gov.au/organisation/department-of-finance/payroll-tax
- **Update Frequency:** quarterly
- **Priority:** medium
- **Category:** payroll_tax

#### Tasmania
- **Source Type:** web_scraping
- **URL:** https://www.sro.tas.gov.au/payroll-tax
- **Update Frequency:** quarterly
- **Priority:** medium
- **Category:** payroll_tax

#### Australian Capital Territory
- **Source Type:** web_scraping
- **URL:** https://www.revenue.act.gov.au/payroll-tax
- **Update Frequency:** quarterly
- **Priority:** medium
- **Category:** payroll_tax

#### Northern Territory
- **Source Type:** web_scraping
- **URL:** https://revenue.nt.gov.au/taxes-and-royalties/payroll-tax
- **Update Frequency:** quarterly
- **Priority:** medium
- **Category:** payroll_tax

---

## Future Expansion

### New Zealand (NZ)
(To be added)

### United Kingdom (UK)
(To be added)

### United States (US)
(To be added)

Create this file and ensure the directory config/ exists.
```

**Test Command:**
```bash
cat config/regulatory-sources.md | head -30
```

---

## Prompt 1.4: Create Configuration Parser

```
Create lib/regulatory/config-parser.ts that parses the regulatory-sources.md file into structured TypeScript objects.

Requirements:

1. Create this TypeScript interface:
interface RegulatorySource {
  country: string;        // "AU", "NZ", etc.
  section: string;        // "Fair Work (Employment Law)"
  subsection: string;     // "Minimum Wages"
  sourceType: string;     // "web_scraping"
  url: string;
  updateFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  priority: 'high' | 'medium' | 'low';
  category: 'award' | 'tax_ruling' | 'payroll_tax' | 'custom';
}

2. Export these functions with JSDoc comments:
   - parseRegulatoryConfig(): Promise<RegulatorySource[]> - Parses the entire config file
   - getSourcesByCountry(country: string): Promise<RegulatorySource[]> - Filters by country
   - getSourcesByCategory(category: string): Promise<RegulatorySource[]> - Filters by category
   - getSourcesByPriority(priority: string): Promise<RegulatorySource[]> - Filters by priority

3. Implementation details:
   - Use fs/promises to read config/regulatory-sources.md
   - Parse markdown structure:
     * ## headings are countries (extract code in parentheses)
     * ### headings are sections
     * #### headings are subsections
     * - **Field:** value lines contain metadata
   - Handle errors gracefully (file not found, invalid format)
   - Return empty array if parsing fails

4. The parser should read line by line:
   - Track current country, section, subsection
   - When encountering #### heading, start new source
   - Parse bullet points for source properties
   - Add completed source to results array

Create the directory lib/regulatory/ if it doesn't exist.
```

**Test Command:**
```bash
# Create test file
cat > lib/regulatory/test-parser.ts << 'EOF'
import { parseRegulatoryConfig, getSourcesByCountry } from "./config-parser";

async function test() {
  const all = await parseRegulatoryConfig();
  console.log(`✅ Parsed ${all.length} sources`);

  const au = await getSourcesByCountry("AU");
  console.log(`✅ Found ${au.length} Australian sources`);

  if (au.length > 0) {
    console.log("\nSample source:");
    console.log(JSON.stringify(au[0], null, 2));
  }
}

test().catch(console.error);
EOF

tsx lib/regulatory/test-parser.ts
```

---

## Prompt 1.5: Run Database Migration

```
Run the database migration to create the new regulatory tables.

Execute: pnpm db:migrate

After the migration completes, verify the tables exist by running: pnpm db:studio

Then open http://localhost:4983 in your browser and confirm you see:
- regulatory_document table
- regulatory_scrape_job table

Show me the output of the migration command.
```

**Test Command:**
```bash
pnpm db:migrate
pnpm db:studio
# Open http://localhost:4983 and verify tables exist
```

---

# Phase 2: Scraping Infrastructure

## Prompt 2.1: Create Firecrawl Client Wrapper

```
Create lib/regulatory/firecrawl-client.ts that wraps the Firecrawl MCP client with rate limiting.

Requirements:

1. Export these TypeScript interfaces:
interface ScrapeResult {
  url: string;
  markdown: string;
  html: string;
  title?: string;
  success: boolean;
  error?: string;
  scrapedAt: Date;
}

interface ScrapeOptions {
  formats?: ("markdown" | "html")[];
  onlyMainContent?: boolean;
  timeout?: number;
}

2. Implement rate limiting:
   - Firecrawl free tier: 1 request per 2 seconds
   - Use a global lastRequestTime variable
   - waitForRateLimit() function that delays if needed
   - Log wait times to console

3. Export these functions with JSDoc:
   - scrapeUrl(url: string, options?: ScrapeOptions): Promise<ScrapeResult>
     * Respects rate limits
     * Returns structured result
     * Handles timeouts (default 30 seconds)
     * Logs progress

   - batchScrapeUrls(urls: string[], options?: ScrapeOptions): Promise<ScrapeResult[]>
     * Scrapes sequentially with rate limiting
     * Logs progress (X/Y completed)
     * Returns all results (success and failures)

   - extractTextFromHtml(html: string): string
     * Removes HTML tags
     * Decodes HTML entities
     * Collapses whitespace

   - countTokens(text: string): number
     * Rough approximation: 1 token ≈ 4 characters

4. For now, use placeholder scraping (we'll integrate real Firecrawl MCP later):
   - Return mock markdown and HTML content
   - Simulate delays for rate limiting
   - Log all actions

Add comprehensive error handling and console logging.
```

**Test Command:**
```bash
# Create test file
cat > lib/regulatory/test-firecrawl.ts << 'EOF'
import { scrapeUrl, batchScrapeUrls } from "./firecrawl-client";

async function test() {
  console.log("Test 1: Single URL scrape");
  const result = await scrapeUrl("https://www.fairwork.gov.au/pay-and-wages/minimum-wages");
  console.log(`Success: ${result.success}`);
  console.log(`Title: ${result.title}`);
  console.log(`Content length: ${result.markdown.length} chars\n`);

  console.log("Test 2: Batch scrape (2 URLs)");
  const urls = [
    "https://www.fairwork.gov.au/pay-and-wages/minimum-wages",
    "https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/payg-withholding",
  ];
  const results = await batchScrapeUrls(urls);
  console.log(`Completed: ${results.filter(r => r.success).length}/${urls.length} successful`);
}

test().catch(console.error);
EOF

tsx lib/regulatory/test-firecrawl.ts
```

---

## Prompt 2.2: Create Scraping Service

```
Create lib/regulatory/scraper.ts that orchestrates scraping jobs and saves to database.

Requirements:

1. Import dependencies:
   - db from @/lib/db
   - regulatoryDocument, regulatoryScrapeJob from @/lib/db/schema
   - scrapeUrl, extractTextFromHtml, countTokens from ./firecrawl-client
   - parseRegulatoryConfig, getSourcesByCountry, getSourcesByCategory, RegulatorySource from ./config-parser
   - eq, and from drizzle-orm

2. Export this interface:
interface ScrapeDocumentResult {
  action: "created" | "updated" | "unchanged" | "failed";
  documentId?: string;
  error?: string;
}

3. Export these functions with JSDoc:

   a) scrapeRegulatoryDocument(source: RegulatorySource): Promise<RegulatoryDocumentInsert | null>
      - Calls scrapeUrl() to fetch content
      - Extracts text and counts tokens
      - Returns RegulatoryDocumentInsert object ready for database
      - Returns null on failure
      - Logs progress

   b) scrapeAndSaveDocument(source: RegulatorySource): Promise<ScrapeDocumentResult>
      - Calls scrapeRegulatoryDocument()
      - Checks if document exists (by sourceUrl)
      - If new: insert into database
      - If exists and unchanged: update lastCheckedAt only
      - If exists and changed: archive old (status="superseded"), insert new
      - Returns result with action taken
      - Logs all database operations

   c) runScrapingJob(filters?: { country?: string; category?: string; priority?: string }): Promise<RegulatoryScrapeJob>
      - Creates job record with status="pending"
      - Gets sources from config based on filters
      - Updates job status to "in_progress"
      - Iterates sources, calling scrapeAndSaveDocument()
      - Counts created/updated/failed documents
      - Updates job with final stats and status="completed" or "failed"
      - Returns completed job record
      - Comprehensive logging throughout

4. Use Drizzle transactions for multi-step database operations (archiving + inserting).

5. Log all progress to console with emojis (✅ success, 🔄 update, ℹ️ unchanged, ❌ error).
```

**Test Command:**
```bash
# This won't work yet (no migration run), but should compile
pnpm tsc --noEmit
```

---

## Prompt 2.3: Add Database Query Helpers

```
Open lib/db/queries.ts and add these regulatory document query functions at the end of the file.

Add this section:

// ============================================================================
// Regulatory Document Queries
// ============================================================================

1. getRegulatoryDocuments(filters?: { country?: string; category?: string; status?: string; limit?: number })
   - Returns array of regulatory documents
   - Apply filters using AND conditions
   - Default limit: no limit (return all)
   - Use eq() and and() from drizzle-orm

2. getRegulatoryDocumentById(id: string)
   - Returns single document or undefined
   - Use eq() and limit(1)

3. getRegulatoryDocumentByUrl(url: string)
   - Returns single document by sourceUrl or undefined
   - Use eq() and limit(1)

4. getScrapingJobById(id: string)
   - Returns single scraping job or undefined

5. getRecentScrapingJobs(limit = 10)
   - Returns recent scraping jobs
   - Order by createdAt descending
   - Default limit: 10

All functions should be exported.
Add proper TypeScript return types.
Add JSDoc comments.

Also add the imports at the top:
import { regulatoryDocument, regulatoryScrapeJob } from "./schema";
```

**Test Command:**
```bash
pnpm tsc --noEmit
```

---

## Prompt 2.4: Create Manual Scrape API Route

```
Create app/api/regulatory/scrape/route.ts that allows manual triggering of scraping jobs.

Requirements:

1. Import:
   - NextResponse from "next/server"
   - getAuthUser from "@/lib/auth/clerk-helpers"
   - runScrapingJob from "@/lib/regulatory/scraper"
   - getRecentScrapingJobs from "@/lib/db/queries"

2. Export async POST function:
   - Require authentication (call getAuthUser())
   - Parse request body: { country?, category?, priority?, force? }
   - Call runScrapingJob() with filters
   - Return JSON: { success: true, jobId, status, documentsScraped, documentsUpdated }
   - Handle errors with 500 status
   - Log all actions

3. Export async GET function:
   - Require authentication
   - Call getRecentScrapingJobs(20)
   - Return JSON: { jobs: [...] }
   - Handle errors with 500 status

Create the directory structure if needed: app/api/regulatory/scrape/
```

**Test Command:**
```bash
pnpm tsc --noEmit
```

---

## Prompt 2.5: Update Regulatory Stats API

```
Open app/api/regulatory/stats/route.ts and replace the placeholder implementation with real database queries.

Requirements:

1. Import:
   - eq, and, count, max from "drizzle-orm"
   - db from "@/lib/db"
   - regulatoryDocument from "@/lib/db/schema"

2. In the GET function:
   - Query counts for each category (award, tax_ruling, payroll_tax) where status="active"
   - Query max(scrapedAt) for lastUpdated timestamp
   - Query total count of active documents
   - Return JSON with structure:
     {
       awards: number,
       taxRulings: number,
       payrollTax: number,
       lastUpdated: string | null,
       totalDocuments: number
     }

3. Use db.select({ count: count() }) pattern for counting.

4. Handle errors with try/catch and return 500 status.

Keep the authentication check at the top.
```

**Test Command:**
```bash
pnpm tsc --noEmit
```

---

# Phase 3: Search & Retrieval

## Prompt 3.1: Add Full-Text Search to Database

```
Create a database migration file for PostgreSQL full-text search.

Create: lib/db/migrations/0002_add_fulltext_search/migration.sql

Add this SQL:

-- Add tsvector column for full-text search
ALTER TABLE regulatory_document
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast searching
CREATE INDEX IF NOT EXISTS regulatory_document_search_vector_idx
ON regulatory_document
USING GIN(search_vector);

-- Function to update search_vector
CREATE OR REPLACE FUNCTION update_regulatory_document_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.extracted_text, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search_vector on insert/update
DROP TRIGGER IF EXISTS update_regulatory_document_search_vector_trigger ON regulatory_document;
CREATE TRIGGER update_regulatory_document_search_vector_trigger
BEFORE INSERT OR UPDATE ON regulatory_document
FOR EACH ROW
EXECUTE FUNCTION update_regulatory_document_search_vector();

-- Update existing rows
UPDATE regulatory_document
SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(extracted_text, '')), 'B')
WHERE search_vector IS NULL;

Also update lib/db/schema.ts to add this field to regulatoryDocument table:
searchVector: text("search_vector"),  // tsvector managed by database trigger

This is just for TypeScript types; the actual column is managed by the database trigger.
```

**Test Command:**
```bash
# Run migration manually via psql or Drizzle Studio SQL editor
# Or if you have DATABASE_URL set:
psql $POSTGRES_URL -f lib/db/migrations/0002_add_fulltext_search/migration.sql
```

---

## Prompt 3.2: Create Search Service

```
Create lib/regulatory/search.ts that implements full-text search for regulatory documents.

Requirements:

1. Export these interfaces:
interface SearchResult {
  documentId: string;
  title: string;
  sourceUrl: string;
  category: string;
  country: string;
  relevanceScore: number;
  excerpt: string;
  effectiveDate: Date | null;
  metadata: Record<string, unknown>;
}

interface SearchFilters {
  country?: string;
  category?: string[];
  dateRange?: { start: Date; end: Date };
  limit?: number;
}

2. Export these functions with JSDoc:

   a) searchRegulatoryDocuments(query: string, filters?: SearchFilters): Promise<SearchResult[]>
      - Uses PostgreSQL ts_rank() for relevance scoring
      - Uses ts_headline() to generate excerpts with highlighted query terms
      - Filters by country, category[], dateRange
      - Only searches active documents (status="active")
      - Orders by relevance score descending
      - Default limit: 10

   b) getSimilarDocuments(documentId: string, limit?: number): Promise<SearchResult[]>
      - Finds documents similar to the given document
      - Uses the source document's title as search query
      - Excludes the source document from results
      - Default limit: 5

   c) getDocumentsByCategory(category: string, limit?: number): Promise<RegulatoryDocument[]>
      - Simple category filter
      - Returns active documents only
      - Orders by scrapedAt descending
      - Default limit: 20

3. Implementation details:
   - Import db, regulatoryDocument, eq, and, sql, desc
   - Use sql template literals for full-text search:
     * plainto_tsquery('english', ${query})
     * ts_rank(${regulatoryDocument.searchVector}, plainto_tsquery(...))
     * ts_headline('english', ${regulatoryDocument.extractedText}, plainto_tsquery(...))
   - ts_headline options: 'MaxWords=50, MinWords=20, MaxFragments=1'
   - WHERE clause: search_vector @@ plainto_tsquery(...)

4. Error handling:
   - Wrap in try/catch
   - Log errors
   - Throw descriptive error messages
```

**Test Command:**
```bash
# Create test file
cat > lib/regulatory/test-search.ts << 'EOF'
import { searchRegulatoryDocuments, getDocumentsByCategory } from "./search";

async function test() {
  console.log("Test 1: Search 'minimum wage'");
  const results1 = await searchRegulatoryDocuments("minimum wage", {
    country: "AU",
    limit: 3,
  });
  console.log(`Found ${results1.length} results`);
  for (const r of results1) {
    console.log(`  - ${r.title} (score: ${r.relevanceScore.toFixed(3)})`);
  }

  console.log("\nTest 2: Get awards");
  const results2 = await getDocumentsByCategory("award", 3);
  console.log(`Found ${results2.length} awards`);
  for (const r of results2) {
    console.log(`  - ${r.title}`);
  }
}

test().catch(console.error);
EOF

# Note: This will fail until we have data in the database
pnpm tsc --noEmit
```

---

## Prompt 3.3: Create Search API Endpoint

```
Create app/api/regulatory/search/route.ts that exposes search functionality.

Requirements:

1. Import:
   - NextResponse from "next/server"
   - getAuthUser from "@/lib/auth/clerk-helpers"
   - searchRegulatoryDocuments, SearchFilters from "@/lib/regulatory/search"

2. Export async GET function:
   - Require authentication
   - Parse query parameters:
     * q: string (required) - the search query
     * country: string (optional)
     * category: string (optional, comma-separated)
     * limit: number (optional, default 10)
   - Validate that q is provided (return 400 if missing)
   - Build SearchFilters object
   - Call searchRegulatoryDocuments()
   - Return JSON: { query, filters, count, results }
   - Handle errors with 500 status

3. URL format example:
   /api/regulatory/search?q=minimum%20wage&country=AU&category=award,tax_ruling&limit=5
```

**Test Command:**
```bash
pnpm tsc --noEmit
```

---

# Phase 4: Q&A Agent Backend

## Prompt 4.1: Create Regulatory Search Tool

```
Create lib/ai/tools/regulatory-tools.ts that defines the regulatorySearch AI tool.

Requirements:

1. Import:
   - tool from "ai"
   - z from "zod"
   - searchRegulatoryDocuments from "@/lib/regulatory/search"

2. Create and export regulatorySearch tool:
   - Use tool() function with:
     * description: Detailed explanation of when to use (employment law, tax, payroll questions)
     * parameters: Zod schema with:
       - query: z.string() with description and examples
       - category: z.enum(["award", "tax_ruling", "payroll_tax", "all"]) optional, default "all"
       - limit: z.number() optional, default 5, cap at 10
     * execute: async function that:
       - Converts category filter (undefined if "all")
       - Calls searchRegulatoryDocuments with country="AU"
       - Returns formatted results with title, url, category, excerpt, relevanceScore
       - Returns { success: true/false, count, results, message? }
       - Handles errors gracefully

3. Export:
   - regulatoryTools object: { regulatorySearch }
   - REGULATORY_TOOL_NAMES array: Object.keys(regulatoryTools)

4. Description should tell the AI:
   - When to use it (Australian compliance questions)
   - What it returns (citations to official sources)
   - Give examples of good queries

Use the pattern from lib/ai/tools/xero-tools.ts as reference.
```

**Test Command:**
```bash
pnpm tsc --noEmit
```

---

## Prompt 4.2: Create Confidence Scoring System

```
Create lib/regulatory/confidence.ts that calculates confidence scores for AI responses.

Requirements:

1. Import ToolCall type (you may need to define it temporarily as: type ToolCall = any)

2. Export these functions with JSDoc:

   a) calculateConfidence(toolCalls: ToolCall[], responseText: string): number
      - Returns score between 0 and 1
      - Start with base score 0.5
      - Factor 1: Number of regulatory citations (max +0.3)
        * Count regulatorySearch tool calls
        * Add 0.1 per citation, max 0.3
      - Factor 2: Average relevance scores (max +0.2)
        * Extract relevanceScore from search results
        * Calculate average
        * Multiply by 0.2
      - Factor 3: Xero data integration (+0.15)
        * Check if any tool starts with "xero_"
        * Add 0.15 if found
      - Factor 4: Hedging language penalty (-0.1 to -0.3)
        * Call detectHedging()
        * Subtract penalty
      - Factor 5: Response length (-0.1 if < 100 chars)
      - Clamp final score between 0 and 1

   b) detectHedging(text: string): number
      - Returns penalty between 0 and 0.3
      - Check for phrases: "i'm not sure", "i don't know", "might be", "could be",
        "possibly", "perhaps", "uncertain", "unclear", "i think", "i believe", "probably", "may"
      - Count occurrences
      - Return min(count * 0.05, 0.3)

   c) requiresHumanReview(confidence: number, threshold = 0.6): boolean
      - Returns true if confidence < threshold

   d) extractCitations(toolCalls: ToolCall[]): Array<{ title: string; url: string; category: string }>
      - Filter for regulatorySearch tool calls
      - Extract results array
      - Map to citation objects with title, url, category
      - Remove duplicates by URL
      - Return array

3. Add helper function (not exported):
   - getAverageRelevance(toolCalls: ToolCall[]): number
     * Extract relevanceScore from all regulatorySearch results
     * Return average, or 0 if no results
```

**Test Command:**
```bash
pnpm tsc --noEmit
```

---

## Prompt 4.3: Create Q&A Agent API Endpoint

```
Create app/api/agents/qanda/route.ts that handles Q&A agent chat requests.

Requirements:

1. Import:
   - streamText from "ai"
   - NextResponse from "next/server"
   - getAuthUser from "@/lib/auth/clerk-helpers"
   - getModel from "@/lib/ai/providers"
   - regulatoryTools from "@/lib/ai/tools/regulatory-tools"
   - xeroTools from "@/lib/ai/tools/xero-tools"
   - getActiveXeroConnection from "@/lib/xero/connection-manager"
   - calculateConfidence, extractCitations, requiresHumanReview from "@/lib/regulatory/confidence"

2. Export: export const maxDuration = 60;

3. Define SYSTEM_PROMPT constant:
   "You are an Australian regulatory compliance assistant specializing in employment law, taxation, and payroll obligations.

   Your role is to:
   1. Answer questions about Australian Fair Work awards, minimum wages, and employment conditions
   2. Provide guidance on ATO tax rulings, PAYG withholding, and superannuation obligations
   3. Explain state-specific payroll tax requirements
   4. Reference official government sources and provide citations

   When answering:
   - Always cite specific regulatory documents using the regulatorySearch tool
   - Provide direct links to Fair Work, ATO, or state revenue office sources
   - Explain obligations clearly with practical examples
   - Indicate when professional advice is recommended for complex situations
   - If user has Xero connected, reference their actual business data when relevant

   Important:
   - Only provide information for Australia (AU) unless explicitly asked about other countries
   - Be specific about which state/territory regulations apply when discussing payroll tax
   - Always indicate the effective date of regulatory information
   - Distinguish between mandatory requirements and best practices"

4. Export async POST function:
   - Require authentication
   - Parse request body: { messages, settings }
   - Check for Xero connection (getActiveXeroConnection)
   - Build tools object (always include regulatoryTools, conditionally add xeroTools)
   - Get model from settings or default to "anthropic-claude-sonnet-4-5"
   - Call streamText with:
     * model
     * system: SYSTEM_PROMPT
     * messages
     * tools
     * maxSteps: 5
     * onFinish callback that:
       - Calculates confidence score
       - Extracts citations
       - Checks if review required
       - Logs to console: { userId, confidence, citationCount, needsReview, usage }
       - TODO comments for: save to database, trigger review notification
   - Return result.toDataStreamResponse()
   - Handle errors with 500 status

Create directory: app/api/agents/qanda/
```

**Test Command:**
```bash
pnpm tsc --noEmit
```

---

# Phase 5: Frontend Integration

## Prompt 5.1: Update Q&A Page with useChat Hook

```
Open app/agents/qanda/page.tsx and update it to use the real Q&A agent API.

Changes needed:

1. Add import:
   import { useChat } from "ai/react";

2. Replace the placeholder state (messages, setMessages, input, setInput, etc.) with:
   const {
     messages,
     input,
     handleInputChange,
     handleSubmit,
     isLoading,
     data,
   } = useChat({
     api: "/api/agents/qanda",
     body: {
       settings: {
         model: "anthropic-claude-sonnet-4-5",
         confidenceThreshold: 0.6,
       },
     },
   });

3. Remove the placeholder handleSendMessage function.

4. Update the form submission:
   - Form onSubmit should call handleSubmit
   - Textarea value should be input
   - Textarea onChange should be handleInputChange
   - Textarea onKeyDown: if Enter without Shift, preventDefault and call handleSubmit
   - Button disabled: isLoading || !input.trim()

5. Keep all existing UI code:
   - Knowledge base stats card
   - Conversation history display
   - Citation display
   - Confidence badges
   - Suggested questions
   - Stream controls

6. The messages from useChat will be in Vercel AI SDK format:
   - Each message has: id, role ("user" | "assistant"), content
   - For now, citations and confidence will be placeholders (we'll add data streaming later)

Only modify the state management and form handling. Keep all JSX as is.
```

**Test Command:**
```bash
pnpm tsc --noEmit
pnpm dev
# Visit http://localhost:3000/agents/qanda
```

---

# Phase 6: Human Review System

## Prompt 6.1: Add Review Request Schema

```
Open lib/db/schema.ts and add a new table for Q&A review requests.

Add this table after the existing tables:

export const qaReviewRequest = pgTable(
  "qa_review_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => User.id),
    messageId: text("message_id").notNull(),
    query: text("query").notNull(),
    response: text("response").notNull(),
    confidence: real("confidence").notNull(),
    citations: jsonb("citations"),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    assignedTo: uuid("assigned_to").references(() => User.id),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => ({
    userIdIdx: index("qa_review_request_user_id_idx").on(table.userId),
    statusIdx: index("qa_review_request_status_idx").on(table.status),
  })
);

Also add type exports:
export type QaReviewRequest = typeof qaReviewRequest.$inferSelect;
export type QaReviewRequestInsert = typeof qaReviewRequest.$inferInsert;

Then generate and run the migration:
1. pnpm db:generate
2. Review the migration file
3. pnpm db:migrate
```

**Test Command:**
```bash
pnpm db:generate
pnpm db:migrate
```

---

## Prompt 6.2: Create Review API Endpoint

```
Create app/api/agents/qanda/review/route.ts for handling review requests.

Requirements:

1. Import:
   - NextResponse from "next/server"
   - getAuthUser from "@/lib/auth/clerk-helpers"
   - db from "@/lib/db"
   - qaReviewRequest from "@/lib/db/schema"
   - eq, desc from "drizzle-orm"

2. Export async POST function:
   - Require authentication
   - Parse body: { messageId, query, response, confidence, citations }
   - Insert into qaReviewRequest table with:
     * userId: user.id
     * messageId, query, response, confidence, citations
     * status: "pending"
   - Return: { success: true, requestId }
   - Add TODO comment: "Send notification to compliance team"
   - Handle errors with 500 status

3. Export async GET function:
   - Require authentication
   - Query qaReviewRequest where userId = user.id
   - Order by createdAt descending
   - Limit 20
   - Return: { requests: [...] }
   - Handle errors with 500 status

Create directory: app/api/agents/qanda/review/
```

**Test Command:**
```bash
pnpm tsc --noEmit
```

---

# Phase 7: Vercel Cron Job

## Prompt 7.1: Create Cron Job Route

```
Create app/api/cron/regulatory-sync/route.ts for scheduled scraping.

Requirements:

1. Import:
   - NextResponse from "next/server"
   - runScrapingJob from "@/lib/regulatory/scraper"

2. Export async GET function:
   - Verify authorization header matches Bearer ${process.env.CRON_SECRET}
   - Return 401 if unauthorized
   - Log: "⏰ Scheduled regulatory sync started"
   - Call runScrapingJob with filters:
     * country: "AU"
     * priority: "high"
   - Log: "✅ Scheduled sync completed: X scraped"
   - Return JSON: { success: true, jobId, documentsScraped, documentsUpdated }
   - Handle errors: log "❌ Scheduled sync failed" and return 500

Create directory: app/api/cron/
```

**Test Command:**
```bash
pnpm tsc --noEmit
```

---

## Prompt 7.2: Configure Vercel Cron

```
Create or update vercel.json in the project root.

Add this cron configuration:

{
  "crons": [
    {
      "path": "/api/cron/regulatory-sync",
      "schedule": "0 2 * * *"
    }
  ]
}

This schedules the job to run daily at 2:00 AM UTC.

Also add CRON_SECRET to .env.example:
CRON_SECRET=your_secret_here

Instructions for the developer:
1. Generate a secret: openssl rand -base64 32
2. Add to .env.local: CRON_SECRET=<generated_secret>
3. Add to Vercel dashboard: Project Settings → Environment Variables → CRON_SECRET
```

**Test Command:**
```bash
cat vercel.json
grep CRON_SECRET .env.example
```

---

# Phase 8: Testing & Initial Data Population

## Prompt 8.1: Create Manual Test Script

```
Create a test script at scripts/test-qanda-system.ts that tests the entire system.

Requirements:

1. Import all necessary functions from lib/regulatory/

2. Create async function testSystem() that:
   - Tests config parser (parseRegulatoryConfig)
   - Tests scraping (runScrapingJob with high priority only)
   - Tests search (searchRegulatoryDocuments with sample queries)
   - Tests confidence scoring (with mock tool calls)
   - Logs all results with ✅ or ❌ indicators
   - Returns summary of tests passed/failed

3. Run with: tsx scripts/test-qanda-system.ts

Create directory: scripts/
```

**Test Command:**
```bash
tsx scripts/test-qanda-system.ts
```

---

## Prompt 8.2: Populate Initial Data

```
Create a script at scripts/populate-regulatory-data.ts that runs an initial full scrape.

Requirements:

1. Import runScrapingJob from lib/regulatory/scraper

2. Create async function populateData() that:
   - Logs "Starting full regulatory data population..."
   - Calls runScrapingJob({}) to scrape all sources
   - Logs progress
   - Prints final stats: documents scraped, updated, errors
   - Warns that this may take 30-60 minutes due to rate limiting

3. Run with: tsx scripts/populate-regulatory-data.ts

4. Add note in script comments:
   "This script should be run once to populate the database with initial regulatory content.
   After initial population, use the Vercel Cron job for daily updates."
```

**Test Command:**
```bash
# This will take 30-60 minutes to run
tsx scripts/populate-regulatory-data.ts
```

---

## Prompt 8.3: Update Documentation

```
Update CLAUDE.md with the implementation status of the Q&A agent.

Find the section "### Q&A Agent - Regulatory RAG System" and update:

**Implementation Status**: ~~UI complete, backend RAG system planned for future implementation~~
**FULLY IMPLEMENTED** ✅

Add a new subsection:

**Backend Implementation** (completed):
- Database schema: regulatoryDocument and regulatoryScrapeJob tables
- Configuration system: Markdown-based source management (config/regulatory-sources.md)
- Scraping infrastructure: Firecrawl integration with rate limiting
- Full-text search: PostgreSQL tsvector with GIN indexes
- AI tool: regulatorySearch tool for RAG retrieval
- Confidence scoring: Multi-factor algorithm with citation analysis
- API endpoints: /api/agents/qanda (chat), /api/regulatory/search, /api/regulatory/scrape
- Cron job: Daily scheduled sync via Vercel Cron
- Human review: Review request system for low-confidence responses

**Usage**:
Users can now ask regulatory questions directly in the Q&A agent at /agents/qanda:
- "What is the current minimum wage in Australia?"
- "What are my superannuation obligations?"
- "What is the payroll tax threshold in NSW?"

The agent searches the regulatory knowledge base and provides answers with citations to official government sources.
```

**Test Command:**
```bash
grep -A 20 "Q&A Agent - Regulatory RAG System" CLAUDE.md
```

---

## Final Verification Prompt

```
Run final system verification:

1. Check all files exist:
   - lib/db/schema.ts (with regulatory tables)
   - lib/regulatory/config-parser.ts
   - lib/regulatory/firecrawl-client.ts
   - lib/regulatory/scraper.ts
   - lib/regulatory/search.ts
   - lib/regulatory/confidence.ts
   - lib/ai/tools/regulatory-tools.ts
   - app/api/agents/qanda/route.ts
   - app/api/agents/qanda/review/route.ts
   - app/api/regulatory/scrape/route.ts
   - app/api/regulatory/search/route.ts
   - app/api/regulatory/stats/route.ts
   - app/api/cron/regulatory-sync/route.ts
   - config/regulatory-sources.md
   - vercel.json (with cron config)

2. Run type check: pnpm tsc --noEmit

3. Run dev server: pnpm dev

4. Test endpoints manually:
   - http://localhost:3000/api/regulatory/stats
   - http://localhost:3000/agents/qanda

5. If all checks pass, show summary:
   ✅ Phase 1: Database & Configuration
   ✅ Phase 2: Scraping Infrastructure
   ✅ Phase 3: Search & Retrieval
   ✅ Phase 4: Q&A Agent Backend
   ✅ Phase 5: Frontend Integration
   ✅ Phase 6: Human Review System
   ✅ Phase 7: Vercel Cron Job
   ✅ Phase 8: Testing & Launch

   🎉 Q&A Advisory Agent is fully implemented and ready for use!

Show me the verification results.
```

**Test Command:**
```bash
# All checks in one command
pnpm tsc --noEmit && echo "✅ TypeScript compilation successful" && \
ls -1 lib/regulatory/*.ts app/api/agents/qanda/*.ts app/api/regulatory/**/*.ts 2>/dev/null | wc -l && \
echo "files found"
```

---

## Post-Implementation Notes

After completing all prompts:

1. **Environment Variables**: Ensure these are set in .env.local:
   - FIRECRAWL_API_KEY
   - CRON_SECRET

2. **Database**: Run migrations with `pnpm db:migrate`

3. **Initial Data**: Run `tsx scripts/populate-regulatory-data.ts` (takes 30-60 min)

4. **Vercel Deployment**:
   - Set environment variables in Vercel dashboard
   - Deploy will automatically set up cron job from vercel.json

5. **Testing**: Visit /agents/qanda and ask questions like:
   - "What is the minimum wage in Australia?"
   - "What are superannuation guarantee rates?"
   - "NSW payroll tax thresholds?"

6. **Monitoring**: Check Drizzle Studio (`pnpm db:studio`) to see:
   - regulatory_document table populated
   - regulatory_scrape_job table with job history
   - qa_review_request table for escalations
