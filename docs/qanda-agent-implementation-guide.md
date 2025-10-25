# Q&A Advisory Agent - Complete Implementation Guide

**Target Audience:** Junior developers using AI coding tools (Claude Code, Cursor, GitHub Copilot)

**Estimated Total Time:** 14-20 days

**Prerequisites:**
- Basic understanding of TypeScript and Next.js
- Familiarity with Drizzle ORM
- Access to Firecrawl API account (free tier is sufficient)
- Understanding of async/await and promises
- Basic SQL knowledge

---

## How to Use This Guide

1. **Work Phase by Phase:** Complete each phase in order. Don't skip ahead.
2. **Use AI Tools:** Copy the provided prompts directly to your AI coding assistant.
3. **Test After Each Step:** Run the test commands provided before moving on.
4. **Ask for Help:** If stuck, use the "Troubleshooting" section at the end of each phase.
5. **Commit Often:** Commit your code after completing each major step.

---

# Phase 1: Database Schema & Configuration

**Goal:** Create database tables and configuration structure for storing regulatory documents.

**Estimated Time:** 1 day

---

## Step 1.1: Create Database Schema for Regulatory Documents

### What You're Building
Two new database tables to store regulatory documents (laws, awards, tax rulings) and track scraping jobs.

### Instructions for AI Tool

**Prompt to use with Claude Code/Cursor:**

```
I need to add two new tables to our Drizzle schema:

1. regulatoryDocument table with these fields:
   - id: UUID primary key
   - country: string (2-char code like "AU", indexed)
   - category: enum ("award", "tax_ruling", "payroll_tax", "custom")
   - title: string (not null)
   - sourceUrl: string (unique, not null)
   - content: text (raw HTML/markdown from scraping)
   - extractedText: text (plain text for search)
   - tokenCount: integer (number of tokens in extractedText)
   - effectiveDate: timestamp (nullable)
   - expiryDate: timestamp (nullable)
   - status: enum ("active", "superseded", "archived") default "active"
   - scrapedAt: timestamp (not null)
   - lastCheckedAt: timestamp (not null)
   - metadata: jsonb (additional data like jurisdiction, document type, etc.)
   - createdAt: timestamp (auto)
   - updatedAt: timestamp (auto)

2. regulatoryScrapeJob table with these fields:
   - id: UUID primary key
   - sourceUrl: string (not null)
   - country: string
   - category: string
   - status: enum ("pending", "in_progress", "completed", "failed") default "pending"
   - startedAt: timestamp (nullable)
   - completedAt: timestamp (nullable)
   - documentsScraped: integer default 0
   - documentsUpdated: integer default 0
   - documentsArchived: integer default 0
   - errorMessage: text (nullable)
   - metadata: jsonb (nullable)
   - createdAt: timestamp (auto)

Add these tables to lib/db/schema.ts following the existing pattern.
Create indexes on:
- regulatoryDocument: country, category, status, sourceUrl
- regulatoryScrapeJob: status, country, createdAt

Use the same patterns as existing tables (User, Chat, etc.) for timestamps and UUID generation.
```

### Step-by-Step Manual Instructions

1. **Open the file:** `lib/db/schema.ts`

2. **Add the new tables after the existing tables** (around line 200+):

```typescript
// Regulatory Document Storage
export const regulatoryDocument = pgTable(
  "regulatory_document",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    country: varchar("country", { length: 2 }).notNull(), // "AU", "NZ", "UK", "US"
    category: varchar("category", { length: 50 }).notNull(), // "award", "tax_ruling", "payroll_tax", "custom"
    title: text("title").notNull(),
    sourceUrl: text("source_url").notNull().unique(),
    content: text("content"), // Raw HTML/markdown
    extractedText: text("extracted_text"), // Plain text for search
    tokenCount: integer("token_count").default(0),
    effectiveDate: timestamp("effective_date"),
    expiryDate: timestamp("expiry_date"),
    status: varchar("status", { length: 20 }).default("active").notNull(), // "active", "superseded", "archived"
    scrapedAt: timestamp("scraped_at").notNull(),
    lastCheckedAt: timestamp("last_checked_at").notNull(),
    metadata: jsonb("metadata"), // Additional structured data
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    countryIdx: index("regulatory_document_country_idx").on(table.country),
    categoryIdx: index("regulatory_document_category_idx").on(table.category),
    statusIdx: index("regulatory_document_status_idx").on(table.status),
    sourceUrlIdx: index("regulatory_document_source_url_idx").on(table.sourceUrl),
  })
);

export const regulatoryScrapeJob = pgTable(
  "regulatory_scrape_job",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceUrl: text("source_url").notNull(),
    country: varchar("country", { length: 2 }),
    category: varchar("category", { length: 50 }),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // "pending", "in_progress", "completed", "failed"
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    documentsScraped: integer("documents_scraped").default(0),
    documentsUpdated: integer("documents_updated").default(0),
    documentsArchived: integer("documents_archived").default(0),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("regulatory_scrape_job_status_idx").on(table.status),
    countryIdx: index("regulatory_scrape_job_country_idx").on(table.country),
    createdAtIdx: index("regulatory_scrape_job_created_at_idx").on(table.createdAt),
  })
);

// Type exports for TypeScript
export type RegulatoryDocument = typeof regulatoryDocument.$inferSelect;
export type RegulatoryDocumentInsert = typeof regulatoryDocument.$inferInsert;
export type RegulatoryScrapeJob = typeof regulatoryScrapeJob.$inferSelect;
export type RegulatoryScrapeJobInsert = typeof regulatoryScrapeJob.$inferInsert;
```

3. **Save the file**

### Verify Your Work

Run this command to check for TypeScript errors:

```bash
pnpm tsc --noEmit
```

Expected result: No errors related to schema.ts

---

## Step 1.2: Generate Database Migration

### What You're Building
A migration file that will create the new tables in your PostgreSQL database.

### Instructions

1. **Generate the migration:**

```bash
pnpm db:generate
```

2. **Check the generated migration file:**
   - Look in `lib/db/migrations/` for a new folder with a timestamp
   - Open the `.sql` file inside
   - Verify it contains `CREATE TABLE` statements for both tables

3. **Review the migration:**

Expected SQL should look like:

```sql
CREATE TABLE IF NOT EXISTS "regulatory_document" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "country" varchar(2) NOT NULL,
  "category" varchar(50) NOT NULL,
  "title" text NOT NULL,
  "source_url" text NOT NULL UNIQUE,
  -- ... other fields
);

CREATE INDEX IF NOT EXISTS "regulatory_document_country_idx" ON "regulatory_document" ("country");
-- ... other indexes

CREATE TABLE IF NOT EXISTS "regulatory_scrape_job" (
  -- ... fields
);
```

### Test the Migration (Don't Run Yet!)

**Important:** Don't run `pnpm db:migrate` yet. We'll do that after completing all Phase 1 steps.

---

## Step 1.3: Create Regulatory Sources Configuration Directory

### What You're Building
A configuration file where non-developers can manage regulatory sources without touching code.

### Instructions

1. **Create the config directory:**

```bash
mkdir -p config
```

2. **Create the configuration file:**

```bash
touch config/regulatory-sources.md
```

3. **Add the configuration structure:**

**Prompt for AI Tool:**

```
Create a markdown configuration file at config/regulatory-sources.md with this structure:

# Regulatory Sources Configuration

This file defines which regulatory sources to scrape and monitor. Each source should include:
- **Source Type:** web_scraping (future: api, manual_upload)
- **URL:** The webpage to scrape
- **Update Frequency:** daily, weekly, monthly, quarterly
- **Priority:** high, medium, low
- **Category:** award, tax_ruling, payroll_tax, custom

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
```

4. **Save the file**

### Verify Your Work

Check that the file exists and has content:

```bash
cat config/regulatory-sources.md | head -20
```

Expected: You should see the markdown heading and first few sources.

---

## Step 1.4: Create Configuration Parser

### What You're Building
A TypeScript module that reads the markdown file and converts it into structured data.

### Instructions for AI Tool

**Prompt:**

```
Create a new file at lib/regulatory/config-parser.ts that parses the regulatory-sources.md file.

The parser should:
1. Read config/regulatory-sources.md
2. Parse the markdown structure (headings and bullet lists)
3. Extract country (## headings), section (### headings), subsection (#### headings)
4. Parse the bullet points for Source Type, URL, Update Frequency, Priority, Category
5. Return an array of RegulatorySource objects

TypeScript interface:

interface RegulatorySource {
  country: string; // "AU", "NZ", etc.
  section: string; // "Fair Work (Employment Law)"
  subsection: string; // "Minimum Wages"
  sourceType: string; // "web_scraping"
  url: string;
  updateFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  priority: 'high' | 'medium' | 'low';
  category: 'award' | 'tax_ruling' | 'payroll_tax' | 'custom';
}

Export these functions:
- parseRegulatoryConfig(): Promise<RegulatorySource[]>
- getSourcesByCountry(country: string): Promise<RegulatorySource[]>
- getSourcesByCategory(category: string): Promise<RegulatorySource[]>
- getSourcesByPriority(priority: string): Promise<RegulatorySource[]>

Use fs/promises to read the file.
Handle errors gracefully (file not found, invalid format).
Add JSDoc comments to all exported functions.
```

