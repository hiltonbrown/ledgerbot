# Xero Token Management - Additional Best Practices Implementation

This document outlines additional improvements made to implement ALL recommendations from [Xero's Managing Tokens and IDs best practices](https://developer.xero.com/documentation/best-practices/data-integrity/managing-tokens/).

## Overview

These improvements build on the previous authentication enhancements to address:
1. **Refresh Token Rotation** - Proper handling of token rotation
2. **Concurrency Protection** - Thread-safe token refresh operations
3. **Explicit Tenant Context** - Preventing tenant mixups in multi-threaded scenarios
4. **Token Storage Best Practices** - Already implemented encryption validation

## Key Xero Requirements Addressed

### 1. Refresh Token Rotation ✅

**Xero Requirement**: "Each time you refresh the token, you receive a new pair of access and refresh tokens. The previous refresh token is then invalid."

**Implementation**: `lib/xero/connection-manager.ts:399`

```typescript
// Xero Best Practice: "Overwrite the stored refresh token with the new one immediately"
// Each token refresh provides a NEW refresh token and invalidates the old one
const updatedConnection = await updateXeroTokens({
  id: connectionId,
  accessToken: encryptToken(tokenSet.access_token),
  refreshToken: encryptToken(tokenSet.refresh_token),
  expiresAt,
  authenticationEventId,
  resetRefreshTokenIssuedAt: true, // CRITICAL: Reset the 60-day window
  expectedUpdatedAt: connection.updatedAt, // Optimistic locking
});
```

**What This Does**:
- Immediately overwrites old refresh token with new one
- Resets the 60-day expiry window
- Uses optimistic locking to prevent race conditions
- Tracks when refresh token was issued for accurate expiry calculations

---

### 2. Concurrency Protection ✅

**Xero Requirement**: "Only allow one thread to refresh the token at a time"

**Implementation**: `lib/xero/connection-manager.ts:247`

```typescript
// In-memory lock to prevent concurrent token refreshes
const tokenRefreshLocks = new Map<string, Promise<TokenRefreshResult>>();
const lastRefreshTimestamps = new Map<string, number>();

export async function refreshXeroToken(
  connectionId: string,
  retryWithOldToken = false
): Promise<TokenRefreshResult> {
  // Check if refresh already in progress
  const existingRefresh = tokenRefreshLocks.get(connectionId);
  if (existingRefresh) {
    console.log(`🔒 Refresh already in progress, waiting...`);
    return await existingRefresh;
  }

  // Don't refresh if recently refreshed (< 5 seconds ago)
  const lastRefresh = lastRefreshTimestamps.get(connectionId);
  if (lastRefresh && Date.now() - lastRefresh < 5000) {
    console.log(`⏭️ Recently refreshed, skipping`);
    const connection = await getXeroConnectionById(connectionId);
    if (connection) {
      return { success: true, connection };
    }
  }

  // Acquire lock and perform refresh
  const refreshPromise = performTokenRefresh(connectionId, retryWithOldToken)
    .finally(() => {
      tokenRefreshLocks.delete(connectionId);
    });

  tokenRefreshLocks.set(connectionId, refreshPromise);
  return await refreshPromise;
}
```

**Protection Mechanisms**:
1. **Lock Map**: Prevents multiple concurrent refreshes for same connection
2. **Timestamp Tracking**: Prevents rapid re-refresh within 5-second window
3. **Promise Sharing**: Multiple callers wait for same refresh operation
4. **Lock Cleanup**: Always removes lock in `finally()` block

**Why This Matters**:
- In high-traffic scenarios, multiple API calls might trigger refresh simultaneously
- Without protection, you could have 10 refresh calls happening at once
- This wastes API calls and can cause token conflicts
- Lock ensures only ONE refresh happens, others wait for result

---

### 3. Explicit Tenant Context ✅

**Xero Requirement**: "Always pass the tenant ID and access token explicitly. Do not use thread-local storage. Each API call must carry the correct xero-tenant-id header."

**New File**: `lib/xero/tenant-context.ts`

```typescript
/**
 * Tenant context for making Xero API calls
 * This should be passed explicitly to all Xero API operations
 */
export interface XeroTenantContext {
  tenantId: string;
  accessToken: string;
  tenantName: string | null;
  organisationId: string | null;
  shortCode: string | null;
  connectionId: string; // For logging
}

/**
 * Create an explicit tenant context from a connection
 * Returns immutable object to prevent accidental modifications
 */
export function createTenantContext(
  connection: DecryptedXeroConnection
): Readonly<XeroTenantContext> {
  return Object.freeze({
    tenantId: connection.tenantId,
    accessToken: connection.accessToken,
    tenantName: connection.tenantName,
    organisationId: connection.organisationId,
    shortCode: connection.shortCode,
    connectionId: connection.id,
  });
}

/**
 * Helper to make a Xero API call with explicit tenant context
 */
export async function makeXeroApiCall(
  context: XeroTenantContext,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Validate context before making call
  validateTenantContext(context);

  // Create headers with tenant context
  const headers = createXeroHeaders(context, {
    ...(options.headers as Record<string, string>),
  });

  // Make API call with explicit context
  return await fetch(url, { ...options, headers });
}
```

**Usage Pattern**:

```typescript
// ✅ CORRECT: Explicit tenant context
async function getInvoices(connection: DecryptedXeroConnection) {
  const context = createTenantContext(connection);
  const response = await makeXeroApiCall(
    context,
    'https://api.xero.com/api.xro/2.0/Invoices',
    { method: 'GET' }
  );
  return response.json();
}

// ❌ WRONG: Using globals or ambient context
let globalTenantId = '...'; // NEVER DO THIS
async function getInvoices() {
  // This can lead to tenant mixups in concurrent scenarios
  const response = await fetch('...', {
    headers: { 'xero-tenant-id': globalTenantId }
  });
}
```

**Why This Matters**:
- **Multi-Tenant Safety**: Prevents accidentally posting Tenant A's data to Tenant B
- **Thread Safety**: No reliance on thread-local or global variables
- **Audit Trail**: Every API call logs which connection/tenant it's for
- **Type Safety**: TypeScript ensures tenant context is always provided

---

### 4. Token Encryption ✅ (Already Implemented)

**Xero Requirement**: "Encrypt Tokens at Rest. Never store tokens in plaintext."

**Current Implementation**: `lib/xero/encryption.ts`

```typescript
const ALGORITHM = "aes-256-gcm"; // ✅ Correct
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Return: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}
```

**Verification**:
- ✅ Using AES-256-GCM (authenticated encryption)
- ✅ Random IV per encryption
- ✅ Auth tag for integrity verification
- ✅ Encryption key from environment variable (never hard-coded)
- ✅ Tokens stored as `iv:authTag:encryptedData` format

**Xero Recommendation Met**: Already exceeds Xero's requirements by using GCM mode with authentication.

---

### 5. Store Expiry Times with Tokens ✅ (Already Implemented)

**Xero Requirement**: "Always store access_token_expires_at and refresh_token_expires_at alongside your tokens."

**Database Schema**: `lib/db/schema.ts`

```typescript
export const xeroConnection = pgTable("XeroConnection", {
  // Token fields
  accessToken: text("accessToken").notNull(), // Encrypted
  refreshToken: text("refreshToken").notNull(), // Encrypted
  expiresAt: timestamp("expiresAt").notNull(), // Access token expiry
  refreshTokenIssuedAt: timestamp("refreshTokenIssuedAt").notNull(), // For 60-day expiry calc

  // Additional tracking
  authenticationEventId: varchar("authenticationEventId", { length: 255 }),
  lastApiCallAt: timestamp("lastApiCallAt"),
});
```

**Expiry Tracking**:
- `expiresAt`: When access token expires (30 minutes from issuance)
- `refreshTokenIssuedAt`: When refresh token was issued (for 60-day expiry calc)
- Proactive refresh happens at 20 minutes (before 30-minute expiry)
- Refresh token expiry checked before every use

---

### 6. Handling Tenant Data in Concurrent Scenarios ✅

**Xero Requirement**: "When connecting multiple tenants simultaneously, your application may handle several API requests in parallel. Failing to associate tokens and tenant IDs correctly can lead to incorrect data posting."

**Solutions Implemented**:

1. **Explicit Context Passing** (`lib/xero/tenant-context.ts`)
   - Never use global or thread-local storage
   - Every function receives explicit `XeroTenantContext`
   - Immutable context objects prevent accidental modification

2. **Optimistic Locking** (`lib/db/queries.ts:1217`)
   ```typescript
   export async function updateXeroTokens({
     id,
     accessToken,
     refreshToken,
     expiresAt,
     expectedUpdatedAt, // For optimistic locking
   }) {
     const whereConditions = expectedUpdatedAt
       ? and(
           eq(xeroConnection.id, id),
           eq(xeroConnection.updatedAt, expectedUpdatedAt) // Check not updated concurrently
         )
       : eq(xeroConnection.id, id);

     const [connection] = await db
       .update(xeroConnection)
       .set(updates)
       .where(whereConditions)
       .returning();

     if (!connection && expectedUpdatedAt) {
       // Another process updated the token - use their version
       return null;
     }
   }
   ```

3. **Connection-Specific Locks** (`lib/xero/connection-manager.ts:21`)
   - Lock per connection ID (not global)
   - Allows parallel refreshes for different connections
   - Prevents parallel refreshes for same connection

---

## Database Structure Alignment with Xero Recommendations

Xero provides two example structures - we align with Structure #1 (separate tables):

### Xero Recommended Structure #1
```
Users Table:
- your_app_user_id
- xero_user_id
- access_token (encrypted)
- refresh_token (encrypted)
- access_token_expires_at
- refresh_token_expires_at

Tenants Table:
- your_app_organisation_id
- xero_tenant_id
- tenant_name
- tenant_short_code
- tenant_type
- connected_at
```

### Our Implementation
```sql
-- User Table (Clerk integration)
User {
  id: UUID (primary key)
  email: VARCHAR
  clerkId: VARCHAR
  createdAt: TIMESTAMP
}

-- XeroConnection Table (combines user + tenant info)
XeroConnection {
  id: UUID (primary key)
  userId: UUID (foreign key to User)

  -- Token fields (encrypted)
  accessToken: TEXT
  refreshToken: TEXT
  expiresAt: TIMESTAMP
  refreshTokenIssuedAt: TIMESTAMP

  -- Tenant fields
  tenantId: VARCHAR
  tenantName: VARCHAR
  tenantType: VARCHAR
  xeroConnectionId: VARCHAR -- From /connections endpoint
  xeroCreatedDateUtc: TIMESTAMP
  xeroUpdatedDateUtc: TIMESTAMP

  -- Organisation metadata (from /organisation endpoint)
  organisationId: VARCHAR
  shortCode: VARCHAR
  baseCurrency: VARCHAR
  organisationType: VARCHAR
  isDemoCompany: BOOLEAN

  -- Health tracking
  isActive: BOOLEAN
  connectionStatus: VARCHAR
  lastApiCallAt: TIMESTAMP
  lastError: TEXT
  lastCorrelationId: VARCHAR
}
```

**Why This Structure**:
- Separates user identity (Clerk) from Xero connections
- Supports multi-tenant (one user, many connections)
- All Xero-recommended fields are present
- Additional health monitoring fields

---

## Best Practices for Threading and Concurrency

### ✅ Implemented

1. **Pass Tenant Context Explicitly** - `lib/xero/tenant-context.ts`
   - `XeroTenantContext` interface ensures explicit passing
   - `createTenantContext()` creates immutable context
   - `makeXeroApiCall()` enforces explicit context

2. **Avoid Shared Mutable State** - `lib/xero/connection-manager.ts`
   - No global variables for tenant data
   - Lock maps use connection ID as key (isolated per connection)
   - Immutable context objects

3. **Use Xero Idempotency Keys** - NOT YET IMPLEMENTED
   - **Recommendation**: Add idempotency key support to `makeXeroApiCall()`
   - See: [Xero Idempotent Requests](https://developer.xero.com/documentation/guides/idempotent-requests/idempotency/)

4. **Handle Token Refresh Carefully** - `lib/xero/connection-manager.ts:247`
   - ✅ Only one thread refreshes at a time (lock map)
   - ✅ Shared result with waiting threads (promise sharing)
   - ✅ Optimistic locking prevents conflicts

5. **Limit Concurrency** - `lib/xero/rate-limit-handler.ts` (already exists)
   - ✅ Rate limit tracking
   - ✅ Xero allows 5 concurrent connections per tenant
   - ✅ 60 requests/minute, 5000 requests/day

6. **Use Asynchronous Programming** - ✅
   - All Xero operations use async/await
   - No blocking thread operations

7. **Implement Retry Logic and Backoff** - `lib/xero/error-handler.ts`
   - ✅ Exponential backoff implemented
   - ✅ Retries for server errors, rate limits, network failures
   - ✅ Max 3 retries with 1s → 2s → 4s delays

8. **Logging and Monitoring** - ✅
   - ✅ Correlation ID tracking
   - ✅ Tenant context in all logs
   - ✅ Rate limit monitoring

---

## Migration Guide

### For Existing Code

**Before** (potential tenant mixup):
```typescript
// ❌ BAD: Using connection directly in API calls
async function syncInvoices(userId: string) {
  const connection = await getActiveXeroConnection(userId);
  const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
    headers: {
      'Authorization': `Bearer ${decryptToken(connection.accessToken)}`,
      'xero-tenant-id': connection.tenantId,
    }
  });
}
```

**After** (explicit tenant context):
```typescript
// ✅ GOOD: Explicit tenant context
async function syncInvoices(userId: string) {
  const connection = await getDecryptedConnection(userId);
  if (!connection) {
    throw new Error('No active Xero connection');
  }

  const context = createTenantContext(connection);
  const response = await makeXeroApiCall(
    context,
    'https://api.xero.com/api.xro/2.0/Invoices',
    { method: 'GET' }
  );
}
```

### For New Code

Always use the tenant context pattern:

```typescript
import { createTenantContext, makeXeroApiCall } from '@/lib/xero/tenant-context';
import { getDecryptedConnection } from '@/lib/xero/connection-manager';

async function myXeroOperation(userId: string) {
  // 1. Get connection with decrypted tokens
  const connection = await getDecryptedConnection(userId);
  if (!connection) {
    throw new Error('Not connected to Xero');
  }

  // 2. Create explicit tenant context
  const context = createTenantContext(connection);

  // 3. Make API call with context
  const response = await makeXeroApiCall(
    context,
    'https://api.xero.com/api.xro/2.0/YourEndpoint',
    { method: 'GET' }
  );

  return response.json();
}
```

---

## Summary of Improvements

| Xero Best Practice | Status | Implementation |
|-------------------|--------|----------------|
| **Encrypt tokens at rest** | ✅ Already Done | AES-256-GCM encryption |
| **Store expiry times** | ✅ Already Done | `expiresAt`, `refreshTokenIssuedAt` |
| **Rotate refresh tokens** | ✅ **NEW** | Immediate overwrite with new token |
| **One thread refreshes** | ✅ **NEW** | Lock map + timestamp tracking |
| **Explicit tenant context** | ✅ **NEW** | `XeroTenantContext` + helpers |
| **No thread-local storage** | ✅ **NEW** | Immutable context objects |
| **Optimistic locking** | ✅ Already Done | `expectedUpdatedAt` in updates |
| **Correlation ID tracking** | ✅ Already Done | Stored in `lastCorrelationId` |
| **Rate limit handling** | ✅ Already Done | Tracking + retry logic |
| **Idempotency keys** | ⚠️ Recommended | Future enhancement |

---

## Files Modified/Created

### Modified
1. `lib/xero/connection-manager.ts` - Added concurrency protection
2. `lib/db/queries.ts` - Already had optimistic locking

### Created
1. `lib/xero/tenant-context.ts` - **NEW** - Explicit tenant context management

### Unchanged (Already Compliant)
1. `lib/xero/encryption.ts` - Already using AES-256-GCM correctly
2. `lib/db/schema.ts` - Already has all required fields
3. `lib/xero/error-handler.ts` - Already has retry logic
4. `lib/xero/connection-health.ts` - Already has health monitoring

---

## Testing Recommendations

### 1. Concurrent Refresh Test
```typescript
// Test that only one refresh happens for concurrent calls
const connection = await getXeroConnectionById(connectionId);

const results = await Promise.all([
  refreshXeroToken(connectionId),
  refreshXeroToken(connectionId),
  refreshXeroToken(connectionId),
]);

// Should all return the same result
expect(results[0]).toEqual(results[1]);
expect(results[1]).toEqual(results[2]);

// Check logs - should only see ONE "Starting refresh" message
```

### 2. Tenant Context Safety Test
```typescript
// Test that tenant context prevents mixups
const context1 = createTenantContext(connection1);
const context2 = createTenantContext(connection2);

// These should be isolated
expect(context1.tenantId).not.toEqual(context2.tenantId);

// Should be immutable
expect(() => {
  (context1 as any).tenantId = 'modified';
}).toThrow();
```

### 3. Token Rotation Test
```typescript
// Test that old refresh token is replaced
const before = await getXeroConnectionById(connectionId);
await refreshXeroToken(connectionId);
const after = await getXeroConnectionById(connectionId);

expect(after.refreshToken).not.toEqual(before.refreshToken);
expect(after.refreshTokenIssuedAt).toBeGreaterThan(before.refreshTokenIssuedAt);
```

---

## Monitoring Queries

```sql
-- Check for connections that might have token conflicts
SELECT
  id,
  tenantName,
  updatedAt,
  EXTRACT(EPOCH FROM (NOW() - updatedAt)) as seconds_since_update
FROM "XeroConnection"
WHERE isActive = true
  AND EXTRACT(EPOCH FROM (NOW() - updatedAt)) < 10 -- Updated in last 10 seconds
ORDER BY updatedAt DESC;

-- Check refresh token age distribution
SELECT
  EXTRACT(DAY FROM NOW() - refreshTokenIssuedAt) as days_old,
  COUNT(*) as connection_count
FROM "XeroConnection"
WHERE isActive = true
GROUP BY days_old
ORDER BY days_old;
```

---

## References

1. [Xero Managing Tokens and IDs](https://developer.xero.com/documentation/best-practices/data-integrity/managing-tokens/)
2. [Xero OAuth2 Limits](https://developer.xero.com/documentation/guides/oauth2/limits/)
3. [Xero Idempotent Requests](https://developer.xero.com/documentation/guides/idempotent-requests/idempotency/)
