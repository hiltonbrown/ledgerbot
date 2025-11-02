# Cron Job Deployment Checklist

## Issue Fixed
The Q&A agent cron job was returning 404 errors in production. The following changes have been made to resolve this issue.

## Changes Made

### 1. Firecrawl Integration (`lib/regulatory/firecrawl-client.ts`)
**Status**: ✅ FIXED (Updated to v2)

**Problem**: The `scrapeUrl` function was returning mock data instead of calling the real Firecrawl API. After implementing the real API, it was using the deprecated v1 endpoint which returned 404 errors.

**Solution**: Implemented real Firecrawl v2 API integration:
- Calls `https://api.firecrawl.dev/v2/scrape` (updated from v1) with proper authentication
- Uses `FIRECRAWL_API_KEY` environment variable
- Returns actual scraped content (markdown, HTML, metadata)
- Proper error handling with detailed error messages
- **CRITICAL FIX**: Changed endpoint from `/v1/scrape` to `/v2/scrape` to resolve 404 errors
- Tested successfully with Fair Work website, returning 10,881 characters (~2,721 tokens)

### 2. Route Configuration (`app/api/cron/regulatory-sync/route.ts`)
**Status**: ✅ UPDATED

**Changes**:
- Added `export const runtime = "nodejs"`
- Added `export const dynamic = "force-dynamic"`
- Added `export const maxDuration = 60` (60 seconds max)

These settings ensure:
- Route uses Node.js runtime (not Edge)
- Route is never cached (always dynamic)
- Route has sufficient time to complete scraping operations

### 3. Environment Variables (`.env.example`)
**Status**: ✅ UPDATED

**Added**:
```bash
# Firecrawl API Key
# Get your API key from: https://firecrawl.dev/
# Used for web scraping regulatory sources in the Q&A agent
FIRECRAWL_API_KEY=****
```

## Production Deployment Verification

### Pre-Deployment Checklist