### Step-by-Step Manual Instructions

1. **Create the directory:**

```bash
mkdir -p lib/regulatory
```

2. **Create the file:**

```bash
touch lib/regulatory/config-parser.ts
```

3. **Add the implementation:**

```typescript
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Represents a regulatory source defined in the configuration file
 */
export interface RegulatorySource {
  country: string;
  section: string;
  subsection: string;
  sourceType: string;
  url: string;
  updateFrequency: "daily" | "weekly" | "monthly" | "quarterly";
  priority: "high" | "medium" | "low";
  category: "award" | "tax_ruling" | "payroll_tax" | "custom";
}

/**
 * Parses the regulatory-sources.md configuration file
 * @returns Array of parsed regulatory sources
 * @throws Error if file cannot be read or parsed
 */
export async function parseRegulatoryConfig(): Promise<RegulatorySource[]> {
  try {
    const configPath = join(process.cwd(), "config", "regulatory-sources.md");
    const content = await readFile(configPath, "utf-8");

    const sources: RegulatorySource[] = [];
    const lines = content.split("\n");

    let currentCountry = "";
    let currentSection = "";
    let currentSubsection = "";
    let currentSource: Partial<RegulatorySource> = {};

    for (const line of lines) {
      // Parse country (## Australia (AU))
      if (line.startsWith("## ")) {
        const match = line.match(/##\s+(.+?)\s+\((\w+)\)/);
        if (match) {
          currentCountry = match[2]; // Extract country code
        }
      }

      // Parse section (### Fair Work)
      if (line.startsWith("### ")) {
        currentSection = line.replace(/^###\s+/, "").trim();
      }

      // Parse subsection (#### Minimum Wages)
      if (line.startsWith("#### ")) {
        // Save previous source if exists
        if (currentSource.url) {
          sources.push(currentSource as RegulatorySource);
        }

        currentSubsection = line.replace(/^####\s+/, "").trim();
        currentSource = {
          country: currentCountry,
          section: currentSection,
          subsection: currentSubsection,
        };
      }

      // Parse bullet points
      if (line.startsWith("- **")) {
        const match = line.match(/- \*\*(.+?):\*\*\s+(.+)/);
        if (match) {
          const [, key, value] = match;

          switch (key) {
            case "Source Type":
              currentSource.sourceType = value.trim();
              break;
            case "URL":
              currentSource.url = value.trim();
              break;
            case "Update Frequency":
              currentSource.updateFrequency = value.trim() as RegulatorySource["updateFrequency"];
              break;
            case "Priority":
              currentSource.priority = value.trim() as RegulatorySource["priority"];
              break;
            case "Category":
              currentSource.category = value.trim() as RegulatorySource["category"];
              break;
          }
        }
      }
    }

    // Add the last source
    if (currentSource.url) {
      sources.push(currentSource as RegulatorySource);
    }

    return sources;
  } catch (error) {
    throw new Error(`Failed to parse regulatory config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get regulatory sources filtered by country
 * @param country - Two-letter country code (e.g., "AU", "NZ")
 * @returns Filtered array of sources
 */
export async function getSourcesByCountry(country: string): Promise<RegulatorySource[]> {
  const sources = await parseRegulatoryConfig();
  return sources.filter((s) => s.country === country.toUpperCase());
}

/**
 * Get regulatory sources filtered by category
 * @param category - Category type (award, tax_ruling, payroll_tax, custom)
 * @returns Filtered array of sources
 */
export async function getSourcesByCategory(category: string): Promise<RegulatorySource[]> {
  const sources = await parseRegulatoryConfig();
  return sources.filter((s) => s.category === category);
}

/**
 * Get regulatory sources filtered by priority
 * @param priority - Priority level (high, medium, low)
 * @returns Filtered array of sources
 */
export async function getSourcesByPriority(priority: string): Promise<RegulatorySource[]> {
  const sources = await parseRegulatoryConfig();
  return sources.filter((s) => s.priority === priority);
}
```

4. **Save the file**

### Test Your Parser

Create a simple test script:

```bash
touch lib/regulatory/test-parser.ts
```

Add this content:

```typescript
import { parseRegulatoryConfig, getSourcesByCountry } from "./config-parser";

async function testParser() {
  try {
    console.log("Testing regulatory config parser...\n");

    const allSources = await parseRegulatoryConfig();
    console.log(`✅ Parsed ${allSources.length} sources total\n`);

    const auSources = await getSourcesByCountry("AU");
    console.log(`✅ Found ${auSources.length} Australian sources\n`);

    console.log("Sample source:");
    console.log(JSON.stringify(auSources[0], null, 2));
  } catch (error) {
    console.error("❌ Parser test failed:", error);
  }
}

testParser();
```

Run the test:

```bash
tsx lib/regulatory/test-parser.ts
```

Expected output:
```
Testing regulatory config parser...

✅ Parsed 15 sources total

✅ Found 15 Australian sources

Sample source:
{
  "country": "AU",
  "section": "Fair Work (Employment Law)",
  "subsection": "Minimum Wages",
  "sourceType": "web_scraping",
  "url": "https://www.fairwork.gov.au/pay-and-wages/minimum-wages",
  "updateFrequency": "weekly",
  "priority": "high",
  "category": "award"
}
```

---

## Step 1.5: Run Database Migration

### What You're Building
Applying the schema changes to your actual database.

### Instructions

1. **Double-check your database connection:**

```bash
echo $POSTGRES_URL
```

Expected: Should show your database connection string.

2. **Run the migration:**

```bash
pnpm db:migrate
```

3. **Verify the migration succeeded:**

Expected output:
```
Migrating...
✅ Migration successful
```

4. **Open Drizzle Studio to verify tables exist:**

```bash
pnpm db:studio
```

Navigate to http://localhost:4983 in your browser.

Expected: You should see `regulatory_document` and `regulatory_scrape_job` tables in the left sidebar.

---

## Phase 1 Completion Checklist

Before moving to Phase 2, verify:

- [ ] `lib/db/schema.ts` contains both new tables
- [ ] Migration file was generated in `lib/db/migrations/`
- [ ] Migration ran successfully with `pnpm db:migrate`
- [ ] Tables appear in Drizzle Studio
- [ ] `config/regulatory-sources.md` exists and has content
- [ ] `lib/regulatory/config-parser.ts` exists
- [ ] Parser test script runs without errors
- [ ] Parser returns 15+ sources for Australia

### Commit Your Work

```bash
git add .
git commit -m "feat(regulatory): add database schema and config parser

- Add regulatoryDocument and regulatoryScrapeJob tables
- Create regulatory-sources.md configuration file
- Implement config parser with filtering functions
- Add migration for regulatory tables"
```

### Troubleshooting

**Problem:** Migration fails with "relation already exists"
**Solution:** Check if tables exist already. Drop them with Drizzle Studio or run:
```sql
DROP TABLE IF EXISTS regulatory_scrape_job CASCADE;
DROP TABLE IF EXISTS regulatory_document CASCADE;
```

**Problem:** Parser returns 0 sources
**Solution:** Check the markdown file format. Make sure country headings have the format `## Country Name (CODE)`.

**Problem:** TypeScript errors about missing types
**Solution:** Run `pnpm install` to ensure all dependencies are installed.

---

# Phase 2: Scraping Infrastructure

**Goal:** Build the system that automatically downloads and stores regulatory content.

**Estimated Time:** 3-4 days

---

## Step 2.1: Set Up Firecrawl API

### What You're Building
Configuration to use Firecrawl for web scraping regulatory sites.

### Instructions

1. **Sign up for Firecrawl:**
   - Go to https://firecrawl.dev
   - Create a free account
   - Get your API key from the dashboard

2. **Add API key to environment:**

Open `.env.local` and add:

```bash
FIRECRAWL_API_KEY=fc-your-api-key-here
```

3. **Add to `.env.example` for team members:**

```bash
echo "FIRECRAWL_API_KEY=fc-your-api-key" >> .env.example
```

4. **Verify Firecrawl MCP is available:**

Check if the Firecrawl MCP tools are working:

```bash
# In Claude Code or your terminal
pnpm dev
```

Then in Claude Code, ask:
```
Use the firecrawl_scrape tool to scrape https://www.fairwork.gov.au/pay-and-wages/minimum-wages and return the markdown content.
```

