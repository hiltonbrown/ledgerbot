# Database Schema Review & Optimization

**Date:** 2025-11-22
**Scope:** Review of Redis and Neon (Postgres) schemas for Vercel AI SDK migration.

## 1. Redis Schema Analysis

### 1.1. Current Usage
- **Resumable Streams:** Uses `resumable-stream` library.
  - **Key Pattern:** `ledgerbot:stream:{streamId}:*`
  - **Data:** Buffers chunks of the LLM response stream.
  - **TTL:** 15 seconds (`STREAM_BUFFER_TTL_SECONDS`).
  - **Purpose:** Handles network interruptions during streaming.
- **Rate Limiting:** No explicit Redis keys found for rate limiting in `lib/redis/config.ts`, but `lib/ai/xero-mcp-client.ts` mentions rate limit tracking which currently writes to Postgres (`XeroConnection` table).

### 1.2. Optimization Opportunities
- **Tool Result Caching:** Introduce a caching layer for expensive tool calls (e.g., regulatory searches).
  - **Proposed Key:** `ledgerbot:cache:tool:{toolName}:{hash(args)}`
  - **TTL:** 24 hours for regulatory data, 5 minutes for financial data.
- **Session State:** If we move to a truly stateless model where the frontend holds the state, Redis usage for session state is minimal. However, for long-running background jobs (like "Deep Research"), we might need a job status key.
  - **Proposed Key:** `ledgerbot:job:{jobId}:status`

## 2. Neon (Postgres) Schema Analysis

### 2.1. Core Tables
- **`User`**: Standard identity table.
- **`Chat`**: Stores conversation metadata.
  - **Optimization:** `lastContext` JSONB field stores token usage. This is efficient for simple tracking but might need normalization if detailed analytics are required.
- **`Message_v2`**: Stores the actual conversation.
  - **Structure:** `parts` (JSON) and `attachments` (JSON).
  - **Compatibility:** The `parts` JSON structure is already compatible with Vercel AI SDK's `CoreMessage` format (text parts, tool call parts).
  - **Optimization:** Ensure `tool_calls` and `tool_results` are correctly indexed or queryable if we need to analyze tool usage patterns. Currently, they are buried in the JSON blob.

### 2.2. Agent-Specific Tables
- **`XeroConnection`**: Stores OAuth tokens and metadata.
  - **Security:** Tokens are encrypted.
  - **Performance:** `chartOfAccounts` is a large JSONB blob. Fetching this on every request could be slow.
  - **Optimization:** Consider splitting `chartOfAccounts` into a separate table or ensuring it's only fetched when specifically needed by the `xero_list_accounts` tool, not for every agent interaction.
- **`RegulatoryDocument`**: Stores scraped data.
  - **Search:** Uses `searchVector` (tsvector) for full-text search. This is efficient and should be maintained.
- **`RegulatoryScrapeJob`**: Tracks ingestion status.

### 2.3. Schema Modifications for Migration

#### A. New `AgentTrace` Table (Proposed)
To replace Mastra's internal logging and provide better observability for the new Vercel AI SDK implementation, we should add a structured logging table.

```sql
CREATE TABLE AgentTrace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatId UUID NOT NULL REFERENCES Chat(id),
  messageId UUID NOT NULL, -- Links to the assistant message
  toolName TEXT,
  toolArgs JSONB,
  toolResult JSONB,
  durationMs INTEGER,
  status TEXT, -- 'success', 'error'
  errorDetails TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW()
);
```
*Benefit:* Allows debugging tool execution failures without parsing the full message JSON history.

#### B. `XeroConnection` Optimization
The `chartOfAccounts` JSONB column can be very large (MBs for large orgs).
- **Change:** Move `chartOfAccounts` to a separate table `XeroCache` or `XeroData` linked by `connectionId`.
- **Benefit:** Keeps the `XeroConnection` table lightweight for frequent auth checks (token refresh, validity checks) which happen on every request.

## 3. Query Performance Analysis

### 3.1. Chat History Loading
- **Current:** `getMessagesByChatId` fetches all messages for a chat.
- **Issue:** As conversations grow, this payload increases.
- **Optimization:** Implement a `limit` (e.g., last 50 messages) for the context window, while allowing the UI to fetch older messages for display via pagination.

### 3.2. Xero Token Retrieval
- **Current:** `getActiveXeroConnection` is called frequently.
- **Performance:** It's a simple indexed lookup.
- **Risk:** If `chartOfAccounts` is included in the select `*`, it slows down the query significantly.
- **Fix:** Explicitly select only necessary columns (`accessToken`, `refreshToken`, `tenantId`) when performing auth checks, excluding the heavy JSONB columns.

## 4. Migration Plan for Data

1.  **Schema Migration:**
    - Create `AgentTrace` table.
    - (Optional) Split `XeroConnection` if performance testing indicates bottlenecks.
2.  **Data Migration:**
    - No destructive changes required. Existing `Message_v2` data is compatible.
3.  **Code Updates:**
    - Update `lib/db/queries.ts` to implement the column selection optimization for Xero connections.
    - Update `lib/ai/xero-mcp-client.ts` to log to `AgentTrace` instead of/in addition to console logs.

## 5. Summary

The existing schema is largely well-designed for the Vercel AI SDK migration. The primary optimizations are:
1.  **Observability:** Adding `AgentTrace` for granular tool logging.
2.  **Performance:** optimizing `XeroConnection` queries to avoid fetching heavy JSON blobs unnecessarily.
3.  **Caching:** Leveraging Redis for tool result caching to reduce latency and API costs.