# Q&A Advisory Agent - Technical Maintenance Guide

**For Junior Developers and Research Assistants**

---

## Table of Contents

1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Managing Regulatory Sources](#managing-regulatory-sources)
4. [Updating the Knowledge Base](#updating-the-knowledge-base)
5. [Monitoring System Health](#monitoring-system-health)
6. [Adjusting Cron Jobs](#adjusting-cron-jobs)
7. [Database Management](#database-management)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance Procedures](#maintenance-procedures)
10. [Development Guidelines](#development-guidelines)

---

## Introduction

This guide provides technical instructions for maintaining the LedgerBot Q&A Advisory Agent's regulatory knowledge base system. You'll learn how to update source links, adjust scraping schedules, monitor data quality, and troubleshoot common issues.

### Who is this guide for?

- **Junior Developers**: Maintaining the regulatory scraping and ingestion system
- **Research Assistants**: Curating regulatory source links and validating content quality
- **DevOps/System Administrators**: Monitoring cron jobs and system performance
- **Interns**: Performing routine updates under supervision

### Prerequisites

**Required knowledge:**
- Basic Git and Markdown editing
- Command-line interface basics (bash, terminal)
- Understanding of cron job syntax
- PostgreSQL fundamentals (optional but helpful)

**Required access:**
- GitHub repository write access
- Vercel project access (for cron job configuration)
- PostgreSQL database access (read-only minimum)
- Firecrawl API key (for web scraping)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Q&A Agent System                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  regulatory-sources.md → Scraper → PostgreSQL → RAG → UI   │
│        (Config)           (Cron)    (Storage)   (API)        │
└─────────────────────────────────────────────────────────────┘
```

### Components

**1. Configuration File** (`/config/regulatory-sources.md`)
- Markdown file listing all regulatory source URLs
- Structured by country, category, and subcategory
- Defines scraping frequency and priority
- **Your primary maintenance interface**

**2. Scraping System** (`/lib/regulatory/scraper.ts`)
- Uses Firecrawl MCP server for reliable web scraping
- Handles Fair Work, ATO, and state revenue sites
- Respects robots.txt and rate limits
- Triggered by Vercel cron jobs

**3. Database** (PostgreSQL)
- `RegulatoryDocument` table: Stores scraped content
- `RegulatoryScrapeJob` table: Tracks scraping job status
- Indexed for full-text search

**4. API Routes**
- `/api/regulatory/stats`: Returns knowledge base statistics
- `/api/cron/regulatory-sync`: Triggered by Vercel cron (scheduled scraping)
- Future: `/api/agents/qanda`: Main Q&A endpoint with RAG

**5. User Interface** (`/app/agents/qanda/page.tsx`)
- Displays knowledge base stats
- Chat interface with citations and confidence scores
- Settings for controlling agent behavior

---

## Managing Regulatory Sources

### Location

The regulatory sources configuration file is located at:
```
/config/regulatory-sources.md
```

This file is the **single source of truth** for what regulatory content gets scraped.

### File Structure

The markdown file uses a structured format:

```markdown
## [Country Name]

### [Category Name]

#### [Subcategory Name]
- **Source Type:** [web_scraping|rss_feed|pdf|api]
- **URL:** [https://...]
- **Update Frequency:** [daily|weekly|monthly|quarterly]
- **Priority:** [high|medium|low]
- **Additional metadata...**
```

### Example Entry

```markdown
## Australia

### Fair Work (Employment Law)

#### Modern Awards
- **Source Type:** Web Scraping
- **Base URL:** https://www.fairwork.gov.au/employment-conditions/awards
- **Scraping Strategy:** List + Detail Pages
- **Update Frequency:** Weekly
- **Priority:** High
- **Awards to Track:**
  - [General Retail Industry Award](https://www.fairwork.gov.au/employment-conditions/awards/awards-summary/ma000004-summary)
  - [Hospitality Industry Award](https://www.fairwork.gov.au/employment-conditions/awards/awards-summary/ma000009-summary)
```

### Adding a New Source

**Step 1: Research the Source**

Before adding, verify:
- ✅ URL is stable and publicly accessible
- ✅ Content is authoritative (government or official source)
- ✅ Updates are regular and documented
- ✅ Robots.txt allows scraping (`curl https://example.com/robots.txt`)

**Step 2: Determine Metadata**

| Field | Options | When to Use |
|-------|---------|------------|
| **Source Type** | `web_scraping`, `rss_feed`, `pdf`, `api` | Use `web_scraping` for most HTML pages |
| **Update Frequency** | `daily`, `weekly`, `monthly`, `quarterly` | Match the source's update cadence (check "Last updated" on page) |
| **Priority** | `high`, `medium`, `low` | `high` for frequently-asked topics (wages, super), `low` for niche |

**Step 3: Add to Config File**

1. Open `/config/regulatory-sources.md` in your editor
2. Find the appropriate country and category section
3. Add your new entry using the template below
4. Commit and push to Git

**Template:**

```markdown
#### [Source Name]
- **Source Type:** web_scraping
- **URL:** https://www.example.gov.au/path/to/document
- **Update Frequency:** weekly
- **Priority:** high
- **Notes:** [Optional: Special considerations for scraping]
```

**Step 4: Test Locally**

Run the scraper locally to verify the new source works:

```bash
# Navigate to project directory
cd /path/to/ledgerbot

# Run the scraper in test mode (doesn't save to DB)
pnpm dev:scrape --test --source="[Source Name]"
```

Expected output:
```
✓ Fetched content from https://www.example.gov.au/path/to/document
✓ Extracted 1,234 tokens of text
✓ Parsed metadata: category=tax_ruling, effective_date=2024-07-01
✓ Test successful - would save to database in production
```

**Step 5: Deploy**

```bash
# Commit your changes
git add config/regulatory-sources.md
git commit -m "Add new regulatory source: [Source Name]"
git push origin main

# Deploy to production (triggers Vercel deployment)
# Wait 2-3 minutes for deployment to complete
```

**Step 6: Verify in Production**

1. Log in to LedgerBot production
2. Navigate to `/agents/qanda`
3. Check "Last updated" timestamp (should update within 24 hours)
4. Wait for next scheduled scrape (or trigger manually via Vercel dashboard)
5. Verify document count increases in knowledge base stats

### Updating an Existing Source

**Common updates:**

**1. URL Changed**
```markdown
# OLD
- **URL:** https://old-url.gov.au/page

# NEW
- **URL:** https://new-url.gov.au/page
- **Notes:** URL migrated on 2024-10-15, old URL redirects
```

**2. Update Frequency Changed**
```markdown
# Example: ATO changed from monthly to quarterly updates
- **Update Frequency:** quarterly  # Changed from monthly
- **Notes:** ATO now updates quarterly as of FY2025
```

**3. Source Deprecated**
```markdown
# Comment out but keep for reference
<!--
#### Old Source Name (DEPRECATED as of 2024-10-15)
- **URL:** https://old-source.gov.au
- **Reason:** Superseded by [New Source Name]
-->
```

### Removing a Source

**When to remove:**
- Source is permanently offline
- Content is no longer maintained
- Superseded by a better source
- Legal or policy reasons

**Process:**

1. **Don't delete immediately** - comment out instead
2. **Add deprecation note** with date and reason
3. **Archive existing data** (don't delete from database)
4. **Update related sources** if the content moved

**Example:**

```markdown
<!--
#### Payroll Tax Guide 2023 (ARCHIVED 2024-10-15)
- **URL:** https://revenue.nsw.gov.au/payroll-tax-guide-2023
- **Archive Reason:** Superseded by Payroll Tax Guide 2024
- **Replacement:** See "Payroll Tax Guide 2024" below
- **Data Retained:** Yes, marked as status='archived' in database
-->

#### Payroll Tax Guide 2024 (CURRENT)
- **URL:** https://revenue.nsw.gov.au/payroll-tax-guide-2024
- **Update Frequency:** quarterly
- **Priority:** high
```

---

## Updating the Knowledge Base

### Automatic Updates (Recommended)

The system automatically scrapes sources based on the schedule defined in `regulatory-sources.md`:

- **Daily**: High-priority sources (e.g., ATO news, Fair Work updates)
- **Weekly**: Medium-priority sources (e.g., modern awards, tax rulings)
- **Monthly**: Low-priority sources (e.g., state payroll tax guides)

**Vercel Cron Job:**
```
0 2 * * *  # Runs daily at 2 AM UTC
```

**What happens automatically:**

1. **2:00 AM UTC**: Cron job triggers `/api/cron/regulatory-sync`
2. **2:00-2:30 AM**: System parses `regulatory-sources.md`
3. **2:30-3:00 AM**: Scrapes sources due for update
4. **3:00-3:30 AM**: Processes content and updates database
5. **Result**: Knowledge base stats reflect new data

### Manual Updates (As Needed)

**When to manually update:**
- New source added and you want immediate scraping
- Important regulatory change announced
- Scheduled scrape failed
- Testing after configuration changes

**Option 1: Trigger via Vercel Dashboard** (Recommended)

1. Log in to [Vercel Dashboard](https://vercel.com)
2. Select **ledgerbot** project
3. Go to **Cron Jobs** tab
4. Find **regulatory-sync** job
5. Click **"Trigger Now"**
6. Monitor logs in real-time

**Option 2: Trigger via CLI** (For developers)

```bash
# Install Vercel CLI
npm install -g vercel

# Log in
vercel login

# Link to project
cd /path/to/ledgerbot
vercel link

# Trigger cron job
vercel cron invoke regulatory-sync

# View logs
vercel logs --follow
```

**Option 3: API Endpoint** (For automation)

```bash
# Requires CRON_SECRET environment variable
curl -X GET https://your-ledgerbot-domain.com/api/cron/regulatory-sync \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Monitoring Updates

**Check Update Status:**

1. **Via UI** (easiest):
   - Go to `/agents/qanda`
   - Check "Last updated" timestamp in knowledge base stats
   - Should be within last 24-48 hours

2. **Via Database** (detailed):
   ```sql
   -- Check most recent scrape jobs
   SELECT
     source_url,
     status,
     documents_scraped,
     started_at,
     completed_at,
     error_message
   FROM "RegulatoryScrapeJob"
   ORDER BY created_at DESC
   LIMIT 20;
   ```

3. **Via Vercel Logs** (for errors):
   - Go to Vercel Dashboard → Deployments → Functions
   - Find `/api/cron/regulatory-sync`
   - Check logs for errors or warnings

**Success Indicators:**

✅ **Healthy system:**
```
Status: completed
Documents scraped: 5-50 (depending on source)
Error message: null
Duration: 30-300 seconds
```

⚠️ **Needs attention:**
```
Status: failed
Documents scraped: 0
Error message: "HTTP 429: Rate limit exceeded"
Duration: 5-10 seconds (failed quickly)
```

---

## Monitoring System Health

### Daily Checks (5 minutes)

**1. Knowledge Base Stats**

Visit `/agents/qanda` and verify:
- ✅ Document counts are increasing or stable (not decreasing)
- ✅ "Last updated" is within 48 hours
- ✅ All three categories show non-zero values

**2. Scrape Job Status**

Check recent scrape jobs:
```sql
-- Failed jobs in last 7 days
SELECT source_url, error_message, created_at
FROM "RegulatoryScrapeJob"
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

**3. User Feedback**

Monitor support tickets for:
- Reports of outdated information
- Low confidence scores
- Missing regulatory sources
- Incorrect answers

### Weekly Checks (15 minutes)

**1. Content Freshness**

Verify recently scraped content is current:
```sql
-- Check freshness of high-priority sources
SELECT
  title,
  category,
  effective_date,
  scraped_at,
  NOW() - scraped_at AS age
FROM "RegulatoryDocument"
WHERE priority = 'high'
  AND scraped_at < NOW() - INTERVAL '14 days'
ORDER BY scraped_at ASC
LIMIT 10;
```

If any high-priority sources are >14 days old, investigate why scraping isn't working.

**2. Scraping Success Rate**

Calculate success rate over last 7 days:
```sql
SELECT
  status,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 1) AS percentage
FROM "RegulatoryScrapeJob"
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

**Target:** >90% completed

**3. Storage Usage**

Check database size and growth rate:
```sql
-- Database size by table
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Alert if:** `RegulatoryDocument` table grows >10% per month

### Monthly Checks (30 minutes)

**1. Source Validation**

Manually verify a sample of regulatory sources:
- Click 5-10 citation links from recent Q&A responses
- Verify links still work (no 404s)
- Confirm content matches what agent cited
- Check for layout changes that might break scraping

**2. Quality Audit**

Sample recent documents for accuracy:
```sql
-- Random sample of 10 recent documents
SELECT title, category, content, source_url
FROM "RegulatoryDocument"
WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY RANDOM()
LIMIT 10;
```

For each sample:
- Visit the source URL
- Compare `content` field with actual web page
- Verify no truncation or corruption
- Check metadata accuracy (category, effective_date)

**3. Performance Review**

Check scraping performance metrics:
```sql
-- Average scraping duration by source
SELECT
  source_url,
  COUNT(*) AS scrapes,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) AS avg_duration_seconds,
  SUM(documents_scraped) AS total_docs
FROM "RegulatoryScrapeJob"
WHERE status = 'completed'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY source_url
ORDER BY avg_duration_seconds DESC;
```

**Alert if:** Any source takes >5 minutes on average

---

## Adjusting Cron Jobs

### Current Schedule

The regulatory sync cron job runs daily at 2 AM UTC:

**Vercel Configuration** (`vercel.json`):
```json
{
  "crons": [{
    "path": "/api/cron/regulatory-sync",
    "schedule": "0 2 * * *"
  }]
}
```

**Cron Syntax:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, 0 and 7 = Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Common Schedule Changes

**1. Change to Run Twice Daily** (e.g., 2 AM and 2 PM UTC)

```json
{
  "crons": [
    {
      "path": "/api/cron/regulatory-sync",
      "schedule": "0 2,14 * * *",
      "description": "Sync regulatory sources twice daily"
    }
  ]
}
```

**When to use:** If users report content is frequently out of date, or if regulatory sources update very frequently.

**2. Change to Run on Weekdays Only**

```json
{
  "crons": [
    {
      "path": "/api/cron/regulatory-sync",
      "schedule": "0 2 * * 1-5",
      "description": "Sync regulatory sources on weekdays only"
    }
  ]
}
```

**When to use:** To reduce API costs if sources only update during business days.

**3. Change to Run Weekly** (e.g., Sunday at 3 AM)

```json
{
  "crons": [
    {
      "path": "/api/cron/regulatory-sync",
      "schedule": "0 3 * * 0",
      "description": "Sync regulatory sources weekly on Sundays"
    }
  ]
}
```

**When to use:** If regulatory sources update infrequently and scraping costs are high.

**4. Stagger Multiple Schedules**

```json
{
  "crons": [
    {
      "path": "/api/cron/regulatory-sync?priority=high",
      "schedule": "0 2 * * *",
      "description": "Sync high-priority sources daily"
    },
    {
      "path": "/api/cron/regulatory-sync?priority=medium",
      "schedule": "0 3 * * 0",
      "description": "Sync medium-priority sources weekly"
    },
    {
      "path": "/api/cron/regulatory-sync?priority=low",
      "schedule": "0 4 1 * *",
      "description": "Sync low-priority sources monthly"
    }
  ]
}
```

**When to use:** To optimize scraping costs by matching frequency to source update rates.

### Deploying Schedule Changes

**Step 1: Edit Configuration**

```bash
# Open vercel.json in your editor
code vercel.json  # or vim, nano, etc.

# Edit the schedule field
# Save the file
```

**Step 2: Test the Cron Expression**

Use [crontab.guru](https://crontab.guru/) to verify:
- Enter your cron expression
- Confirm it matches your intended schedule
- Check next 5-10 execution times

**Step 3: Commit and Deploy**

```bash
# Stage changes
git add vercel.json

# Commit with descriptive message
git commit -m "Update regulatory sync schedule to twice daily"

# Push to main branch
git push origin main

# Vercel automatically deploys
# Wait 2-3 minutes for deployment
```

**Step 4: Verify in Vercel Dashboard**

1. Go to Vercel Dashboard → Cron Jobs
2. Verify new schedule is shown
3. Check "Next run" time matches expectation
4. Monitor first few runs in logs

### Timezone Considerations

Vercel cron jobs run in **UTC timezone**. Convert your local time:

| Location | Local Time | UTC Time | Cron Expression |
|----------|-----------|----------|-----------------|
| Sydney (AEDT) | 12:00 PM | 2:00 AM | `0 2 * * *` |
| Melbourne (AEDT) | 12:00 PM | 2:00 AM | `0 2 * * *` |
| Brisbane (AEST) | 11:00 AM | 2:00 AM | `0 2 * * *` |
| Perth (AWST) | 9:00 AM | 2:00 AM | `0 2 * * *` |

**Important:** AEDT/AEST changes with daylight saving, but UTC doesn't. The cron runs at the same UTC time year-round.

### Monitoring Cron Execution

**Check Recent Runs:**

```bash
# View last 20 cron executions
vercel logs --function=/api/cron/regulatory-sync --limit=20
```

**Monitor in Real-Time:**

```bash
# Follow logs as cron runs
vercel logs --function=/api/cron/regulatory-sync --follow
```

**Expected output:**
```
[2024-10-25 02:00:15] Regulatory sync started
[2024-10-25 02:00:16] Parsed 45 sources from config
[2024-10-25 02:00:17] Filtered to 12 sources due for update
[2024-10-25 02:01:23] Scraped 8/12 sources successfully
[2024-10-25 02:01:24] Processed 127 documents
[2024-10-25 02:01:25] Updated 127, Created 15, Errors 0
[2024-10-25 02:01:26] Regulatory sync completed
```

---

## Database Management

### Accessing the Database

**Via Vercel Postgres Dashboard** (Read-only, easiest):
1. Go to Vercel Dashboard → Storage → Postgres
2. Click **"Query"** tab
3. Run SQL queries

**Via Drizzle Studio** (GUI, recommended for developers):
```bash
# Start Drizzle Studio
pnpm db:studio

# Opens at http://localhost:4983
# Browse tables, run queries, view data
```

**Via psql CLI** (Advanced):
```bash
# Connect using POSTGRES_URL from .env.local
psql $POSTGRES_URL

# Run queries
SELECT * FROM "RegulatoryDocument" LIMIT 10;
```

### Key Tables

**1. RegulatoryDocument**

Stores all scraped regulatory content.

**Schema:**
```typescript
{
  id: UUID (primary key)
  country: string (e.g., "AU")
  category: string (e.g., "award", "tax_ruling", "payroll_tax")
  subcategory: string (e.g., "modern_award", "income_tax")
  title: string
  sourceUrl: string
  content: text (full scraped content in markdown)
  extractedText: text (processed for RAG)
  tokenCount: number
  effectiveDate: timestamp (when ruling/award came into effect)
  expiryDate: timestamp (for superseded rulings)
  version: string (e.g., "2024-v1")
  priority: string ("high", "medium", "low")
  status: string ("active", "superseded", "archived")
  metadata: jsonb (additional structured data)
  scrapedAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Common Queries:**

```sql
-- Count documents by category
SELECT category, COUNT(*) AS count
FROM "RegulatoryDocument"
WHERE status = 'active'
GROUP BY category
ORDER BY count DESC;

-- Find recently updated documents
SELECT title, category, scraped_at
FROM "RegulatoryDocument"
WHERE scraped_at > NOW() - INTERVAL '7 days'
ORDER BY scraped_at DESC
LIMIT 20;

-- Search for specific topic
SELECT title, content, source_url
FROM "RegulatoryDocument"
WHERE to_tsvector('english', extracted_text) @@ plainto_tsquery('english', 'superannuation guarantee')
LIMIT 10;
```

**2. RegulatoryScrapeJob**

Tracks scraping job history and errors.

**Schema:**
```typescript
{
  id: UUID (primary key)
  sourceUrl: string
  status: string ("pending", "running", "completed", "failed")
  documentsScraped: number
  errorMessage: text
  startedAt: timestamp
  completedAt: timestamp
  createdAt: timestamp
}
```

**Common Queries:**

```sql
-- Recent failed jobs
SELECT source_url, error_message, created_at
FROM "RegulatoryScrapeJob"
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- Success rate by source
SELECT
  source_url,
  COUNT(*) FILTER (WHERE status = 'completed') AS successful,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / COUNT(*), 1) AS success_rate
FROM "RegulatoryScrapeJob"
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY source_url
ORDER BY success_rate ASC;
```

### Database Maintenance

**Weekly: Clean Up Old Jobs**

Keep `RegulatoryScrapeJob` table from growing too large:

```sql
-- Delete completed jobs older than 90 days
DELETE FROM "RegulatoryScrapeJob"
WHERE status = 'completed'
  AND created_at < NOW() - INTERVAL '90 days';

-- Keep failed jobs for 180 days (for debugging)
```

**Monthly: Archive Superseded Documents**

Mark old versions of regulations as archived:

```sql
-- Mark superseded documents as archived
UPDATE "RegulatoryDocument"
SET status = 'archived'
WHERE expiry_date < NOW()
  AND status = 'active';
```

**Quarterly: Analyze and Vacuum**

Optimize database performance:

```sql
-- Update statistics
ANALYZE "RegulatoryDocument";
ANALYZE "RegulatoryScrapeJob";

-- Reclaim space
VACUUM "RegulatoryDocument";
VACUUM "RegulatoryScrapeJob";
```

### Backup and Recovery

**Automatic Backups:**
- Vercel Postgres automatically backs up daily
- Retention: 7 days for Hobby, 30 days for Pro

**Manual Backup:**

```bash
# Export entire database
pg_dump $POSTGRES_URL > ledgerbot_backup_$(date +%Y%m%d).sql

# Export only regulatory data
pg_dump $POSTGRES_URL \
  --table="RegulatoryDocument" \
  --table="RegulatoryScrapeJob" \
  > regulatory_backup_$(date +%Y%m%d).sql
```

**Restore from Backup:**

```bash
# Restore full backup
psql $POSTGRES_URL < ledgerbot_backup_20241025.sql

# Restore specific tables
psql $POSTGRES_URL < regulatory_backup_20241025.sql
```

---

## Troubleshooting

### Problem: Scraping Job Fails

**Error Message:**
```
Status: failed
Error: HTTP 429: Rate limit exceeded
```

**Diagnosis:**
You're scraping too frequently or making too many requests.

**Solution:**

1. **Check Firecrawl API limits:**
   ```bash
   # View Firecrawl usage
   curl https://api.firecrawl.dev/v0/usage \
     -H "Authorization: Bearer $FIRECRAWL_API_KEY"
   ```

2. **Reduce scraping frequency** in `vercel.json`:
   - Change from daily to every 2 days: `0 2 */2 * *`
   - Or weekly: `0 2 * * 0`

3. **Add caching** to reduce requests:
   - Edit scraper to use `maxAge: 604800000` (7 days cache)

4. **Upgrade Firecrawl plan** if needed

---

**Error Message:**
```
Status: failed
Error: HTTP 403: Forbidden
```

**Diagnosis:**
Website is blocking the scraper (possibly robots.txt violation).

**Solution:**

1. **Check robots.txt:**
   ```bash
   curl https://www.fairwork.gov.au/robots.txt
   ```

2. **Verify User-Agent** is acceptable:
   - Open `/lib/regulatory/scraper.ts`
   - Ensure User-Agent identifies as a legitimate scraper

3. **Contact website owner** if blocking is in error

4. **Use alternative source** if blocking is intentional

---

**Error Message:**
```
Status: failed
Error: Timeout after 30 seconds
```

**Diagnosis:**
Source takes too long to load (large page, slow server).

**Solution:**

1. **Increase timeout** in scraper config:
   ```typescript
   // In /lib/regulatory/scraper.ts
   const result = await scrape({
     url: sourceUrl,
     timeout: 60000  // Increase from 30s to 60s
   });
   ```

2. **Check if source has pagination**:
   - Scrape list page separately from detail pages
   - Add pagination logic to handle large result sets

3. **Use RSS feed instead** if available:
   - Update `regulatory-sources.md` to use `rss_feed` type

---

### Problem: Knowledge Base Stats Show Zero

**Symptoms:**
- All categories show "0" in `/agents/qanda`
- "Last updated" shows "Knowledge base not yet initialized"

**Diagnosis:**
Database is empty or API isn't querying correctly.

**Solution:**

1. **Check database has data:**
   ```sql
   SELECT COUNT(*) FROM "RegulatoryDocument";
   ```

2. **If empty, run initial scrape:**
   ```bash
   # Trigger scrape manually
   vercel cron invoke regulatory-sync

   # Wait 5-10 minutes
   # Check database again
   ```

3. **If still empty, check scrape job errors:**
   ```sql
   SELECT * FROM "RegulatoryScrapeJob" ORDER BY created_at DESC LIMIT 5;
   ```

4. **If API problem, check `/api/regulatory/stats/route.ts`:**
   - Verify database queries are correct
   - Check for TypeScript errors
   - Review Vercel function logs

---

### Problem: Outdated Content

**Symptoms:**
- User reports rates/thresholds are incorrect
- Cited documents show old effective dates
- Confidence scores are low for current topics

**Diagnosis:**
Scraping isn't updating content as expected.

**Solution:**

1. **Check last scrape date for that source:**
   ```sql
   SELECT title, scraped_at, source_url
   FROM "RegulatoryDocument"
   WHERE source_url LIKE '%keyword%'
   ORDER BY scraped_at DESC
   LIMIT 5;
   ```

2. **Manually trigger scrape:**
   ```bash
   vercel cron invoke regulatory-sync
   ```

3. **Check if source URL changed:**
   - Visit the URL in `regulatory-sources.md`
   - If 404 or redirect, update URL

4. **Verify update frequency is appropriate:**
   - If source updates quarterly but you scrape daily, no problem
   - If source updates daily but you scrape monthly, increase frequency

---

### Problem: Scraper Returns Empty Content

**Symptoms:**
```
Status: completed
Documents scraped: 1
Content: [empty or very short]
```

**Diagnosis:**
Scraper is extracting wrong HTML elements or page structure changed.

**Solution:**

1. **Manually test the URL:**
   ```bash
   # Use Firecrawl API directly
   curl -X POST https://api.firecrawl.dev/v0/scrape \
     -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://www.fairwork.gov.au/...", "formats": ["markdown"]}'
   ```

2. **Inspect returned content:**
   - Is markdown empty?
   - Does it contain navigation/ads instead of main content?

3. **Update scraper to use `onlyMainContent: true`:**
   ```typescript
   const result = await scrape({
     url: sourceUrl,
     formats: ['markdown'],
     onlyMainContent: true  // Add this
   });
   ```

4. **If still failing, file issue with Firecrawl:**
   - They may need to update selectors for that site

---

## Maintenance Procedures

### Monthly: Update Regulatory Source Links

**What:** Review and update URLs in `regulatory-sources.md`

**Why:** Government websites reorganize, URLs change, documents get updated

**How:**

1. **Get list of all source URLs:**
   ```bash
   grep -o 'https://[^]]*' config/regulatory-sources.md | sort -u
   ```

2. **Check each URL** (can use script):
   ```bash
   # Simple availability check
   while read url; do
     status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
     echo "$status - $url"
   done < urls.txt
   ```

3. **For each broken link (404, 403, etc.):**
   - Google the document title to find new URL
   - Update `regulatory-sources.md`
   - Add note about URL change

4. **Commit changes:**
   ```bash
   git add config/regulatory-sources.md
   git commit -m "Update regulatory source URLs - monthly maintenance"
   git push origin main
   ```

**Time estimate:** 30-60 minutes

---

### Quarterly: Validate Regulatory Content

**What:** Spot-check scraped content against official sources

**Why:** Ensure scraper is extracting content correctly

**How:**

1. **Sample 10 random documents:**
   ```sql
   SELECT id, title, source_url, content
   FROM "RegulatoryDocument"
   WHERE status = 'active'
   ORDER BY RANDOM()
   LIMIT 10;
   ```

2. **For each sample:**
   - Visit `source_url` in browser
   - Compare database `content` with web page
   - Check for:
     - Missing sections
     - Truncated text
     - Incorrect formatting
     - Included navigation/ads

3. **Document issues** in spreadsheet:
   | ID | Title | Issue | Fixed? |
   |----|-------|-------|--------|
   | abc-123 | Award MA000004 | Missing "Schedule A" section | No |

4. **Fix scraper issues:**
   - Update selector logic in `/lib/regulatory/scraper.ts`
   - Test fix locally
   - Re-scrape affected sources

5. **Create GitHub issue** for tracking:
   ```
   Title: Quarterly content validation - Q4 2024
   Body:
   - Sampled 10 documents
   - Found 2 issues (see attached spreadsheet)
   - Fixed: Award scraping selector
   - TODO: Investigate ATO ruling truncation
   ```

**Time estimate:** 1-2 hours

---

### Annually: Review and Optimize

**What:** Comprehensive system review and optimization

**Why:** Identify inefficiencies, reduce costs, improve quality

**How:**

**1. Usage Analysis:**
```sql
-- Most-queried regulatory topics
SELECT
  category,
  COUNT(*) AS query_count
FROM chat_logs  -- Hypothetical query log table
WHERE tool_used = 'regulatorySearch'
  AND created_at > NOW() - INTERVAL '12 months'
GROUP BY category
ORDER BY query_count DESC;
```

**2. Cost Analysis:**
- Review Firecrawl API costs for past year
- Calculate cost per document
- Identify expensive sources (large pages, frequent updates)

**3. Quality Metrics:**
- Average confidence scores by category
- User feedback (thumbs up/down) by category
- Human review request rate

**4. Optimization Opportunities:**

| Metric | Finding | Action |
|--------|---------|--------|
| High query count | Fair Work awards = 60% of queries | Increase scrape frequency to daily |
| Low query count | State payroll tax = 2% of queries | Reduce scrape frequency to quarterly |
| High cost/doc | ATO site takes 300s per page | Investigate caching or alternative source |
| Low confidence | Payroll tax avg 65% confidence | Improve content extraction or add more sources |

**5. Documentation Update:**
- Update this guide with lessons learned
- Add new troubleshooting sections
- Update diagrams and screenshots

**Time estimate:** 4-8 hours

---

## Development Guidelines

### Local Development Setup

**Prerequisites:**
```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Add your credentials to .env.local:
# - POSTGRES_URL
# - FIRECRAWL_API_KEY
# - CRON_SECRET
```

**Run locally:**
```bash
# Start development server
pnpm dev

# In another terminal, run database studio
pnpm db:studio
```

**Test scraper locally:**
```bash
# Create test script: scripts/test-scraper.ts
import { scrapeFairWorkAward } from '@/lib/regulatory/scraper';

async function test() {
  const result = await scrapeFairWorkAward(
    'https://www.fairwork.gov.au/employment-conditions/awards/awards-summary/ma000004-summary'
  );
  console.log(result);
}

test();
```

```bash
# Run test script
tsx scripts/test-scraper.ts
```

### Adding a New Scraper Function

**When:** A regulatory source requires custom scraping logic (not just generic HTML extraction)

**Example:** ATO rulings have specific structure that needs parsing

**Steps:**

1. **Create new function in `/lib/regulatory/scraper.ts`:**
   ```typescript
   export async function scrapeATORuling(rulingUrl: string) {
     const result = await mcp__firecrawl__firecrawl_scrape({
       url: rulingUrl,
       formats: ['markdown'],
       onlyMainContent: true,
     });

     // Custom parsing logic
     const content = result.markdown;
     const metadata = extractATOMetadata(content);

     return {
       content,
       metadata,
     };
   }

   function extractATOMetadata(content: string) {
     // Parse ruling number, effective date, etc.
     const rulingNumber = content.match(/Ruling: (TR \d+\/\d+)/)?.[1];
     const effectiveDate = content.match(/Date of effect: (\d+ \w+ \d+)/)?.[1];

     return {
       rulingNumber,
       effectiveDate,
       // ...
     };
   }
   ```

2. **Update processor to use new function:**
   ```typescript
   // In /lib/regulatory/processor.ts
   import { scrapeATORuling } from './scraper';

   export async function processSource(source: RegulatorySource) {
     if (source.category === 'tax_ruling') {
       return await scrapeATORuling(source.url);
     }
     // ... other categories
   }
   ```

3. **Test thoroughly:**
   ```bash
   tsx scripts/test-ato-scraper.ts
   ```

4. **Add unit tests:**
   ```typescript
   // In /tests/lib/regulatory/scraper.test.ts
   describe('scrapeATORuling', () => {
     it('extracts ruling number', async () => {
       const result = await scrapeATORuling('https://ato.gov.au/...');
       expect(result.metadata.rulingNumber).toBe('TR 2024/1');
     });
   });
   ```

### Code Review Checklist

Before submitting changes:

- [ ] **Configuration:** Updated `regulatory-sources.md` with new sources
- [ ] **Types:** TypeScript types added/updated in `/lib/regulatory/types.ts`
- [ ] **Error handling:** Try-catch blocks with meaningful error messages
- [ ] **Logging:** Console logs for debugging (will appear in Vercel logs)
- [ ] **Rate limiting:** Respect source website rate limits (max 1 req/sec)
- [ ] **Testing:** Tested locally with `tsx scripts/test-scraper.ts`
- [ ] **Documentation:** Updated this guide if adding new concepts
- [ ] **Commit message:** Clear description of changes
- [ ] **No secrets:** No API keys or passwords in code

---

## Additional Resources

### Documentation
- **LedgerBot Docs:** `/docs/` directory
- **Q&A Agent User Guide:** `/docs/qanda-agent-user-guide.md`
- **UI Implementation:** `/docs/qanda-agent-ui-update.md`
- **CLAUDE.md:** Architecture and patterns

### External Resources
- **Firecrawl Documentation:** https://docs.firecrawl.dev
- **Vercel Cron Jobs:** https://vercel.com/docs/cron-jobs
- **PostgreSQL Full-Text Search:** https://www.postgresql.org/docs/current/textsearch.html
- **Cron Expression Generator:** https://crontab.guru

### Regulatory Source Websites
- **Fair Work Ombudsman:** https://www.fairwork.gov.au
- **ATO:** https://www.ato.gov.au
- **Revenue NSW:** https://www.revenue.nsw.gov.au
- **Revenue Victoria:** https://www.sro.vic.gov.au
- **Revenue Queensland:** https://www.qro.qld.gov.au

### Support Contacts
- **Tech Lead:** [tech-lead@yourcompany.com]
- **DevOps:** [devops@yourcompany.com]
- **Slack Channel:** #ledgerbot-maintenance
- **GitHub Issues:** https://github.com/yourorg/ledgerbot/issues

---

## Appendix: Configuration Examples

### Example: Adding NSW Fair Trading

**Scenario:** Add NSW Fair Trading awards to regulatory sources.

**Step 1: Research**
```bash
# Check robots.txt
curl https://www.fairtrading.nsw.gov.au/robots.txt

# Test scraping
curl -X POST https://api.firecrawl.dev/v0/scrape \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -d '{"url": "https://www.fairtrading.nsw.gov.au/...", "formats": ["markdown"]}'
```

**Step 2: Add to config**
```markdown
## Australia

### Fair Work (Employment Law)

#### NSW Fair Trading Awards
- **Source Type:** web_scraping
- **URL:** https://www.fairtrading.nsw.gov.au/resource-library/publications/fair-trading-awards
- **Update Frequency:** monthly
- **Priority:** medium
- **Category:** award
- **Subcategory:** state_award
- **Notes:** NSW state-specific awards, supplements modern awards
```

**Step 3: Commit**
```bash
git add config/regulatory-sources.md
git commit -m "Add NSW Fair Trading awards to regulatory sources"
git push origin main
```

---

## Document Version

**Version:** 1.0
**Last Updated:** October 2025
**System:** LedgerBot Q&A Advisory Agent
**Target Audience:** Developers and Research Assistants

---

**Need help?** Contact the tech team at tech-lead@yourcompany.com or post in #ledgerbot-maintenance on Slack.