Expected: You should get markdown content from the Fair Work website.

---

## Step 2.2: Create Firecrawl Wrapper

### What You're Building
A TypeScript wrapper around Firecrawl MCP that handles rate limiting and errors.

### Instructions for AI Tool

**Prompt:**

```
Create lib/regulatory/firecrawl-client.ts that wraps the Firecrawl MCP client with:

1. A scrapeUrl function that:
   - Takes a URL string
   - Uses the mcp__firecrawl__firecrawl_scrape tool
   - Returns { markdown: string, html: string, success: boolean, error?: string }
   - Handles errors gracefully
   - Implements rate limiting (1 request per 2 seconds for free tier)

2. A batchScrapeUrls function that:
   - Takes an array of URLs
   - Scrapes them sequentially with delays
   - Returns an array of results
   - Logs progress

3. Export TypeScript types:
   - ScrapeResult
   - ScrapeOptions

Use the existing MCP client pattern from lib/ai/xero-mcp-client.ts as reference.
Add JSDoc comments.
Handle timeouts (30 seconds per URL).
```

### Step-by-Step Manual Instructions

1. **Create the file:**

```bash
touch lib/regulatory/firecrawl-client.ts
```

2. **Add the implementation:**

```typescript
/**
 * Firecrawl client for web scraping regulatory documents
 * Uses Firecrawl MCP server with rate limiting and error handling
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

export interface ScrapeOptions {
  formats?: ("markdown" | "html")[];
  onlyMainContent?: boolean;
  timeout?: number; // milliseconds
}

// Rate limiting: 1 request per 2 seconds (free tier limit)
const RATE_LIMIT_DELAY = 2000;
let lastRequestTime = 0;

/**
 * Wait to respect rate limits
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
    console.log(`⏳ Rate limit: waiting ${waitTime}ms`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

/**
 * Scrape a single URL using Firecrawl
 * @param url - The URL to scrape
 * @param options - Scraping options
 * @returns Scrape result with markdown and HTML content
 */
export async function scrapeUrl(
  url: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const {
    formats = ["markdown", "html"],
    onlyMainContent = true,
    timeout = 30000,
  } = options;

  try {
    // Respect rate limits
    await waitForRateLimit();

    console.log(`🔍 Scraping: ${url}`);

    // Note: In production, this would call the actual Firecrawl MCP tool
    // For now, we'll simulate the structure
    // You'll need to integrate with your MCP client when running

    // Placeholder for actual MCP call:
    // const result = await mcpClient.call('mcp__firecrawl__firecrawl_scrape', {
    //   url,
    //   formats,
    //   onlyMainContent,
    // });

    // For development, return a mock structure
    const result = {
      markdown: `# Content from ${url}\n\nThis is placeholder content.`,
      html: `<h1>Content from ${url}</h1><p>This is placeholder content.</p>`,
      metadata: {
        title: `Document from ${url}`,
      },
    };

    console.log(`✅ Scraped: ${url}`);

    return {
      url,
      markdown: result.markdown || "",
      html: result.html || "",
      title: result.metadata?.title,
      success: true,
      scrapedAt: new Date(),
    };
  } catch (error) {
    console.error(`❌ Failed to scrape ${url}:`, error);

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
 * Scrape multiple URLs sequentially with rate limiting
 * @param urls - Array of URLs to scrape
 * @param options - Scraping options
 * @returns Array of scrape results
 */
export async function batchScrapeUrls(
  urls: string[],
  options: ScrapeOptions = {}
): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];

  console.log(`📋 Starting batch scrape of ${urls.length} URLs`);

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n[${i + 1}/${urls.length}] Processing: ${url}`);

    const result = await scrapeUrl(url, options);
    results.push(result);

    // Log progress
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    console.log(`Progress: ${successCount} success, ${failCount} failed`);
  }

  console.log(`\n✅ Batch scrape complete: ${results.length} URLs processed`);

  return results;
}

/**
 * Extract plain text from HTML content
 * @param html - HTML string
 * @returns Plain text without HTML tags
 */
export function extractTextFromHtml(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, " ");

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Collapse multiple spaces
  text = text.replace(/\s+/g, " ");

  return text.trim();
}

/**
 * Count tokens in text (approximate)
 * @param text - Text to count tokens in
 * @returns Approximate token count
 */
export function countTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters
  // This is a simplified version; in production use a proper tokenizer
  return Math.ceil(text.length / 4);
}
```

3. **Save the file**

### Test the Firecrawl Client

Create a test script:

```bash
touch lib/regulatory/test-firecrawl.ts
```

Add content:

```typescript
import { scrapeUrl, batchScrapeUrls } from "./firecrawl-client";

async function testFirecrawl() {
  console.log("Testing Firecrawl client...\n");

  // Test single URL
  const singleResult = await scrapeUrl("https://www.fairwork.gov.au/pay-and-wages/minimum-wages");
  console.log("\nSingle scrape result:");
  console.log(`Success: ${singleResult.success}`);
  console.log(`Title: ${singleResult.title}`);
  console.log(`Markdown length: ${singleResult.markdown.length} chars`);

  // Test batch scraping
  const urls = [
    "https://www.fairwork.gov.au/pay-and-wages/minimum-wages",
    "https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/payg-withholding",
  ];

  const batchResults = await batchScrapeUrls(urls);
  console.log(`\nBatch scrape: ${batchResults.filter((r) => r.success).length}/${urls.length} successful`);
}

testFirecrawl();
```

Run:

```bash
tsx lib/regulatory/test-firecrawl.ts
```

Expected output shows rate limiting delays and successful scrapes.

---

## Step 2.3: Create Scraping Service

### What You're Building
The main service that orchestrates scraping jobs and saves to database.

### Instructions for AI Tool

**Prompt:**

```
Create lib/regulatory/scraper.ts that implements the main scraping service.

The service should:

1. Export a scrapeRegulatoryDocument function that:
   - Takes a RegulatorySource (from config parser)
   - Uses firecrawl-client to scrape the URL
   - Extracts text and counts tokens
   - Returns a RegulatoryDocumentInsert object ready for database insertion
   - Handles errors (returns null if scraping fails)

2. Export a scrapeAndSaveDocument function that:
   - Takes a RegulatorySource and database connection
   - Calls scrapeRegulatoryDocument
   - Checks if document already exists (by sourceUrl)
   - If exists and content unchanged: update lastCheckedAt
   - If exists and content changed: archive old, insert new
   - If new: insert
   - Returns { action: 'created' | 'updated' | 'unchanged', documentId: string }

3. Export a runScrapingJob function that:
   - Takes filters (country?, category?, priority?)
   - Creates a RegulatoryScrapeJob record with status "pending"
   - Gets sources from config parser based on filters
   - Updates job status to "in_progress"
   - Iterates through sources, calling scrapeAndSaveDocument
   - Updates job with stats (documentsScraped, documentsUpdated, etc.)
   - Updates job status to "completed" or "failed"
   - Returns the job record

Use transactions for database operations.
Add comprehensive error handling.
Log progress to console.
Import db from lib/db and use Drizzle queries.
```

### Step-by-Step Manual Instructions

1. **Create the file:**

```bash
touch lib/regulatory/scraper.ts
```

2. **Add imports and types:**

```typescript
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  regulatoryDocument,
  regulatoryScrapeJob,
  type RegulatoryDocumentInsert,
  type RegulatoryScrapeJobInsert,
} from "@/lib/db/schema";
import { scrapeUrl, extractTextFromHtml, countTokens } from "./firecrawl-client";
import {
  parseRegulatoryConfig,
  getSourcesByCountry,
  getSourcesByCategory,
  type RegulatorySource,
} from "./config-parser";

interface ScrapeDocumentResult {
  action: "created" | "updated" | "unchanged" | "failed";
  documentId?: string;
  error?: string;
}
```

3. **Add the scrapeRegulatoryDocument function:**

```typescript
/**
 * Scrape a regulatory document from a source URL
 * @param source - The regulatory source to scrape
 * @returns Document data ready for database insertion, or null if scraping failed
 */
export async function scrapeRegulatoryDocument(
  source: RegulatorySource
): Promise<RegulatoryDocumentInsert | null> {
  try {
    const scrapeResult = await scrapeUrl(source.url);

    if (!scrapeResult.success) {
      console.error(`Failed to scrape ${source.url}: ${scrapeResult.error}`);
      return null;
    }

    const extractedText = extractTextFromHtml(scrapeResult.html);
    const tokenCount = countTokens(extractedText);

    const document: RegulatoryDocumentInsert = {
      country: source.country,
      category: source.category,
      title: scrapeResult.title || source.subsection,
      sourceUrl: source.url,
      content: scrapeResult.html,
      extractedText,
      tokenCount,
      status: "active",
      scrapedAt: scrapeResult.scrapedAt,
      lastCheckedAt: scrapeResult.scrapedAt,
      metadata: {
        section: source.section,
        subsection: source.subsection,
        updateFrequency: source.updateFrequency,
        priority: source.priority,
      },
    };

    return document;
  } catch (error) {
    console.error(`Error scraping ${source.url}:`, error);
    return null;
  }
}
```