1. **Environment Variables**
   - [ ] Verify `CRON_SECRET` is set in Vercel project settings
   - [ ] Add `FIRECRAWL_API_KEY` to Vercel project settings (get from https://firecrawl.dev/)
   - [ ] Ensure all other required environment variables are present

2. **Cron Job Configuration**
   - [ ] Verify `vercel.json` contains:
     ```json
     {
       "crons": [
         {
           "path": "/api/cron/regulatory-sync",
           "schedule": "0 15 * * *"
         }
       ]
     }
     ```
   - [ ] Confirm schedule (currently set to 15:00 UTC / 3:00 PM UTC daily)

3. **Route Handler**
   - [ ] Confirm `app/api/cron/regulatory-sync/route.ts` exists
   - [ ] Verify it exports a `GET` function
   - [ ] Check runtime configuration exports are present

### Deployment Steps

1. **Deploy to Production**
   ```bash
   git add .
   git commit -m "fix(cron): implement real Firecrawl API integration and configure route for production"
   git push origin main
   ```

2. **Or Deploy via Vercel CLI**
   ```bash
   vercel deploy --prod
   ```

### Post-Deployment Verification

1. **Check Deployment Build**
   - [ ] Go to Vercel Dashboard → Your Project → Deployments
   - [ ] Verify latest deployment shows "Ready" status
   - [ ] Check build logs for any errors related to `api/cron/regulatory-sync`

2. **Verify Cron Job Registration**
   - [ ] Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
   - [ ] Confirm `/api/cron/regulatory-sync` is listed
   - [ ] Verify schedule shows "0 15 * * *"
   - [ ] Ensure status is "Enabled"

3. **Test the Endpoint Manually**
   ```bash
   # Replace YOUR_PRODUCTION_URL with your actual Vercel URL
   # Replace YOUR_CRON_SECRET with your actual secret
   curl -X GET "https://YOUR_PRODUCTION_URL/api/cron/regulatory-sync" \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

   Expected response (success):
   ```json
   {
     "success": true,
     "jobId": "some-uuid",
     "documentsScraped": 5,
     "documentsUpdated": 0,
     "status": "completed"
   }
   ```

   Possible responses (errors):
   - **401 Unauthorized**: `CRON_SECRET` mismatch or not set
   - **404 Not Found**: Route not deployed or path mismatch
   - **500 Internal Server Error**: Check logs for Firecrawl API errors or missing `FIRECRAWL_API_KEY`

4. **Check Runtime Logs**
   - [ ] Go to Vercel Dashboard → Your Project → Logs
   - [ ] Filter by `requestPath:/api/cron/regulatory-sync`
   - [ ] Look for:
     - "⏰ Scheduled regulatory sync started"
     - "✅ Scheduled sync completed: X scraped, Y updated"
     - Or error messages if something failed

5. **Verify Database Updates**
   - [ ] Connect to PostgreSQL database
   - [ ] Check `regulatoryScrapeJob` table for recent job records
   - [ ] Check `regulatoryDocument` table for scraped documents
   ```sql
   -- Check recent scraping jobs
   SELECT * FROM "regulatoryScrapeJob" ORDER BY "createdAt" DESC LIMIT 5;

   -- Check recent regulatory documents
   SELECT id, title, category, "sourceUrl", "scrapedAt"
   FROM "regulatoryDocument"
   ORDER BY "scrapedAt" DESC LIMIT 10;
   ```

6. **Monitor First Scheduled Run**
   - [ ] Wait for next scheduled time (15:00 UTC)
   - [ ] Check logs immediately after scheduled time
   - [ ] Verify no 404 errors
   - [ ] Confirm documents were scraped successfully

## Common Issues and Solutions

### Issue: 404 Not Found
**Causes**:
- Route file not deployed
- Path mismatch in `vercel.json`
- Route not exported properly

**Solutions**:
1. Verify file exists at `app/api/cron/regulatory-sync/route.ts`
2. Ensure `GET` function is exported
3. Redeploy with `vercel deploy --prod`

### Issue: 401 Unauthorized
**Causes**:
- `CRON_SECRET` not set
- `CRON_SECRET` mismatch between Vercel and route handler

**Solutions**:
1. Generate new secret: `openssl rand -base64 32`
2. Add to Vercel: Project Settings → Environment Variables → CRON_SECRET
3. Redeploy

### Issue: 500 Internal Server Error - "FIRECRAWL_API_KEY environment variable is not set"
**Causes**:
- `FIRECRAWL_API_KEY` not set in production

**Solutions**:
1. Get API key from https://firecrawl.dev/
2. Add to Vercel: Project Settings → Environment Variables → FIRECRAWL_API_KEY
3. Redeploy

### Issue: Scraping Fails with Timeout
**Causes**:
- Too many sources to scrape in 60 seconds
- Network issues with government websites

**Solutions**:
1. Increase `maxDuration` in route handler (up to 300 seconds for Pro plans)
2. Reduce sources by filtering with `priority: "high"` only
3. Implement pagination or chunking

### Issue: Scraping Succeeds but Returns No Content
**Causes**:
- Government websites blocking Firecrawl user agent
- Website structure changed
- Rate limiting

**Solutions**:
1. Check individual source URLs manually
2. Review Firecrawl documentation for headers/options
3. Implement retry logic with exponential backoff
4. Check rate limiting (currently 1 req/2s)

## Monitoring Recommendations

1. **Set up Vercel Alerts**
   - Enable alerts for function errors
   - Monitor function duration (should be well under 60s)

2. **Regular Log Reviews**
   - Check logs weekly for any scraping failures
   - Monitor for changes in source website structures

3. **Database Monitoring**
   - Track growth of `regulatoryDocument` table
   - Monitor for stale documents (not updated in expected timeframe)

4. **Firecrawl API Monitoring**
   - Monitor API usage/quota
   - Check for API deprecation notices
   - Review billing if on paid plan

## Next Steps

After successful deployment:
1. [ ] Monitor first few scheduled runs
2. [ ] Verify Q&A agent can use scraped documents
3. [ ] Test regulatory search functionality
4. [ ] Consider implementing status dashboard for scraping jobs
5. [ ] Set up alerting for failed scraping jobs

## Files Modified

- `lib/regulatory/firecrawl-client.ts` - Implemented real Firecrawl v2 API integration (fixed 404 error)
- `app/api/cron/regulatory-sync/route.ts` - Added runtime configuration
- `.env.example` - Added FIRECRAWL_API_KEY documentation
- `scripts/test-firecrawl.ts` - Test script for Firecrawl v2 API (NEW)
- `docs/cron-job-deployment-checklist.md` - This file (UPDATED)
- `CLAUDE.md` - Updated with Firecrawl integration details

## Testing Locally

You can test the Firecrawl v2 API integration locally using the provided test script:

```bash
pnpm exec tsx --env-file=.env.local scripts/test-firecrawl.ts
```

Expected output:
```
🔍 Testing Firecrawl v2 API...
📄 Scraping: https://www.fairwork.gov.au/pay-and-wages/minimum-wages
⏳ This may take a few seconds...
📊 Response Status: 200 OK
✅ Success!
📝 Title: Minimum wages - Fair Work Ombudsman
📏 Markdown Length: 10881 characters (2721 tokens approx)
🎉 Firecrawl v2 API is working correctly!
```

## Related Documentation

- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
- Firecrawl v2 API: https://docs.firecrawl.dev/api-reference/endpoint/scrape
- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Project Documentation: `/docs/regulatory-system-summary.md`
- Q&A Agent UI: `/docs/qanda-agent-ui-update.md`
