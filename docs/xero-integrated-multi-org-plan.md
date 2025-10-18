# Xero Multi-Organisation & Data Synchronisation Architecture Plan

## Executive Summary

This plan combines LedgerBot's multi-organisation (multi-tenant) Xero integration with a comprehensive caching and synchronisation strategy. The goal is to unlock concurrent access to multiple Xero tenants while safeguarding rate limits (60 calls/min/org), ensuring secure token handling, and delivering responsive AI-driven workflows. Key pillars include:

- **Hybrid multi-org access:** Default to a primary tenant with fast switching, plus optional concurrent queries for advanced analysis.
- **Resilient credential management:** Encrypted tokens, safe refresh logic, and async context isolation to avoid cross-tenant leakage.
- **Database-backed caching:** Cache invoices, contacts, accounts, and bank transactions per tenant with real-time webhook invalidation.
- **Background orchestration:** Scheduled sync jobs, webhook processors, and stale data refreshers to keep cached data fresh (<5 minutes).
- **Observability & rollout:** Monitoring dashboards, staged deployment, and backwards compatibility with the single-tenant baseline.

---

## Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Target Multi-Org Architecture](#target-multi-org-architecture)
3. [Data Caching & Synchronisation](#data-caching--synchronisation)
4. [Token & Request Safety](#token--request-safety)
5. [API & UI Enhancements](#api--ui-enhancements)
6. [Database Migrations & Scripts](#database-migrations--scripts)
7. [Testing Strategy](#testing-strategy)
8. [Monitoring & Observability](#monitoring--observability)
9. [Rollout Plan](#rollout-plan)
10. [Success Criteria](#success-criteria)
11. [Future Enhancements](#future-enhancements)

---

## Current Architecture Analysis

### Single-Tenant Baseline

```typescript
xeroConnection {
  id: uuid (PK)
  userId: uuid (FK -> User)
  tenantId: varchar(255)
  tenantName: varchar(255)
  accessToken: text (encrypted)
  refreshToken: text (encrypted)
  expiresAt: timestamp
  scopes: jsonb
  isActive: boolean  // Only one active per user
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Limitations**
1. Single active tenant per user (`isActive`).
2. No organisation selector UI or conversation-level context.
3. Tools always target one tenant; cross-org analysis impossible.
4. OAuth callback stores only the first tenant from the connection list.
5. No caching—each AI prompt calls Xero APIs directly, risking rate limits.

**Strengths**
1. At-rest token encryption using AES-256-GCM.
2. Automatic token refresh and error handling.
3. Clean separation between auth, database, and AI tool layers.
4. MCP-compatible tool interface abstractions.

---

## Target Multi-Org Architecture

### 1. Database Extensions

#### `xeroConnection`

```typescript
xeroConnection {
  id: uuid (PK)
  userId: uuid (FK -> User)
  tenantId: varchar(255)
  tenantName: varchar(255)
  tenantType: varchar(50)  // ORGANISATION, PRACTICEMANAGER, PRACTICE
  accessToken: text (encrypted)
  refreshToken: text (encrypted)
  expiresAt: timestamp
  scopes: jsonb
  isActive: boolean       // Multiple active tenants supported
  isPrimary: boolean      // Default tenant for single-tenant mode
  displayOrder: integer   // User-defined sort order
  connectionId: varchar(255)  // Xero connection ID
  authEventId: varchar(255)
  createdDateUtc: timestamp
  updatedDateUtc: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes**
- `idx_xero_user_active (userId, isActive)`
- `idx_xero_user_primary (userId, isPrimary)`
- `idx_xero_connection_id (connectionId)` unique

#### `userSettings`

```typescript
userSettings {
  ...
  xeroMultiOrgMode: boolean      // Enables concurrent queries
  xeroDefaultTenantId: varchar(255)
}
```

#### Optional: Conversation Context

```typescript
chatXeroContext {
  id: uuid (PK)
  chatId: uuid (FK -> Chat)
  activeTenantIds: jsonb
  multiOrgEnabled: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

### 2. Connection Manager Enhancements (`lib/xero/connection-manager.ts`)

- `getActiveXeroConnections(userId)` – ordered by `isPrimary`, `displayOrder`, and `updatedAt`.
- `getPrimaryXeroConnection(userId)` – returns the default tenant.
- `getXeroConnectionByTenantId(userId, tenantId)` – scoped to active tenants.
- `setPrimaryXeroConnection(userId, tenantId)` – resets `isPrimary` flags atomically.
- `getDecryptedConnection(userId, tenantId?)` – supports tenant override, refreshes tokens if expiring, decrypts credentials.
- `getAllDecryptedConnections(userId)` – retrieves all active tenants with refresh safety.
- `syncXeroConnections(userId, accessToken)` – pulls live tenant list, marks removed connections inactive, stores metadata.

### 3. OAuth Callback (`app/api/xero/callback/route.ts`)

- Validates state payload against the current user.
- Exchanges the auth code for tokens, verifies required fields.
- Fetches **all** tenants (`getXeroTenants`) and upserts records.
- Marks the first tenant of the first connection as primary for backwards compatibility.
- Redirects to `/settings/integrations` with success metadata.

### 4. AI Tool Execution (`lib/ai/xero-mcp-client.ts`)

- `getXeroClient(userId, tenantId?)` obtains an authenticated `XeroClient` for the requested tenant.
- `executeXeroMCPTool(userId, toolName, args)` honours `tenantId`, falling back to primary when absent.
- `executeXeroMCPToolMultiTenant` fans out API requests across selected tenants in parallel, returning a map of results keyed by `tenantId`.

### 5. Tool Definitions (`lib/ai/tools/xero-tools.ts`)

- Adds an optional `tenantId` parameter to every tool schema, defaulting to the primary organisation.
- Multi-org mode exposes utilities such as `xero_compare_organisations` and `xero_list_organisations` for cross-company insights.
- Comparison tooling leverages `executeXeroMCPToolMultiTenant` and aggregates results per tenant.

---

## Data Caching & Synchronisation

### 1. Problem Statement

- Xero limits: **60 calls/minute per organisation** with no burst allowance.
- Conversational queries without caching can exceed limits rapidly, especially in multi-tenant mode.
- Goal: **90%+ reduction** in direct API calls while keeping data <5 minutes stale.

### 2. Cache Schema (`lib/db/schema.ts`)

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `XeroInvoiceCache` | Cached invoices with metadata (`invoiceId`, `status`, `contactId`, `date`, `amountDue`, `isStale`, `expiresAt`) | `tenantId`, `(tenantId, invoiceId)` unique, `status`, `contactId`, `date`, `isStale`, `expiresAt` |
| `XeroContactCache` | Cached contacts with name/email search fields | `tenantId`, `(tenantId, contactId)` unique, `name`, `emailAddress`, `isStale` |
| `XeroAccountCache` | Cached chart-of-accounts entries | `tenantId`, `(tenantId, accountId)` unique, `type` |
| `XeroBankTransactionCache` | Cached bank transactions | `tenantId`, `(tenantId, bankTransactionId)` unique, `bankAccountId`, `date` |
| `XeroCacheSyncStatus` | Tracks sync state per tenant/entity type | `(tenantId, entityType)` unique |
| `XeroWebhookEvent` | Persists webhook payloads for audit & retry | `tenantId`, `processed`, `eventCategory`, `resourceId`, `eventDateUtc` |

### 3. Cache Manager (`lib/xero/cache-manager.ts`)

- Configurable TTLs (e.g., invoices 5 min, contacts 15 min, accounts 1 hr).
- Thresholds to mark records as stale ahead of expiry (e.g., invoices after 2 min).
- `getCached{Entity}` helpers apply filters, detect staleness, and return cache metadata.
- `cache{Entity}` upserts API responses, updates sync status, and resets `isStale`.
- `invalidateCache(tenantId, entityType, resourceId?)` toggles `isStale` for targeted refresh.
- `clearExpiredCache()` removes records past `expiresAt`.
- `getSyncStatus(tenantId, entityType?)` surfaces health for dashboards.

### 4. Webhooks (`app/api/xero/webhook/route.ts` & `lib/xero/webhook-processor.ts`)

- Validates signatures (`X-Xero-Signature`) using HMAC SHA-256 and shared secret.
- Stores events in `XeroWebhookEvent`, immediately invalidates relevant cache entries.
- Background processor fetches pending events, retrieves updated resources via Xero API, and re-caches them.
- Requires `getConnectionByTenantId(tenantId)` helper to resolve credentials.
- Processes invoices, contacts, accounts (full chart refresh), and bank transactions.

### 5. Background Jobs (`lib/xero/sync-jobs.ts` & `app/api/cron/xero-sync/route.ts`)

- **Full Sync (15 min):** Pulls 90-day invoice windows, contacts, and accounts per tenant.
- **Stale Refresh (5 min):** Batches stale invoice IDs and refreshes them in chunks of 50.
- **Webhook Processor (1 min):** Drains pending events quickly for near-real-time updates.
- **Cleanup (hourly):** Deletes expired cache rows.
- Vercel Cron (or equivalent) hits `/api/cron/xero-sync?job=<job>` endpoints secured via `CRON_SECRET`.

### 6. Tool Execution with Cache Awareness

- `executeXeroMCPTool` checks cache before hitting the API for invoice/contact/account queries.
- Returns cached data when fresh; triggers API fetch and cache update on misses or stale results.
- Multi-tenant fan-out reuses cached data per tenant, significantly reducing API pressure during cross-org comparisons.

### 7. Expected Performance Gains

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| API Calls / Conversation | 10–20 | 1–2 | ~90% reduction |
| Response Time | 500–1000ms | 50–100ms | ~80% faster |
| Rate Limit Hits | Frequent | Rare | ~95% reduction |
| Cache Hit Rates | – | Invoices 85–90%, Contacts 90–95%, Accounts 95%+ |

---

## Token & Request Safety

### 1. Connection Pool (`lib/xero/connection-pool.ts`)

- LRU cache (100 entries, 5 min TTL) storing decrypted connections per `(userId, tenantId)`.
- Prevents stampeding refreshes by storing in-flight promises.
- `invalidateConnection` and `clearUserConnections` support disconnect flows.

### 2. Request Context (`lib/xero/request-context.ts`)

- Uses `AsyncLocalStorage` to track `{ userId, tenantId, requestId }`.
- `validateTenantAccess` ensures operations respect the current tenant context.

### 3. Rate Limiting (`lib/xero/rate-limiter.ts`)

- Per-tenant limiter (60 tokens/minute) guarding outbound API calls.
- `withRateLimit(tenantId, fn)` wrapper ensures fairness across concurrent requests.

### 4. Security Considerations

- Strict tenant scoping in all queries: combine `userId` + `tenantId` filters.
- Never cache decrypted tokens outside request scope; rely on connection pool TTL.
- Rotate encryption keys periodically and clear caches on disconnects.
- Audit logs for webhook processing failures and cross-tenant access attempts.

---

## API & UI Enhancements

### 1. REST Endpoints

- `GET /api/xero/organisations` – Lists active tenants plus primary selection.
- `POST /api/xero/set-primary` – Updates default tenant via `setPrimaryXeroConnection`.
- `POST /api/xero/sync` – Triggers ad-hoc connection sync using an existing access token.

### 2. Organisation Selector (`components/xero/organisation-selector.tsx`)

- Renders a dropdown when multiple tenants are connected; otherwise shows static label.
- Displays `Primary` badge, uses icons for quick recognition, and exposes `onSelect` callback.

### 3. Settings Panel (`components/settings/xero-multi-org-settings.tsx`)

- Toggle for `xeroMultiOrgMode` (requires ≥2 connections).
- Lists connected organisations with primary marker, expiry info, and disconnect actions.
- Guards destructive actions with confirmations and disables disconnect when only one tenant remains.

### 4. Chat Header Integration (`components/chat-header.tsx`)

- Fetches organisations via `/api/xero/organisations`.
- Stores selection to `/api/xero/set-active` (**not yet implemented – planned for future release**) for conversation context.
- Signals multi-org context to AI prompts.

---

## Database Migrations & Scripts

### Migration (`lib/db/migrations/YYYYMMDD_add_multi_tenant_support.sql`)

1. Alter `XeroConnection` with new columns and default existing active connections to `isPrimary = true`.
2. Create indexes for active and primary lookups; enforce unique `connectionId` when present.
3. Extend `UserSettings` with multi-org fields.
4. Optionally create `ChatXeroContext` table.

### Migration (`lib/db/migrations/YYYYMMDD_add_cache_tables.sql`)

- Create cache tables (`XeroInvoiceCache`, `XeroContactCache`, `XeroAccountCache`, `XeroBankTransactionCache`).
- Add `XeroCacheSyncStatus` and `XeroWebhookEvent` tables with indexes defined above.

### Data Migration Script (`scripts/migrate-xero-connections.ts`)

- Iterates existing connections, sets `isPrimary` where `isActive`, and applies defaults (`tenantType = "ORGANISATION"`).
- Provides logging for progress and failures; exits non-zero on error.

---

## Testing Strategy

### Unit Tests (`__tests__/xero/connection-manager.test.ts`)

- Validate retrieval of active/primary connections.
- Ensure `setPrimaryXeroConnection` updates the correct record.
- Simulate concurrent token refresh scenarios via `getDecryptedConnection`.

### Integration Tests (`__tests__/xero/multi-org-flow.test.ts`)

- OAuth callback handles multiple tenants and persists them.
- Sync job deactivates removed tenants and updates metadata.
- Tenant-scoped tool execution respects `tenantId` overrides and multi-tenant fan-out.
- Cache-first tool execution returns cached data and refreshes stale entries.

### Background Job & Webhook Tests

- Verify webhook signature rejection, cache invalidation, and event processing.
- Mock cron invocations to ensure jobs respect rate limits and update caches.

---

## Monitoring & Observability

### Key Metrics

1. **Connection Health:** Active tenants per user, token refresh success rate, connection errors by tenant.
2. **Cache Performance:** Hit rate by entity type, stale percentage, cache age distribution.
3. **API Usage:** Calls per minute per tenant, rate-limit responses, failed API calls.
4. **Webhook & Sync:** Events received, processing latency, sync durations, records updated per job.

### Sample Dashboard Queries

```sql
-- Cache hit rate (requires query logging)
SELECT DATE(created_at) AS day,
       COUNT(*) FILTER (WHERE from_cache) * 100.0 / COUNT(*) AS hit_rate
FROM query_logs
GROUP BY day;

-- Stale entries by tenant
SELECT tenant_id,
       COUNT(*) FILTER (WHERE is_stale) AS stale_count,
       COUNT(*) AS total_count
FROM "XeroInvoiceCache"
GROUP BY tenant_id;

-- Webhook processing lag
SELECT AVG(EXTRACT(EPOCH FROM (processed_at - event_date_utc))) AS avg_lag_seconds
FROM "XeroWebhookEvent"
WHERE processed = true;
```

---

## Rollout Plan

| Phase | Focus | Key Tasks |
|-------|-------|-----------|
| 1 – Foundation (Weeks 1–2) | Schema changes & connection manager | Apply migrations, update connection manager, modify OAuth callback, ensure backwards compatibility |
| 2 – UI & API (Week 3) | Organisation management UX | Build organisation selector, settings panel, REST endpoints, chat header integration |
| 3 – Caching Core (Week 4) | Cache manager & schema | Implement cache helpers, integrate with tool execution, add rate limiter wrappers |
| 4 – Sync & Webhooks (Week 5) | Webhook ingestion & cron jobs | Deploy webhook endpoint, background processor, cron-based sync and stale refresh jobs |
| 5 – Testing & Monitoring (Week 6) | Verification & observability | Expand unit/integration tests, configure dashboards, validate rate-limit adherence |
| 6 – Migration & Deployment (Week 7) | Production rollout | Run data migration script, execute staged deployment, monitor metrics, enable multi-org mode for pilot users |

---

## Success Criteria

### Functional
- Users can connect and switch between multiple Xero tenants.
- Primary tenant behaviour matches previous single-tenant workflow.
- Tools accept `tenantId` overrides and multi-tenant comparisons work as expected.
- Cache layer serves ≥85% of eligible queries without hitting the API.

### Non-Functional
- No cross-tenant data leakage or token mix-ups.
- Token refresh success rate ≥99.9%; retries handle transient failures.
- Tenant switching overhead ≤100ms.
- Sustained rate-limit compliance; alerts triggered for 429 responses.

### User Experience
- Clear visual indicator of active organisation in settings and chat header.
- Multi-org mode toggle disabled until ≥2 tenants connected.
- Helpful error messaging for missing tenants or expired tokens.

---

## Future Enhancements

1. **Organisation Groups:** Aggregate related tenants for combined reporting.
2. **Smart Context Detection:** Infer tenant context from prompt history and auto-switch when confident.
3. **Enhanced Analytics:** Build dashboards leveraging cached data for cross-tenant comparisons and trend analysis.
4. **Bulk Onboarding:** Support Xero's bulk connection flows to speed up multi-tenant enrolment.
5. **Advanced Cache Optimisation:** Introduce predictive prefetching and adaptive TTLs based on entity churn.

---

## Appendix

### A. Xero API Reference Limits
- 60 calls per minute per organisation (hard cap).
- Uncertified apps limited to 25 tenants.
- Access tokens expire after 30 minutes; refresh tokens valid for 60 days.

### B. Environment Variables

```bash
XERO_CLIENT_ID=your_client_id
XERO_CLIENT_SECRET=your_client_secret
XERO_REDIRECT_URI=your_redirect_uri
XERO_ENCRYPTION_KEY=your_encryption_key
XERO_WEBHOOK_KEY=shared_webhook_secret
CRON_SECRET=cron_auth_token
XERO_ENABLE_BULK_CONNECTIONS=true # optional future flag
XERO_MAX_CONNECTIONS_PER_USER=10   # optional guardrail
```

### C. API Endpoint Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/xero/organisations` | GET | List connected organisations and primary tenant |
| `/api/xero/set-primary` | POST | Promote tenant to primary |
| `/api/xero/sync` | POST | Trigger Xero connection sync |
| `/api/xero/webhook` | POST | Receive Xero webhook events |
| `/api/cron/xero-sync?job=*` | GET | Execute scheduled sync/cleanup jobs |

### D. Glossary
- **Tenant:** A Xero organisation connected to a user account.
- **Primary Tenant:** Default organisation for single-org workflows.
- **Cache Hit:** Query satisfied from database cache without API call.
- **Stale Record:** Cached entry older than configured threshold; flagged for refresh.
- **Multi-Org Mode:** Advanced setting enabling concurrent multi-tenant queries.

---

This consolidated plan delivers a secure, scalable multi-organisation integration while safeguarding API consumption through strategic caching and synchronisation. Each phase builds on the prior foundation, enabling incremental rollout without disrupting existing users.