4. **Add the scrapeAndSaveDocument function:**

```typescript
/**
 * Scrape a document and save to database (create, update, or leave unchanged)
 * @param source - The regulatory source to scrape
 * @returns Result indicating what action was taken
 */
export async function scrapeAndSaveDocument(
  source: RegulatorySource
): Promise<ScrapeDocumentResult> {
  try {
    // Scrape the document
    const newDocument = await scrapeRegulatoryDocument(source);

    if (!newDocument) {
      return {
        action: "failed",
        error: "Scraping failed",
      };
    }

    // Check if document already exists
    const existing = await db
      .select()
      .from(regulatoryDocument)
      .where(eq(regulatoryDocument.sourceUrl, source.url))
      .limit(1);

    if (existing.length === 0) {
      // New document - insert
      const [inserted] = await db
        .insert(regulatoryDocument)
        .values(newDocument)
        .returning({ id: regulatoryDocument.id });

      console.log(`✅ Created new document: ${source.subsection}`);

      return {
        action: "created",
        documentId: inserted.id,
      };
    }

    const existingDoc = existing[0];

    // Check if content changed
    const contentChanged = existingDoc.extractedText !== newDocument.extractedText;

    if (!contentChanged) {
      // Content unchanged - just update lastCheckedAt
      await db
        .update(regulatoryDocument)
        .set({ lastCheckedAt: new Date() })
        .where(eq(regulatoryDocument.id, existingDoc.id));

      console.log(`ℹ️  No changes: ${source.subsection}`);

      return {
        action: "unchanged",
        documentId: existingDoc.id,
      };
    }

    // Content changed - archive old and insert new
    await db.transaction(async (tx) => {
      // Archive the old version
      await tx
        .update(regulatoryDocument)
        .set({
          status: "superseded",
          updatedAt: new Date(),
        })
        .where(eq(regulatoryDocument.id, existingDoc.id));

      // Insert the new version
      await tx.insert(regulatoryDocument).values(newDocument);
    });

    console.log(`🔄 Updated document: ${source.subsection}`);

    return {
      action: "updated",
      documentId: existingDoc.id,
    };
  } catch (error) {
    console.error(`Error saving document for ${source.url}:`, error);
    return {
      action: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

5. **Add the runScrapingJob function:**

```typescript
/**
 * Run a complete scraping job with filters
 * @param filters - Optional filters for country, category, priority
 * @returns The completed job record
 */
export async function runScrapingJob(filters?: {
  country?: string;
  category?: string;
  priority?: string;
}): Promise<typeof regulatoryScrapeJob.$inferSelect> {
  // Create job record
  const [job] = await db
    .insert(regulatoryScrapeJob)
    .values({
      sourceUrl: "batch_job",
      country: filters?.country,
      category: filters?.category,
      status: "pending",
      metadata: filters,
    })
    .returning();

  console.log(`\n🚀 Starting scraping job ${job.id}`);
  console.log(`Filters: ${JSON.stringify(filters || {})}\n`);

  try {
    // Update job to in_progress
    await db
      .update(regulatoryScrapeJob)
      .set({
        status: "in_progress",
        startedAt: new Date(),
      })
      .where(eq(regulatoryScrapeJob.id, job.id));

    // Get sources based on filters
    let sources: RegulatorySource[] = [];

    if (filters?.country) {
      sources = await getSourcesByCountry(filters.country);
    } else if (filters?.category) {
      sources = await getSourcesByCategory(filters.category);
    } else {
      sources = await parseRegulatoryConfig();
    }

    // Apply priority filter if specified
    if (filters?.priority) {
      sources = sources.filter((s) => s.priority === filters.priority);
    }

    console.log(`📋 Found ${sources.length} sources to scrape\n`);

    // Scrape each source
    let documentsScraped = 0;
    let documentsUpdated = 0;
    let documentsArchived = 0;
    const errors: string[] = [];

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      console.log(`\n[${i + 1}/${sources.length}] ${source.subsection}`);

      const result = await scrapeAndSaveDocument(source);

      switch (result.action) {
        case "created":
          documentsScraped++;
          break;
        case "updated":
          documentsUpdated++;
          documentsArchived++; // Old version was archived
          break;
        case "failed":
          errors.push(`${source.url}: ${result.error}`);
          break;
      }
    }

    // Update job as completed
    const [completedJob] = await db
      .update(regulatoryScrapeJob)
      .set({
        status: "completed",
        completedAt: new Date(),
        documentsScraped,
        documentsUpdated,
        documentsArchived,
      })
      .where(eq(regulatoryScrapeJob.id, job.id))
      .returning();

    console.log(`\n✅ Job completed successfully!`);
    console.log(`Created: ${documentsScraped}`);
    console.log(`Updated: ${documentsUpdated}`);
    console.log(`Errors: ${errors.length}`);

    return completedJob;
  } catch (error) {
    // Mark job as failed
    const errorMessage = error instanceof Error ? error.message : String(error);

    await db
      .update(regulatoryScrapeJob)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage,
      })
      .where(eq(regulatoryScrapeJob.id, job.id));

    console.error(`\n❌ Job failed: ${errorMessage}`);

    throw error;
  }
}
```

6. **Save the file**

---

## Step 2.4: Create Database Query Helpers

### What You're Building
Reusable database query functions for regulatory documents.

### Instructions

1. **Open `lib/db/queries.ts`**

2. **Add these functions at the end of the file:**

```typescript
// ============================================================================
// Regulatory Document Queries
// ============================================================================

/**
 * Get regulatory documents with filters
 */
export async function getRegulatoryDocuments(filters?: {
  country?: string;
  category?: string;
  status?: string;
  limit?: number;
}) {
  let query = db.select().from(regulatoryDocument);

  // Apply filters
  const conditions = [];
  if (filters?.country) {
    conditions.push(eq(regulatoryDocument.country, filters.country));
  }
  if (filters?.category) {
    conditions.push(eq(regulatoryDocument.category, filters.category));
  }
  if (filters?.status) {
    conditions.push(eq(regulatoryDocument.status, filters.status));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  return await query;
}

/**
 * Get regulatory document by ID
 */
export async function getRegulatoryDocumentById(id: string) {
  const [document] = await db
    .select()
    .from(regulatoryDocument)
    .where(eq(regulatoryDocument.id, id))
    .limit(1);

  return document;
}

/**
 * Get regulatory document by source URL
 */
export async function getRegulatoryDocumentByUrl(url: string) {
  const [document] = await db
    .select()
    .from(regulatoryDocument)
    .where(eq(regulatoryDocument.sourceUrl, url))
    .limit(1);

  return document;
}

/**
 * Get scraping job by ID
 */
export async function getScrapingJobById(id: string) {
  const [job] = await db
    .select()
    .from(regulatoryScrapeJob)
    .where(eq(regulatoryScrapeJob.id, id))
    .limit(1);

  return job;
}

/**
 * Get recent scraping jobs
 */
export async function getRecentScrapingJobs(limit = 10) {
  return await db
    .select()
    .from(regulatoryScrapeJob)
    .orderBy(desc(regulatoryScrapeJob.createdAt))
    .limit(limit);
}
```

3. **Add the import for `regulatoryDocument` and `regulatoryScrapeJob` at the top:**

```typescript
import {
  // ... existing imports
  regulatoryDocument,
  regulatoryScrapeJob,
} from "./schema";
```

---

## Step 2.5: Create Manual Scrape API Route

### What You're Building
An API endpoint that lets you trigger scraping manually from the UI.

### Instructions

1. **Create the directory and file:**

```bash
mkdir -p app/api/regulatory/scrape
touch app/api/regulatory/scrape/route.ts
```

2. **Add the route implementation:**

```typescript
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { runScrapingJob } from "@/lib/regulatory/scraper";

export async function POST(req: Request) {
  try {
    // Require authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add admin role check when roles are implemented
    // For now, any authenticated user can trigger scraping

    // Parse request body
    const body = await req.json();
    const { country, category, priority, force } = body;

    // Start scraping job
    console.log("🔍 Manual scrape triggered by user:", user.email);

    const job = await runScrapingJob({
      country,
      category,
      priority,
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      documentsScraped: job.documentsScraped,
      documentsUpdated: job.documentsUpdated,
    });
  } catch (error) {
    console.error("Error in manual scrape:", error);

    return NextResponse.json(
      {
        error: "Failed to start scraping job",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recent scraping jobs
    const { getRecentScrapingJobs } = await import("@/lib/db/queries");
    const jobs = await getRecentScrapingJobs(20);

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Error fetching scraping jobs:", error);

    return NextResponse.json(
      { error: "Failed to fetch scraping jobs" },
      { status: 500 }
    );
  }
}
```

---

## Step 2.6: Update Stats API Route

### What You're Building
Update the placeholder stats API to return real database counts.

### Instructions

1. **Open `app/api/regulatory/stats/route.ts`**

2. **Replace the entire file with:**

```typescript
import { NextResponse } from "next/server";
import { eq, and, count, max, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { db } from "@/lib/db";
import { regulatoryDocument } from "@/lib/db/schema";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get counts by category
    const awardsResult = await db
      .select({ count: count() })
      .from(regulatoryDocument)
      .where(
        and(
          eq(regulatoryDocument.category, "award"),
          eq(regulatoryDocument.status, "active")
        )
      );

    const taxRulingsResult = await db
      .select({ count: count() })
      .from(regulatoryDocument)
      .where(
        and(
          eq(regulatoryDocument.category, "tax_ruling"),
          eq(regulatoryDocument.status, "active")
        )
      );

    const payrollTaxResult = await db
      .select({ count: count() })
      .from(regulatoryDocument)
      .where(
        and(
          eq(regulatoryDocument.category, "payroll_tax"),
          eq(regulatoryDocument.status, "active")
        )
      );

    // Get last updated timestamp
    const lastUpdatedResult = await db
      .select({ maxScrapedAt: max(regulatoryDocument.scrapedAt) })
      .from(regulatoryDocument)
      .where(eq(regulatoryDocument.status, "active"));

    // Get total documents
    const totalResult = await db
      .select({ count: count() })
      .from(regulatoryDocument)
      .where(eq(regulatoryDocument.status, "active"));

    const stats = {
      awards: awardsResult[0]?.count || 0,
      taxRulings: taxRulingsResult[0]?.count || 0,
      payrollTax: payrollTaxResult[0]?.count || 0,
      lastUpdated: lastUpdatedResult[0]?.maxScrapedAt?.toISOString() || null,
      totalDocuments: totalResult[0]?.count || 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching regulatory stats:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch regulatory stats",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
```

---

## Step 2.7: Test the Scraping System

### Manual Test

1. **Start your development server:**

```bash
pnpm dev
```

2. **Trigger a test scrape using curl:**

```bash
curl -X POST http://localhost:3000/api/regulatory/scrape \
  -H "Content-Type: application/json" \
  -d '{"country": "AU", "priority": "high"}'
```

Expected response:
```json
{
  "success": true,
  "jobId": "...",
  "status": "completed",
  "documentsScraped": 5,
  "documentsUpdated": 0
}
```

3. **Check the stats:**

```bash
curl http://localhost:3000/api/regulatory/stats
```

Expected response:
```json
{
  "awards": 2,
  "taxRulings": 3,
  "payrollTax": 8,
  "lastUpdated": "2025-01-15T10:30:00.000Z",
  "totalDocuments": 13
}
```

4. **Verify in Drizzle Studio:**

```bash
pnpm db:studio
```

Navigate to `regulatory_document` table and verify you see records.

---

## Phase 2 Completion Checklist

Before moving to Phase 3, verify:

- [ ] Firecrawl API key is set in `.env.local`
- [ ] `lib/regulatory/firecrawl-client.ts` exists and exports scraping functions
- [ ] `lib/regulatory/scraper.ts` exists with all three main functions
- [ ] Database query helpers added to `lib/db/queries.ts`
- [ ] Manual scrape API route works (`/api/regulatory/scrape`)
- [ ] Stats API returns real counts (`/api/regulatory/stats`)
- [ ] Test scrape creates records in database
- [ ] Drizzle Studio shows regulatory documents

### Commit Your Work

```bash
git add .
git commit -m "feat(regulatory): implement scraping infrastructure

- Add Firecrawl client wrapper with rate limiting
- Implement scraping service with job tracking
- Create manual scrape API endpoint
- Update stats API with real database queries
- Add database query helpers for regulatory documents"
```

### Troubleshooting

**Problem:** "Firecrawl API key not found"
**Solution:** Check `.env.local` has `FIRECRAWL_API_KEY=...`

**Problem:** Scraping times out
**Solution:** Increase timeout in `firecrawl-client.ts` (default is 30 seconds)

**Problem:** No documents created
**Solution:** Check console logs for scraping errors. Verify URLs in `config/regulatory-sources.md` are accessible.

---

# Phase 3: Search & Retrieval

**Goal:** Implement full-text search to find relevant regulatory documents.

**Estimated Time:** 2-3 days

---

## Step 3.1: Add Full-Text Search to Database

### What You're Building
A PostgreSQL full-text search column and index for fast searching.

### Instructions

1. **Create a new migration file manually:**

```bash
mkdir -p lib/db/migrations/0002_add_fulltext_search
touch lib/db/migrations/0002_add_fulltext_search/migration.sql
```

2. **Add the SQL for full-text search:**

```sql
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
```

3. **Run the migration:**

```bash
# Connect to your database and run the SQL file
psql $POSTGRES_URL -f lib/db/migrations/0002_add_fulltext_search/migration.sql
```

Or run it via Drizzle Studio's SQL editor.

4. **Update the schema file to include search_vector:**

Open `lib/db/schema.ts` and add to the `regulatoryDocument` table:

```typescript
export const regulatoryDocument = pgTable(
  "regulatory_document",
  {
    // ... existing fields ...

    // Add this field (TypeScript only, handled by database trigger)
    searchVector: text("search_vector"), // tsvector managed by trigger

    // ... rest of fields ...
  },
  // ... indexes ...
);
```

---

## Step 3.2: Create Search Service

### What You're Building
A TypeScript service that searches regulatory documents using PostgreSQL full-text search.

### Instructions for AI Tool

**Prompt:**

```
Create lib/regulatory/search.ts that implements full-text search for regulatory documents.

Export these TypeScript interfaces:
- SearchResult with fields: documentId, title, sourceUrl, category, country, relevanceScore, excerpt, effectiveDate
- SearchFilters with optional fields: country, category[], dateRange, limit

Export these functions:

1. searchRegulatoryDocuments(query: string, filters?: SearchFilters): Promise<SearchResult[]>
   - Uses PostgreSQL ts_rank for relevance scoring
   - Filters by country, category, date range
   - Returns results ordered by relevance
   - Generates excerpts using ts_headline
   - Limits results (default 10)

2. getSimilarDocuments(documentId: string, limit?: number): Promise<SearchResult[]>
   - Finds documents with similar content
   - Uses the document's title and extracted text for similarity

3. getDocumentsByCategory(category: string, limit?: number): Promise<RegulatoryDocument[]>
   - Simple category filter query

Use raw SQL with db.execute() for full-text search queries.
Add JSDoc comments.
Handle errors gracefully.
```

### Step-by-Step Manual Instructions

1. **Create the file:**

```bash
touch lib/regulatory/search.ts
```

2. **Add the implementation:**

```typescript
import { db } from "@/lib/db";
import { regulatoryDocument, type RegulatoryDocument } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

/**
 * Search result with relevance scoring and excerpt
 */
export interface SearchResult {
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

/**
 * Filters for regulatory document search
 */
export interface SearchFilters {
  country?: string;
  category?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
}

/**
 * Search regulatory documents using PostgreSQL full-text search
 * @param query - Search query string
 * @param filters - Optional filters for country, category, date range
 * @returns Array of search results with relevance scores
 */
export async function searchRegulatoryDocuments(
  query: string,
  filters: SearchFilters = {}
): Promise<SearchResult[]> {
  const { country, category, dateRange, limit = 10 } = filters;

  try {
    // Build WHERE conditions
    const conditions = [eq(regulatoryDocument.status, "active")];

    if (country) {
      conditions.push(eq(regulatoryDocument.country, country));
    }

    if (category && category.length > 0) {
      conditions.push(
        sql`${regulatoryDocument.category} = ANY(${category})`
      );
    }

    if (dateRange) {
      conditions.push(
        sql`${regulatoryDocument.effectiveDate} BETWEEN ${dateRange.start} AND ${dateRange.end}`
      );
    }

    // Perform full-text search with relevance ranking
    const results = await db
      .select({
        documentId: regulatoryDocument.id,
        title: regulatoryDocument.title,
        sourceUrl: regulatoryDocument.sourceUrl,
        category: regulatoryDocument.category,
        country: regulatoryDocument.country,
        effectiveDate: regulatoryDocument.effectiveDate,
        metadata: regulatoryDocument.metadata,
        relevanceScore: sql<number>`ts_rank(${regulatoryDocument.searchVector}, plainto_tsquery('english', ${query}))`,
        excerpt: sql<string>`ts_headline(
          'english',
          ${regulatoryDocument.extractedText},
          plainto_tsquery('english', ${query}),
          'MaxWords=50, MinWords=20, MaxFragments=1'
        )`,
      })
      .from(regulatoryDocument)
      .where(
        and(
          ...conditions,
          sql`${regulatoryDocument.searchVector} @@ plainto_tsquery('english', ${query})`
        )
      )
      .orderBy(desc(sql`ts_rank(${regulatoryDocument.searchVector}, plainto_tsquery('english', ${query}))`))
      .limit(limit);

    return results.map((r) => ({
      ...r,
      metadata: r.metadata as Record<string, unknown>,
    }));
  } catch (error) {
    console.error("Error searching regulatory documents:", error);
    throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Find documents similar to a given document
 * @param documentId - The document ID to find similar documents for
 * @param limit - Maximum number of results (default 5)
 * @returns Array of similar documents
 */
export async function getSimilarDocuments(
  documentId: string,
  limit = 5
): Promise<SearchResult[]> {
  try {
    // Get the source document
    const [sourceDoc] = await db
      .select()
      .from(regulatoryDocument)
      .where(eq(regulatoryDocument.id, documentId))
      .limit(1);

    if (!sourceDoc) {
      throw new Error("Document not found");
    }

    // Use the document's title as search query
    const query = sourceDoc.title;

    // Search for similar documents (excluding the source document)
    const results = await db
      .select({
        documentId: regulatoryDocument.id,
        title: regulatoryDocument.title,
        sourceUrl: regulatoryDocument.sourceUrl,
        category: regulatoryDocument.category,
        country: regulatoryDocument.country,
        effectiveDate: regulatoryDocument.effectiveDate,
        metadata: regulatoryDocument.metadata,
        relevanceScore: sql<number>`ts_rank(${regulatoryDocument.searchVector}, plainto_tsquery('english', ${query}))`,
        excerpt: sql<string>`LEFT(${regulatoryDocument.extractedText}, 200)`,
      })
      .from(regulatoryDocument)
      .where(
        and(
          eq(regulatoryDocument.status, "active"),
          sql`${regulatoryDocument.id} != ${documentId}`,
          sql`${regulatoryDocument.searchVector} @@ plainto_tsquery('english', ${query})`
        )
      )
      .orderBy(desc(sql`ts_rank(${regulatoryDocument.searchVector}, plainto_tsquery('english', ${query}))`))
      .limit(limit);

    return results.map((r) => ({
      ...r,
      metadata: r.metadata as Record<string, unknown>,
    }));
  } catch (error) {
    console.error("Error finding similar documents:", error);
    throw new Error(`Failed to find similar documents: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get documents by category
 * @param category - Category to filter by
 * @param limit - Maximum number of results (default 20)
 * @returns Array of regulatory documents
 */
export async function getDocumentsByCategory(
  category: string,
  limit = 20
): Promise<RegulatoryDocument[]> {
  try {
    return await db
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
  } catch (error) {
    console.error("Error getting documents by category:", error);
    throw new Error(`Failed to get documents: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

3. **Save the file**

---

## Step 3.3: Test the Search Functionality

### Create Test Script

1. **Create test file:**

```bash
touch lib/regulatory/test-search.ts
```

2. **Add test code:**

```typescript
import { searchRegulatoryDocuments, getDocumentsByCategory } from "./search";

async function testSearch() {
  console.log("Testing regulatory document search...\n");

  // Test 1: Search for minimum wage
  console.log("Test 1: Searching for 'minimum wage'");
  const wageResults = await searchRegulatoryDocuments("minimum wage", {
    country: "AU",
    limit: 5,
  });

  console.log(`Found ${wageResults.length} results:`);
  for (const result of wageResults) {
    console.log(`  - ${result.title} (score: ${result.relevanceScore.toFixed(3)})`);
    console.log(`    Excerpt: ${result.excerpt.substring(0, 100)}...`);
  }

  // Test 2: Search for payroll tax
  console.log("\nTest 2: Searching for 'payroll tax'");
  const payrollResults = await searchRegulatoryDocuments("payroll tax", {
    category: ["payroll_tax"],
    limit: 5,
  });

  console.log(`Found ${payrollResults.length} results:`);
  for (const result of payrollResults) {
    console.log(`  - ${result.title} (${result.country})`);
  }

  // Test 3: Get all awards
  console.log("\nTest 3: Getting all awards");
  const awards = await getDocumentsByCategory("award", 5);

  console.log(`Found ${awards.length} awards:`);
  for (const award of awards) {
    console.log(`  - ${award.title}`);
  }
}

testSearch().catch(console.error);
```

3. **Run the test:**

```bash
tsx lib/regulatory/test-search.ts
```

Expected output shows search results with relevance scores.

---

## Step 3.4: Create Search API Endpoint

### What You're Building
An API route that exposes search functionality to the frontend.

### Instructions

1. **Create the directory and file:**

```bash
mkdir -p app/api/regulatory/search
touch app/api/regulatory/search/route.ts
```

2. **Add the route:**

```typescript
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { searchRegulatoryDocuments, type SearchFilters } from "@/lib/regulatory/search";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const country = searchParams.get("country") || undefined;
    const categoryParam = searchParams.get("category");
    const limit = Number.parseInt(searchParams.get("limit") || "10");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Build filters
    const filters: SearchFilters = {
      country,
      category: categoryParam ? categoryParam.split(",") : undefined,
      limit,
    };

    // Perform search
    const results = await searchRegulatoryDocuments(query, filters);

    return NextResponse.json({
      query,
      filters,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Error in search API:", error);

    return NextResponse.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
```

### Test the API

```bash
curl "http://localhost:3000/api/regulatory/search?q=minimum%20wage&country=AU&limit=3"
```

Expected: JSON response with search results.

---

## Phase 3 Completion Checklist

Before moving to Phase 4, verify:

- [ ] Full-text search migration ran successfully
- [ ] `search_vector` column exists in `regulatory_document` table
- [ ] GIN index was created
- [ ] `lib/regulatory/search.ts` exists with all functions
- [ ] Search test script returns relevant results
- [ ] Search API endpoint works (`/api/regulatory/search`)
- [ ] Results are ordered by relevance score
- [ ] Excerpts are generated with highlighted terms

### Commit Your Work

```bash
git add .
git commit -m "feat(regulatory): implement full-text search

- Add PostgreSQL full-text search with tsvector column
- Create GIN index for fast searching
- Implement search service with relevance ranking
- Add search API endpoint with filters
- Generate highlighted excerpts for results"
```

---

# Phase 4: Q&A Agent Backend

**Goal:** Create the AI agent that uses regulatory search to answer questions.

**Estimated Time:** 2-3 days

---

## Step 4.1: Create Regulatory Search Tool

### What You're Building
An AI tool that searches regulatory documents and returns results with citations.

### Instructions for AI Tool

**Prompt:**

```
Create lib/ai/tools/regulatory-tools.ts that defines the regulatorySearch tool for the Vercel AI SDK.

The tool should:
1. Use the tool() function from 'ai' package
2. Define a Zod schema with:
   - query: string (required) - the search query
   - category: optional enum (award, tax_ruling, payroll_tax, all)
   - limit: optional number (default 5)
3. Execute by calling searchRegulatoryDocuments from lib/regulatory/search
4. Return results with title, url, category, excerpt, relevanceScore
5. Include JSDoc description for the AI to understand when to use it

Also export:
- REGULATORY_TOOL_NAMES: array of tool names
- regulatoryTools: object with all tools

Use the existing Xero tools pattern from lib/ai/tools/xero-tools.ts as reference.
```

### Step-by-Step Manual Instructions

1. **Create the file:**

```bash
touch lib/ai/tools/regulatory-tools.ts
```

2. **Add the implementation:**

```typescript
import { tool } from "ai";
import { z } from "zod";
import { searchRegulatoryDocuments } from "@/lib/regulatory/search";

/**
 * Search regulatory documents tool for AI agent
 * Searches Australian regulatory documents including Fair Work awards, ATO tax rulings, and state payroll tax
 */
export const regulatorySearch = tool({
  description:
    "Search Australian regulatory documents including Fair Work awards, ATO tax rulings, and state payroll tax regulations. " +
    "Use this tool when the user asks about employment law, minimum wages, awards, tax obligations, payroll tax, " +
    "superannuation, PAYG withholding, or any Australian compliance questions. " +
    "Returns relevant documents with citations to official government sources.",
  parameters: z.object({
    query: z
      .string()
      .describe(
        "The search query related to Australian employment law, tax law, or payroll obligations. " +
          "Examples: 'minimum wage for hospitality workers', 'superannuation guarantee rate', 'NSW payroll tax threshold'"
      ),
    category: z
      .enum(["award", "tax_ruling", "payroll_tax", "all"])
      .optional()
      .default("all")
      .describe(
        "Filter by document category: 'award' for Fair Work awards, 'tax_ruling' for ATO rulings, " +
          "'payroll_tax' for state payroll tax, 'all' for all categories"
      ),
    limit: z
      .number()
      .optional()
      .default(5)
      .describe("Maximum number of results to return (default 5, max 10)"),
  }),
  execute: async ({ query, category, limit }) => {
    try {
      // Determine category filter
      const categoryFilter =
        category === "all" ? undefined : [category];

      // Search regulatory documents
      const results = await searchRegulatoryDocuments(query, {
        country: "AU",
        category: categoryFilter,
        limit: Math.min(limit || 5, 10), // Cap at 10 results
      });

      if (results.length === 0) {
        return {
          success: true,
          message: "No regulatory documents found matching your query.",
          results: [],
        };
      }

      // Format results for AI consumption
      return {
        success: true,
        count: results.length,
        results: results.map((r) => ({
          title: r.title,
          url: r.sourceUrl,
          category: r.category,
          excerpt: r.excerpt,
          relevanceScore: r.relevanceScore,
          country: r.country,
          effectiveDate: r.effectiveDate?.toISOString(),
        })),
      };
    } catch (error) {
      console.error("Error in regulatorySearch tool:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        results: [],
      };
    }
  },
});

/**
 * Export all regulatory tools
 */
export const regulatoryTools = {
  regulatorySearch,
};

/**
 * Array of regulatory tool names for activeTools configuration
 */
export const REGULATORY_TOOL_NAMES = Object.keys(regulatoryTools);
```

3. **Save the file**

---

## Step 4.2: Create Confidence Scoring System

### What You're Building
An algorithm that calculates confidence scores for AI responses.

### Instructions

1. **Create the file:**

```bash
touch lib/regulatory/confidence.ts
```

2. **Add the implementation:**

```typescript
import type { ToolCall } from "@/lib/types";

/**
 * Calculate confidence score for a Q&A agent response
 * @param toolCalls - Array of tool calls made during the response
 * @param responseText - The final response text
 * @returns Confidence score between 0 and 1
 */
export function calculateConfidence(
  toolCalls: ToolCall[],
  responseText: string
): number {
  let score = 0.5; // Base score

  // Factor 1: Number of regulatory sources cited (max +0.3)
  const regulatoryCalls = toolCalls.filter(
    (t) => t.toolName === "regulatorySearch"
  );
  const citationCount = regulatoryCalls.length;
  score += Math.min(citationCount * 0.1, 0.3);

  // Factor 2: Average relevance scores from search results (max +0.2)
  const avgRelevance = getAverageRelevance(regulatoryCalls);
  score += avgRelevance * 0.2;

  // Factor 3: Xero data integration - specific numbers (+0.15)
  const hasXeroData = toolCalls.some((t) =>
    t.toolName?.startsWith("xero_")
  );
  if (hasXeroData) {
    score += 0.15;
  }

  // Factor 4: Hedging language detection (-0.1 to -0.3)
  const hedgingPenalty = detectHedging(responseText);
  score -= hedgingPenalty;

  // Factor 5: Response length - too short indicates uncertainty (-0.1)
  if (responseText.length < 100) {
    score -= 0.1;
  }

  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Get average relevance score from regulatory search tool calls
 */
function getAverageRelevance(toolCalls: ToolCall[]): number {
  let totalRelevance = 0;
  let count = 0;

  for (const call of toolCalls) {
    if (call.toolName === "regulatorySearch" && call.result) {
      const results = call.result.results || [];
      for (const result of results) {
        if (result.relevanceScore) {
          totalRelevance += result.relevanceScore;
          count++;
        }
      }
    }
  }

  return count > 0 ? totalRelevance / count : 0;
}

/**
 * Detect hedging language in response text
 * Returns penalty between 0 and 0.3
 */
function detectHedging(text: string): number {
  const hedgingPhrases = [
    "i'm not sure",
    "i don't know",
    "might be",
    "could be",
    "possibly",
    "perhaps",
    "uncertain",
    "unclear",
    "i think",
    "i believe",
    "probably",
    "may",
  ];

  const lowerText = text.toLowerCase();
  let hedgeCount = 0;

  for (const phrase of hedgingPhrases) {
    if (lowerText.includes(phrase)) {
      hedgeCount++;
    }
  }

  // More hedging = lower confidence
  return Math.min(hedgeCount * 0.05, 0.3);
}

/**
 * Determine if a response requires human review
 * @param confidence - Confidence score (0-1)
 * @param threshold - User-configured threshold (default 0.6)
 * @returns True if review is required
 */
export function requiresHumanReview(
  confidence: number,
  threshold = 0.6
): boolean {
  return confidence < threshold;
}

/**
 * Extract citations from tool calls
 * @param toolCalls - Array of tool calls
 * @returns Array of citation objects
 */
export function extractCitations(toolCalls: ToolCall[]): Array<{
  title: string;
  url: string;
  category: string;
}> {
  const citations: Array<{ title: string; url: string; category: string }> =
    [];

  for (const call of toolCalls) {
    if (call.toolName === "regulatorySearch" && call.result) {
      const results = call.result.results || [];
      for (const result of results) {
        citations.push({
          title: result.title,
          url: result.url,
          category: result.category,
        });
      }
    }
  }

  // Remove duplicates by URL
  return Array.from(
    new Map(citations.map((c) => [c.url, c])).values()
  );
}
```

3. **Save the file**

---

## Step 4.3: Create Q&A Agent API Endpoint

### What You're Building
The main API endpoint that handles Q&A agent chat requests.

### Instructions

1. **Create the directory and file:**

```bash
mkdir -p app/api/agents/qanda
touch app/api/agents/qanda/route.ts
```

2. **Add the route implementation:**

```typescript
import { streamText } from "ai";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getModel } from "@/lib/ai/providers";
import { regulatoryTools } from "@/lib/ai/tools/regulatory-tools";
import { xeroTools } from "@/lib/ai/tools/xero-tools";
import { getActiveXeroConnection } from "@/lib/xero/connection-manager";
import {
  calculateConfidence,
  extractCitations,
  requiresHumanReview,
} from "@/lib/regulatory/confidence";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an Australian regulatory compliance assistant specializing in employment law, taxation, and payroll obligations.

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
- Distinguish between mandatory requirements and best practices`;

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request
    const { messages, settings } = await req.json();

    // Check for Xero connection
    const xeroConnection = await getActiveXeroConnection(user.id);
    const hasXero = !!xeroConnection;

    // Build tools object
    const tools = {
      ...regulatoryTools,
      ...(hasXero ? xeroTools : {}),
    };

    // Get model (default to Claude Sonnet 4.5)
    const model = getModel(settings?.model || "anthropic-claude-sonnet-4-5");

    // Stream response
    const result = await streamText({
      model,
      system: SYSTEM_PROMPT,
      messages,
      tools,
      maxSteps: 5,
      onFinish: async ({ usage, text, toolCalls }) => {
        // Calculate confidence score
        const confidence = calculateConfidence(toolCalls || [], text);

        // Extract citations
        const citations = extractCitations(toolCalls || []);

        // Check if review required
        const needsReview = requiresHumanReview(
          confidence,
          settings?.confidenceThreshold || 0.6
        );

        // Log for monitoring
        console.log("Q&A Response:", {
          userId: user.id,
          confidence,
          citationCount: citations.length,
          needsReview,
          usage,
        });

        // TODO: Save to database for audit trail
        // TODO: Trigger review notification if needsReview is true
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in Q&A agent:", error);

    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
```

3. **Save the file**

---

## Phase 4 Completion Checklist

Before moving to Phase 5, verify:

- [ ] `lib/ai/tools/regulatory-tools.ts` exists with regulatorySearch tool
- [ ] `lib/regulatory/confidence.ts` exists with scoring algorithm
- [ ] `/api/agents/qanda/route.ts` exists and handles POST requests
- [ ] Tool integration works (test with curl)
- [ ] Confidence scores are calculated correctly
- [ ] Citations are extracted from tool calls

### Commit Your Work

```bash
git add .
git commit -m "feat(regulatory): implement Q&A agent backend

- Create regulatorySearch AI tool with Zod schema
- Implement confidence scoring algorithm
- Add citation extraction from tool calls
- Create Q&A agent API endpoint with streaming
- Integrate Xero tools when connection active"
```

---

# Phase 5: Frontend Integration

**Goal:** Connect the Q&A UI to the real backend API.

**Estimated Time:** 1-2 days

---

## Step 5.1: Update Q&A Page with useChat Hook

### What You're Building
Replace the placeholder chat implementation with real API integration.

### Instructions

1. **Open `/app/agents/qanda/page.tsx`**

2. **Replace the placeholder state and handlers with useChat:**

Find the section with `const [messages, setMessages] = useState<MessageWithMetadata[]>([]);`

Replace with:

```typescript
"use client";

import { useChat } from "ai/react";
import { useState } from "react";
// ... other imports

export default function QandaPage() {
  const [streamResponses, setStreamResponses] = useState(true);
  const [showCitations, setShowCitations] = useState(true);

  // Use Vercel AI SDK useChat hook
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

  // ... rest of component (keep existing UI code)
}
```

3. **Update the form submission:**

Find the form element and update it:

```typescript
<form onSubmit={handleSubmit} className="flex gap-2">
  <Textarea
    placeholder="Ask about minimum wages, awards, payroll tax, super obligations..."
    value={input}
    onChange={handleInputChange}
    onKeyDown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    }}
    className="flex-1 min-h-[80px]"
  />
  <Button type="submit" disabled={isLoading || !input.trim()}>
    <Send className="h-4 w-4" />
  </Button>
</form>
```

4. **Add metadata extraction:**

After the useChat hook, add:

```typescript
// Extract confidence and citations from stream data
const getMessageMetadata = (messageId: string) => {
  // This will be populated by the data stream from the backend
  return {
    confidence: data?.[messageId]?.confidence,
    citations: data?.[messageId]?.citations || [],
    requiresReview: data?.[messageId]?.requiresReview,
  };
};
```

5. **Save the file**

---

## Step 5.2: Test the Complete Flow

### Manual Test

1. **Start the development server:**

```bash
pnpm dev
```

2. **Navigate to the Q&A agent:**

Open http://localhost:3000/agents/qanda

3. **Test a query:**

Type: "What is the current minimum wage in Australia?"

Expected:
- Agent uses regulatorySearch tool
- Returns answer with Fair Work citations
- Confidence score is displayed
- Citations are clickable links

4. **Test with Xero (if connected):**

Type: "How much super do I owe based on my payroll?"

Expected:
- Agent uses both regulatorySearch and xero tools
- Returns personalized answer with user's data
- Higher confidence score due to data integration

---

## Phase 5 Completion Checklist

- [ ] Q&A page uses useChat hook from ai/react
- [ ] Messages stream in real-time
- [ ] Citations display correctly
- [ ] Confidence scores show color-coded badges
- [ ] Loading states work
- [ ] Error handling works

### Commit Your Work

```bash
git add .
git commit -m "feat(regulatory): integrate Q&A frontend with backend API

- Replace placeholder chat with useChat hook
- Implement streaming responses from AI
- Extract and display confidence scores
- Show citations from regulatory search results"
```

---

# Phase 6: Human Review System

**Goal:** Implement escalation for low-confidence responses.

**Estimated Time:** 1-2 days

---

## Step 6.1: Add Review Request Schema

### Instructions

1. **Open `lib/db/schema.ts`**

2. **Add the new table:**

```typescript
export const qaReviewRequest = pgTable(
  "qa_review_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => User.id),
    messageId: text("message_id").notNull(), // Reference to chat message
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

export type QaReviewRequest = typeof qaReviewRequest.$inferSelect;
export type QaReviewRequestInsert = typeof qaReviewRequest.$inferInsert;
```

3. **Generate and run migration:**

```bash
pnpm db:generate
pnpm db:migrate
```

---

## Step 6.2: Create Review API Endpoint

### Instructions

1. **Create the file:**

```bash
touch app/api/agents/qanda/review/route.ts
```

2. **Add implementation:**

```typescript
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { db } from "@/lib/db";
import { qaReviewRequest } from "@/lib/db/schema";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messageId, query, response, confidence, citations } = body;

    // Create review request
    const [request] = await db
      .insert(qaReviewRequest)
      .values({
        userId: user.id,
        messageId,
        query,
        response,
        confidence,
        citations,
        status: "pending",
      })
      .returning();

    // TODO: Send notification to compliance team
    // await notifyReviewRequest(request);

    return NextResponse.json({
      success: true,
      requestId: request.id,
    });
  } catch (error) {
    console.error("Error creating review request:", error);
    return NextResponse.json(
      { error: "Failed to create review request" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's review requests
    const requests = await db
      .select()
      .from(qaReviewRequest)
      .where(eq(qaReviewRequest.userId, user.id))
      .orderBy(desc(qaReviewRequest.createdAt))
      .limit(20);

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Error fetching review requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch review requests" },
      { status: 500 }
    );
  }
}
```

---

## Phase 6 Completion Checklist

- [ ] QA review request table exists
- [ ] Review API endpoint works
- [ ] Frontend can submit review requests
- [ ] Review requests are stored in database

### Commit Your Work

```bash
git add .
git commit -m "feat(regulatory): implement human review system

- Add qa_review_request table for escalations
- Create review API endpoint for creating requests
- Store low-confidence responses for review"
```

---

# Phase 7: Vercel Cron Job

**Goal:** Set up scheduled scraping.

**Estimated Time:** 1 day

---

## Step 7.1: Create Cron Job Route

1. **Create file:**

```bash
mkdir -p app/api/cron
touch app/api/cron/regulatory-sync/route.ts
```

2. **Add implementation:**

```typescript
import { NextResponse } from "next/server";
import { runScrapingJob } from "@/lib/regulatory/scraper";

export async function GET(req: Request) {
  try {
    // Verify cron secret (security)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("⏰ Scheduled regulatory sync started");

    // Run scraping job for high-priority sources
    const job = await runScrapingJob({
      country: "AU",
      priority: "high",
    });

    console.log(`✅ Scheduled sync completed: ${job.documentsScraped} scraped`);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      documentsScraped: job.documentsScraped,
      documentsUpdated: job.documentsUpdated,
    });
  } catch (error) {
    console.error("❌ Scheduled sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
```

---

## Step 7.2: Configure Vercel Cron

1. **Create/update `vercel.json` in project root:**

```json
{
  "crons": [
    {
      "path": "/api/cron/regulatory-sync",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs daily at 2 AM UTC.

2. **Add CRON_SECRET to environment:**

```bash
# Generate a random secret
openssl rand -base64 32

# Add to .env.local
CRON_SECRET=your_generated_secret
```

3. **Add to Vercel dashboard:**
- Go to project settings → Environment Variables
- Add CRON_SECRET with the same value

---

## Phase 7 Completion Checklist

- [ ] Cron route created
- [ ] vercel.json configured
- [ ] CRON_SECRET set in environment
- [ ] Test cron job locally

### Commit Your Work

```bash
git add .
git commit -m "feat(regulatory): add scheduled scraping via Vercel Cron

- Create cron job route for daily syncs
- Configure vercel.json with schedule
- Add CRON_SECRET for security"
```

---

# Phase 8: Testing & Launch

**Goal:** Comprehensive testing and initial data population.

**Estimated Time:** 2-3 days

---

## Step 8.1: Run Full System Test

1. **Test scraping:**

```bash
curl -X POST http://localhost:3000/api/regulatory/scrape \
  -H "Content-Type: application/json" \
  -d '{"country": "AU"}'
```

2. **Test search:**

```bash
curl "http://localhost:3000/api/regulatory/search?q=minimum+wage&country=AU"
```

3. **Test Q&A:**

Open http://localhost:3000/agents/qanda and ask:
- "What is the current minimum wage?"
- "How much super do I need to pay?"
- "What are the NSW payroll tax thresholds?"

---

## Step 8.2: Initial Data Population

1. **Run full scrape:**

```bash
curl -X POST http://localhost:3000/api/regulatory/scrape \
  -H "Content-Type: application/json" \
  -d '{}'
```

This will scrape all sources (may take 30-60 minutes).

2. **Verify in Drizzle Studio:**

```bash
pnpm db:studio
```

Expected: 15+ documents in regulatory_document table.

---

## Step 8.3: Update Documentation

1. **Update user guides with screenshots**
2. **Test with real users from each persona**
3. **Document any issues or edge cases**

---

## Final Checklist

- [ ] All 8 phases complete
- [ ] Database fully populated
- [ ] Q&A agent works end-to-end
- [ ] Citations display correctly
- [ ] Confidence scoring accurate
- [ ] Review system functional
- [ ] Cron job configured
- [ ] Documentation updated
- [ ] Tested with real queries

---

## Congratulations!

You've successfully implemented the complete Q&A Advisory Agent with:
- ✅ Regulatory document scraping
- ✅ Full-text search
- ✅ AI agent with RAG
- ✅ Confidence scoring
- ✅ Citation system
- ✅ Human review escalation
- ✅ Automated syncing

The system is now ready for production use!
