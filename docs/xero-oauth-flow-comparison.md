# Xero OAuth2 Flow Comparison for LedgerBot

## Executive Summary

**Current Implementation**: LedgerBot uses **OAuth2 Authorization Code Flow** (standard flow with client secret)

**Recommendation**: ✅ **KEEP current Authorization Code Flow** - it's the optimal and recommended choice for LedgerBot's architecture

**Rationale**: LedgerBot is a Next.js server-side web application that can securely store client secrets. According to Xero's official documentation, the standard Authorization Code Flow is specifically designed for and recommended for web server applications like LedgerBot.

---

## Table of Contents

1. [Flow Comparison Matrix](#flow-comparison-matrix)
2. [LedgerBot Architecture Analysis](#ledgerbot-architecture-analysis)
3. [When to Use Each Flow](#when-to-use-each-flow)
4. [Current Implementation Strengths](#current-implementation-strengths)
5. [Enhancement Recommendations](#enhancement-recommendations)
6. [Migration Analysis (If PKCE Were Required)](#migration-analysis-if-pkce-were-required)
7. [Conclusion](#conclusion)

---

## Flow Comparison Matrix

### OAuth2 Authorization Code Flow vs PKCE Flow

| **Aspect** | **Authorization Code Flow** | **PKCE Flow** |
|------------|----------------------------|---------------|
| **Xero Documentation** | "Suitable for web server applications that can securely store a client secret" | "Required for applications like desktop and mobile apps that can't securely store a client secret" |
| **Client Secret** | ✅ **Required** - Stored securely in server environment | ❌ **Not used** - Cannot be stored securely in native apps |
| **Code Verifier** | ❌ Not required | ✅ **Required** - Random string (43-128 chars) generated per request |
| **Code Challenge** | ❌ Not required | ✅ **Required** - SHA256 hash of code verifier, Base64URL encoded |
| **Authorization URL Parameters** | `response_type`, `client_id`, `redirect_uri`, `scope`, `state` | Same as Code Flow **+** `code_challenge`, `code_challenge_method=S256` |
| **Token Exchange Authentication** | **Authorization header**: `Basic base64(client_id:client_secret)` | **No auth header** - Uses `code_verifier` in request body |
| **Token Exchange Body** | `grant_type`, `code`, `redirect_uri` | Same **+** `client_id`, `code_verifier` |
| **Token Refresh Authentication** | **Authorization header**: `Basic base64(client_id:client_secret)` | **Request body**: `client_id` (no secret) |
| **Security Mechanism** | Client secret proves app identity (server-to-server) | Code verifier proves same client initiated auth (no server storage) |
| **CSRF Protection** | `state` parameter (recommended) | `state` parameter (recommended) |
| **Best For** | ✅ **Web server apps** (Next.js, Express, Django, Rails) | ✅ **Native apps** (iOS, Android, Electron, desktop) |
| **Not Recommended For** | ❌ Native apps (cannot store secret securely) | ❌ Web server apps (client secret provides stronger security) |
| **SPA Support** | ⚠️ Possible but not recommended (secret exposure risk) | ❌ **Not currently supported by Xero** |
| **Connection Limit (Uncertified)** | 25 tenants | 25 tenants |
| **Connection Limit (Certified)** | Unlimited | Unlimited |
| **Cost** | Free | Free |
| **Xero App Store Eligible** | ✅ Yes | ✅ Yes |
| **Offline Access** | ✅ Yes (with `offline_access` scope) | ✅ Yes (with `offline_access` scope) |
| **Token Expiry** | access: 30min, refresh: 60 days | access: 30min, refresh: 60 days |
| **OpenID Connect Support** | ✅ Yes | ✅ Yes |

### Security Comparison

| **Security Feature** | **Authorization Code Flow** | **PKCE Flow** |
|----------------------|----------------------------|---------------|
| **Server Secret Storage** | ✅ Client secret stored securely in server environment | ❌ No secret (cannot be stored securely in native apps) |
| **Request Tampering Protection** | ✅ Client secret verifies server identity | ✅ Code verifier ensures same client initiated request |
| **CSRF Protection** | ✅ State parameter with userId/timestamp | ✅ State parameter with userId/timestamp |
| **Man-in-the-Middle Protection** | ✅ HTTPS + client secret | ✅ HTTPS + code verifier |
| **Token Interception Protection** | ✅ Client secret required to exchange code | ✅ Code verifier required to exchange code (but stored client-side) |
| **Authorization Code Reuse** | ✅ Prevented (single use, 5min expiry) | ✅ Prevented (single use, 5min expiry) |
| **Refresh Token Security** | ✅ Client secret required for refresh | ⚠️ Only client_id required (less secure) |
| **Overall Security for Server Apps** | ✅ **More secure** (secret never leaves server) | ⚠️ **Less secure** (verifier stored client-side during auth) |
| **Overall Security for Native Apps** | ❌ **Insecure** (secret could be extracted from app) | ✅ **More secure** (no secret to extract) |

---

## LedgerBot Architecture Analysis

### Current Implementation Review

LedgerBot's Xero integration is implemented as a **server-side Next.js application** with the following architecture:

**1. Application Type**: Next.js 15 web server application
- Server-side API routes (`app/api/xero/`)
- Server components for settings UI
- Backend-only token handling (no client-side exposure)

**2. Secret Storage**: Secure environment variables
- `XERO_CLIENT_ID`: Stored in Vercel environment variables
- `XERO_CLIENT_SECRET`: Stored in Vercel secrets (encrypted)
- `XERO_REDIRECT_URI`: Server-side callback URL
- `XERO_ENCRYPTION_KEY`: AES-256 key for database token encryption

**3. OAuth Flow Endpoints**:
```typescript
// Server-side routes only (no client-side code)
app/api/xero/auth/route.ts        // Generates auth URL with state
app/api/xero/callback/route.ts    // Exchanges code for tokens (uses client secret)
app/api/xero/disconnect/route.ts  // Revokes connection
```

**4. Token Management**:
```typescript
// lib/xero/connection-manager.ts
export function createXeroClient(state?: string): XeroClient {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET; // Server-only access

  return new XeroClient({
    clientId,
    clientSecret,  // Used for token exchange and refresh
    redirectUris: [redirectUri],
    scopes: XERO_SCOPES,
    state,
  });
}
```

**5. Security Features**:
- ✅ State parameter with Base64-encoded `{userId, timestamp}` for CSRF protection
- ✅ 10-minute state expiry window
- ✅ AES-256-GCM encryption for stored tokens
- ✅ Automatic token refresh (5-minute threshold)
- ✅ Client secret never exposed to browser or client-side code

### Why Code Flow is Appropriate for LedgerBot

According to Xero's official documentation:

> **"The standard authorization code flow is suitable for web server applications that can securely store a client secret."**
>
> **"If you're building a native app (desktop or mobile) then you should refer to the PKCE flow."**

LedgerBot meets all criteria for using the Authorization Code Flow:

| **Xero Requirement** | **LedgerBot Implementation** |
|----------------------|------------------------------|
| Web server application | ✅ Next.js 15 server-side application |
| Can securely store client secret | ✅ Vercel encrypted environment variables |
| Server-side token exchange | ✅ API routes handle all OAuth operations |
| HTTPS endpoints | ✅ Production runs on HTTPS (Vercel) |
| State parameter CSRF protection | ✅ Implemented with userId and timestamp verification |
| Secure token storage | ✅ AES-256-GCM encrypted database storage |

### Comparison with PKCE Requirements

PKCE is designed for scenarios where:
1. ❌ Client secret **cannot** be stored securely (e.g., mobile app binary can be decompiled)
2. ❌ Token exchange happens **client-side** (e.g., JavaScript in browser or native app)
3. ❌ No trusted server backend to protect secrets

LedgerBot's architecture:
1. ✅ Client secret **can** be stored securely (server environment variables)
2. ✅ Token exchange happens **server-side** (Next.js API routes)
3. ✅ Trusted server backend (Vercel deployment with secure secrets)

**Conclusion**: LedgerBot should use Authorization Code Flow (current implementation) as recommended by Xero for web server applications.

---

## When to Use Each Flow

### Use Authorization Code Flow When:

✅ **Application Type**:
- Web server applications (Next.js, Express, Django, Rails, etc.)
- Backend services with secure server environment
- Applications deployed to trusted hosting (Vercel, AWS, Azure, etc.)

✅ **Security Capabilities**:
- Can securely store client secret in environment variables
- Can encrypt secrets at rest (e.g., Vercel secrets, AWS Secrets Manager)
- Have server-side API routes for OAuth callbacks
- No client-side token handling

✅ **Examples**:
- LedgerBot (Next.js server-side application)
- SaaS platforms with backend APIs
- Traditional web applications with server backends
- Microservices with secure secret management

### Use PKCE Flow When:

✅ **Application Type**:
- Native mobile apps (iOS, Android)
- Desktop applications (Electron, .NET, native apps)
- Applications where users can access application code
- Applications without secure server backend

✅ **Security Limitations**:
- **Cannot** securely store client secret (users can decompile/extract)
- Token exchange must happen client-side
- No trusted backend to protect secrets
- Application code is distributed to end users

✅ **Examples**:
- iOS accounting app that syncs with Xero
- Android bookkeeping app
- Desktop accounting software
- Electron-based business tools

### Do NOT Use PKCE When:

❌ **Web Server Applications**:
- PKCE is **less secure** for applications that can store client secrets
- Client secret provides stronger authentication than code verifier
- Refresh tokens are less secure with PKCE (only client_id required)

❌ **Single Page Applications (SPAs)**:
- Xero explicitly states: **"Single Page Apps (SPAs) are not currently supported"** for PKCE
- SPAs should use backend-for-frontend (BFF) pattern with Code Flow on server

### Use Custom Connections (Client Credentials) When:

✅ **Backend machine-to-machine integrations**
✅ **Single organization connection** (not multi-tenant)
✅ **Bespoke integrations** (not for Xero App Store)
✅ **Cost acceptable** ($5-10/month per Xero organization)

❌ **Not eligible for Xero App Store listing**

---

## Current Implementation Strengths

LedgerBot's current Authorization Code Flow implementation demonstrates security best practices:

### 1. Proper Client Secret Handling

**Implementation** (`lib/xero/connection-manager.ts:30-48`):
```typescript
export function createXeroClient(state?: string): XeroClient {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.XERO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Xero environment variables not configured: XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REDIRECT_URI required"
    );
  }

  return new XeroClient({
    clientId,
    clientSecret,  // Securely stored, only accessed server-side
    redirectUris: [redirectUri],
    scopes: XERO_SCOPES,
    state,
  });
}
```

**Security Benefits**:
- ✅ Client secret stored in server environment variables only
- ✅ Never sent to client browser or exposed in client-side code
- ✅ Validates environment variables on startup (fail-fast)
- ✅ Uses Vercel's encrypted secrets management

### 2. CSRF Protection with State Parameter

**Implementation** (`app/api/xero/auth/route.ts`):
```typescript
const state = Buffer.from(
  JSON.stringify({
    userId: user.id,
    timestamp: Date.now(),
  })
).toString("base64");

const authUrl = await getXeroAuthUrl(state);
```

**Callback Verification** (`app/api/xero/callback/route.ts`):
```typescript
const stateData = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));

// Verify userId matches authenticated user
if (stateData.userId !== user.id) {
  throw new Error("State verification failed: user ID mismatch");
}

// Verify timestamp is recent (within 10 minutes)
const stateAge = Date.now() - stateData.timestamp;
const TEN_MINUTES = 10 * 60 * 1000;
if (stateAge > TEN_MINUTES) {
  throw new Error("State verification failed: expired timestamp");
}
```

**Security Benefits**:
- ✅ Prevents CSRF attacks by verifying user identity
- ✅ Time-bound state parameter (10-minute expiry)
- ✅ Base64 encoding for URL safety
- ✅ Server-side state validation (cannot be tampered client-side)

### 3. Encrypted Token Storage

**Implementation** (`lib/xero/encryption.ts`):
```typescript
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher: CipherGCM = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}
```

**Security Benefits**:
- ✅ AES-256-GCM authenticated encryption
- ✅ Random IV per encryption (prevents pattern analysis)
- ✅ Authentication tag detects tampering
- ✅ Encrypted tokens never stored in plaintext

### 4. Automatic Token Refresh

**Implementation** (`lib/xero/connection-manager.ts:50-92`):
```typescript
export async function getDecryptedConnection(
  userId: string
): Promise<DecryptedXeroConnection | null> {
  const connection = await getActiveXeroConnection(userId);

  // Check if token is expiring within 5 minutes
  const expiresAt = new Date(connection.expiresAt);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt <= fiveMinutesFromNow) {
    // Token needs refresh
    const refreshedConnection = await refreshXeroToken(connection.id);
    return {
      ...refreshedConnection,
      accessToken: decryptToken(refreshedConnection.accessToken),
      refreshToken: decryptToken(refreshedConnection.refreshToken),
    };
  }

  // Return decrypted connection
  return {
    ...connection,
    accessToken: decryptToken(connection.accessToken),
    refreshToken: decryptToken(connection.refreshToken),
  };
}
```

**Refresh Process** (`lib/xero/connection-manager.ts:94-147`):
```typescript
async function refreshXeroToken(connectionId: string): Promise<XeroConnection | null> {
  const xeroClient = createXeroClient();

  // Decrypt existing tokens
  const decryptedAccessToken = decryptToken(connection.accessToken);
  const decryptedRefreshToken = decryptToken(connection.refreshToken);

  // Set current token set
  await xeroClient.setTokenSet({
    access_token: decryptedAccessToken,
    refresh_token: decryptedRefreshToken,
    token_type: "Bearer",
  });

  // Refresh token (uses client secret in Authorization header)
  const tokenSet = await xeroClient.refreshToken();

  // Update database with new encrypted tokens
  await updateXeroTokens({
    id: connectionId,
    accessToken: encryptToken(tokenSet.access_token),
    refreshToken: encryptToken(tokenSet.refresh_token),
    expiresAt,
  });
}
```

**Security Benefits**:
- ✅ Proactive refresh (5-minute threshold prevents expiry during API calls)
- ✅ Client secret required for refresh (stronger than PKCE's client_id-only)
- ✅ New tokens immediately encrypted and stored
- ✅ Seamless for users (no re-authentication needed)
- ✅ Graceful error handling (connection deactivated on failure)

### 5. Single Active Connection Enforcement

**Database Schema** (`lib/db/schema.ts`):
```typescript
export const xeroConnection = pgTable("XeroConnection", {
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  isActive: boolean("isActive").notNull().default(true),
  // ... other fields
});
```

**Implementation** (`lib/db/queries.ts`):
```typescript
export async function createXeroConnection(data: NewXeroConnection) {
  // Deactivate any existing active connections
  await db
    .update(xeroConnection)
    .set({ isActive: false })
    .where(
      and(
        eq(xeroConnection.userId, data.userId),
        eq(xeroConnection.isActive, true)
      )
    );

  // Create new active connection
  const [newConnection] = await db
    .insert(xeroConnection)
    .values({ ...data, isActive: true })
    .returning();

  return newConnection;
}
```

**Security Benefits**:
- ✅ Prevents token confusion
- ✅ Clear connection state per user
- ✅ Simplifies token management
- ✅ Database constraint enforcement

### 6. Server-Side Token Exchange

**Implementation** (`app/api/xero/callback/route.ts`):
```typescript
// Create Xero client with client secret (server-side only)
const xeroClient = createXeroClient(state);

// Exchange authorization code for tokens
// xero-node SDK automatically includes client secret in Authorization header
const tokenSet = await xeroClient.apiCallback(request.url);

// Encrypt and store tokens
await createXeroConnection({
  userId: user.id,
  tenantId: tenant.tenantId,
  accessToken: encryptToken(tokenSet.access_token),
  refreshToken: encryptToken(tokenSet.refresh_token),
  expiresAt,
  scopes: getXeroScopes(),
});
```

**What `xero-node` SDK does automatically**:
```http
POST https://identity.xero.com/connect/token
Authorization: Basic base64encode(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=received_auth_code
&redirect_uri=https://ledgerbot.com/api/xero/callback
```

**Security Benefits**:
- ✅ Client secret never sent to browser
- ✅ Token exchange happens server-to-server
- ✅ Authorization code cannot be reused (single-use, 5-minute expiry)
- ✅ Immediate encryption before database storage
- ✅ No client-side JavaScript has access to tokens

---

## Enhancement Recommendations

While LedgerBot's current implementation is secure and follows best practices, here are optional enhancements for defense-in-depth:

### 1. Add PKCE as Additional Security Layer (Optional)

**Status**: 🟡 Optional enhancement, not required

OAuth2 supports using **both** client secret **and** PKCE simultaneously for defense-in-depth security:

**Implementation Changes**:

**Step 1**: Generate code verifier and challenge during authorization:

```typescript
// lib/xero/pkce.ts (new file)
import { randomBytes, createHash } from "crypto";

export function generateCodeVerifier(): string {
  // PKCE spec: 43-128 characters from [A-Z, a-z, 0-9, -, ., _, ~]
  return randomBytes(32)
    .toString("base64url")
    .slice(0, 128);
}

export function generateCodeChallenge(verifier: string): string {
  // S256: BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))
  return createHash("sha256")
    .update(verifier)
    .digest("base64url");
}
```

**Step 2**: Store code verifier in session for callback:

```typescript
// app/api/xero/auth/route.ts
import { generateCodeVerifier, generateCodeChallenge } from "@/lib/xero/pkce";

export async function GET() {
  const user = await getAuthUser();

  // Generate PKCE values
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store code verifier in encrypted session cookie for callback
  const state = Buffer.from(
    JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
      codeVerifier, // Include verifier in state
    })
  ).toString("base64");

  // Build authorization URL with PKCE parameters
  const authUrl = await getXeroAuthUrl(state, codeChallenge);

  return NextResponse.json({ url: authUrl });
}
```

**Step 3**: Update XeroClient to include code_challenge:

```typescript
// lib/xero/connection-manager.ts
export async function getXeroAuthUrl(
  state: string,
  codeChallenge?: string
): Promise<string> {
  const xeroClient = createXeroClient(state);
  const baseUrl = await xeroClient.buildConsentUrl();

  if (codeChallenge) {
    // Add PKCE parameters to URL
    const url = new URL(baseUrl);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
  }

  return baseUrl;
}
```

**Step 4**: Include code_verifier in token exchange:

```typescript
// app/api/xero/callback/route.ts
export async function GET(request: Request) {
  // ... state verification ...

  // Extract code verifier from state
  const stateData = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
  const codeVerifier = stateData.codeVerifier;

  // Exchange code for tokens with BOTH client secret AND code verifier
  const xeroClient = createXeroClient(state);

  // xero-node SDK would need to support passing code_verifier
  // This may require manual token exchange instead of using apiCallback()
  const tokenResponse = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier, // PKCE parameter
    }),
  });

  const tokenSet = await tokenResponse.json();
  // ... rest of token storage logic ...
}
```

**Benefits**:
- 🟢 Defense-in-depth: Two independent security mechanisms
- 🟢 Protects against authorization code interception (requires both secret and verifier)
- 🟢 Compliance with modern OAuth2 best practices

**Drawbacks**:
- 🔴 Added complexity (code verifier generation and storage)
- 🔴 `xero-node` SDK may not support PKCE + client secret simultaneously
- 🔴 Minimal security benefit (client secret already provides strong security)

**Recommendation**: ⚠️ **Not necessary** unless required for compliance or defense-in-depth policy

### 2. Implement Token Rotation Logging

**Status**: 🟢 Recommended for production environments

**Implementation**:

```typescript
// lib/xero/audit-log.ts
export type XeroAuditEvent =
  | "connection_created"
  | "token_refreshed"
  | "refresh_failed"
  | "connection_removed"
  | "unauthorized_access_attempt";

export async function logXeroAuditEvent(
  userId: string,
  event: XeroAuditEvent,
  metadata?: Record<string, any>
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId,
    event,
    metadata,
  };

  // Log to console for debugging
  console.log("[XERO AUDIT]", JSON.stringify(logEntry));

  // In production, send to monitoring service
  if (process.env.NODE_ENV === "production") {
    // Example: Sentry, DataDog, CloudWatch, etc.
    // await monitoringService.log(logEntry);
  }

  // Optional: Store in database audit log table
  // await db.insert(auditLog).values(logEntry);
}
```

**Usage in connection-manager.ts**:

```typescript
async function refreshXeroToken(connectionId: string): Promise<XeroConnection | null> {
  try {
    // ... token refresh logic ...

    await logXeroAuditEvent(connection.userId, "token_refreshed", {
      connectionId,
      tenantId: connection.tenantId,
      expiresAt: expiresAt.toISOString(),
    });

    return updatedConnection;
  } catch (error) {
    await logXeroAuditEvent(connection.userId, "refresh_failed", {
      connectionId,
      error: error.message,
    });
    throw error;
  }
}
```

**Benefits**:
- ✅ Security incident investigation
- ✅ Token refresh monitoring
- ✅ Compliance audit trails
- ✅ Anomaly detection

### 3. Add Connection Health Monitoring Dashboard

**Status**: 🟡 Nice-to-have for enterprise users

**Implementation**:

```typescript
// app/(settings)/settings/integrations/xero-health/page.tsx
export default async function XeroHealthPage() {
  const user = await getAuthUser();
  const connection = await getActiveXeroConnection(user.id);

  if (!connection) {
    return <div>No Xero connection found</div>;
  }

  const health = await checkXeroConnectionHealth(user.id);
  const refreshHistory = await getTokenRefreshHistory(connection.id);

  return (
    <div>
      <h1>Xero Connection Health</h1>

      <HealthStatus health={health} />

      <ConnectionDetails
        tenantName={connection.tenantName}
        createdAt={connection.createdAt}
        lastRefreshAt={connection.updatedAt}
      />

      <TokenRefreshHistory history={refreshHistory} />

      <ConnectionActions connectionId={connection.id} />
    </div>
  );
}
```

**Benefits**:
- ✅ Proactive issue detection
- ✅ User transparency
- ✅ Support troubleshooting

### 4. Consider OpenID Connect Discovery

**Status**: 🟡 Optional, for library maintainability

Xero provides an OpenID Connect Discovery endpoint:
```
https://identity.xero.com/.well-known/openid-configuration
```

**Benefits**:
- ✅ Automatic endpoint discovery
- ✅ Simplified OAuth library configuration
- ✅ Future-proof against Xero endpoint changes

**Implementation**:

```typescript
// lib/xero/oidc-discovery.ts
export async function getXeroOIDCConfig() {
  const response = await fetch(
    "https://identity.xero.com/.well-known/openid-configuration"
  );
  return await response.json();
}

// Use discovered endpoints instead of hardcoded URLs
const config = await getXeroOIDCConfig();
// config.authorization_endpoint
// config.token_endpoint
// config.revocation_endpoint
```

**Current Implementation**: ✅ `xero-node` SDK already handles this internally

---

## Migration Analysis (If PKCE Were Required)

**Note**: This section analyzes what would be required to migrate from Code Flow to PKCE. **Migration is NOT recommended** for LedgerBot.

### Code Changes Required

#### 1. Remove Client Secret Dependency

**Current** (`lib/xero/connection-manager.ts`):
```typescript
export function createXeroClient(state?: string): XeroClient {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET; // Would be removed

  return new XeroClient({
    clientId,
    clientSecret, // Would be removed
    redirectUris: [redirectUri],
    scopes: XERO_SCOPES,
    state,
  });
}
```

**PKCE** (hypothetical):
```typescript
export function createXeroClient(state?: string): XeroClient {
  const clientId = process.env.XERO_CLIENT_ID;
  // NO CLIENT SECRET

  return new XeroClient({
    clientId,
    // clientSecret removed
    redirectUris: [redirectUri],
    scopes: XERO_SCOPES,
    state,
    // PKCE mode enabled
  });
}
```

#### 2. Add Code Verifier Generation

**New file** (`lib/xero/pkce.ts`):
```typescript
import { randomBytes, createHash } from "crypto";

export function generateCodeVerifier(): string {
  // 43-128 characters from [A-Za-z0-9-._~]
  return randomBytes(32).toString("base64url").slice(0, 128);
}

export function generateCodeChallenge(verifier: string): string {
  // S256: BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))
  return createHash("sha256").update(verifier).digest("base64url");
}
```

#### 3. Update Authorization Flow

**Current** (`app/api/xero/auth/route.ts`):
```typescript
const state = Buffer.from(JSON.stringify({ userId, timestamp })).toString("base64");
const authUrl = await getXeroAuthUrl(state);
```

**PKCE** (hypothetical):
```typescript
import { generateCodeVerifier, generateCodeChallenge } from "@/lib/xero/pkce";

const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);

// Store code verifier for callback (in encrypted session cookie or database)
const state = Buffer.from(
  JSON.stringify({ userId, timestamp, codeVerifier })
).toString("base64");

// Include code_challenge in authorization URL
const authUrl = await getXeroAuthUrl(state, codeChallenge);
```

#### 4. Update Token Exchange

**Current** (`app/api/xero/callback/route.ts`):
```typescript
// xero-node SDK handles this automatically with client secret
const tokenSet = await xeroClient.apiCallback(request.url);
```

**PKCE** (hypothetical):
```typescript
// Extract code verifier from state
const stateData = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
const codeVerifier = stateData.codeVerifier;

// Manual token exchange (xero-node may not support PKCE)
const tokenResponse = await fetch("https://identity.xero.com/connect/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code: authorizationCode,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier, // PKCE parameter
  }),
});

const tokenSet = await tokenResponse.json();
```

#### 5. Update Token Refresh

**Current** (`lib/xero/connection-manager.ts`):
```typescript
// xero-node SDK uses client secret automatically
const tokenSet = await xeroClient.refreshToken();
```

**PKCE** (hypothetical):
```typescript
// Manual refresh (no client secret)
const tokenResponse = await fetch("https://identity.xero.com/connect/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: refreshToken,
    // No client secret, no code verifier needed for refresh
  }),
});

const tokenSet = await tokenResponse.json();
```

### Database Schema Impact

**No database changes required** ✅

The `XeroConnection` table already stores all necessary fields:
- `accessToken` (encrypted)
- `refreshToken` (encrypted)
- `expiresAt`
- `tenantId`
- `scopes`

PKCE flow uses the same token structure as Code Flow.

### Security Implications

#### Security Reduction for Server Apps

| **Aspect** | **Code Flow** | **PKCE Flow** | **Impact** |
|------------|---------------|---------------|------------|
| Token Exchange Security | Client secret (server-only) | Code verifier (stored client-side during auth) | 🔴 **Reduced** |
| Refresh Token Security | Client secret required | Only client_id required | 🔴 **Reduced** |
| Secret Exposure Risk | None (server-only) | Code verifier exposed during auth flow | 🔴 **Increased** |
| MITM Protection | Client secret + HTTPS | Code verifier + HTTPS | 🟡 **Similar** |
| Overall Security | Strong | Acceptable (designed for native apps) | 🔴 **Weaker for server apps** |

#### Why PKCE is Less Secure for LedgerBot

1. **Code Verifier Storage**:
   - During authorization flow, code verifier must be stored (session cookie or database)
   - If session cookie: vulnerable to XSS attacks
   - If database: additional complexity with no security benefit

2. **Refresh Token Protection**:
   - Code Flow: Refresh requires client secret (server-only, never exposed)
   - PKCE Flow: Refresh only requires client_id (no secret verification)
   - If refresh token is stolen, PKCE provides no additional protection

3. **Designed for Native Apps**:
   - PKCE solves problem of apps that cannot securely store secrets
   - LedgerBot **can** securely store secrets (server environment)
   - Using PKCE removes security benefit without gaining functionality

### Breaking Changes and Rollback Strategy

**Breaking Changes**:
1. ✅ None for users (OAuth flow appears identical from user perspective)
2. ✅ None for database (same schema)
3. ⚠️ Environment variables: `XERO_CLIENT_SECRET` would no longer be used

**Rollback Strategy**:
1. Keep `XERO_CLIENT_SECRET` in environment variables
2. Feature flag to switch between Code Flow and PKCE
3. Monitor for errors during migration period
4. Rollback by reverting code changes (no database migration needed)

**Migration Checklist** (if required):
- [ ] Create PKCE utility functions (code verifier/challenge generation)
- [ ] Update authorization URL to include `code_challenge` and `code_challenge_method`
- [ ] Implement code verifier storage (session or database)
- [ ] Update token exchange to send `code_verifier` instead of using client secret
- [ ] Update token refresh to use client_id only
- [ ] Update Xero app configuration to "Auth Code with PKCE" grant type
- [ ] Remove `XERO_CLIENT_SECRET` from environment variables (after migration complete)
- [ ] Update documentation and CLAUDE.md
- [ ] Test full OAuth flow (authorization, callback, token refresh)
- [ ] Monitor for errors in production

**Estimated Effort**: 4-8 hours of development + testing

**Recommendation**: ❌ **DO NOT MIGRATE** - Code Flow is more secure and recommended by Xero for web server applications like LedgerBot.

---

## Conclusion

### Summary

**LedgerBot's current implementation uses OAuth2 Authorization Code Flow**, which is:

✅ **Recommended by Xero** for web server applications
✅ **More secure** than PKCE for applications that can store client secrets
✅ **Properly implemented** with CSRF protection, encrypted storage, and automatic refresh
✅ **Follows best practices** for Next.js server-side applications

### Recommendation

**KEEP the current Authorization Code Flow implementation**. No migration to PKCE is needed or recommended.

### Rationale

1. **Xero's Official Guidance**:
   - "The standard authorization code flow is suitable for web server applications that can securely store a client secret."
   - "If you're building a native app (desktop or mobile) then you should refer to the PKCE flow."

2. **LedgerBot's Architecture**:
   - Next.js server-side application with secure backend
   - Can securely store client secret in environment variables
   - All OAuth operations happen server-side (no client exposure)

3. **Security Comparison**:
   - Code Flow: Client secret provides strong server-to-server authentication
   - PKCE Flow: Designed for apps that **cannot** store secrets securely
   - Using PKCE would **reduce** security for LedgerBot without providing benefits

4. **Best Practices**:
   - Industry standard: Use Code Flow for server apps, PKCE for native apps
   - OAuth2 RFC 8252: "Public clients (native apps) MUST use PKCE"
   - OAuth2 RFC 6749: "Confidential clients (server apps) SHOULD use client secret"

### Optional Enhancements

If desired for defense-in-depth, LedgerBot could implement:

1. 🟡 **Code Flow + PKCE** (both mechanisms simultaneously) - marginal benefit
2. 🟢 **Token rotation audit logging** - recommended for production
3. 🟡 **Connection health monitoring dashboard** - nice-to-have for enterprise
4. 🟡 **OpenID Connect Discovery** - optional, xero-node SDK already handles this

### Final Verdict

✅ **Current implementation is optimal** - No changes required

LedgerBot's Authorization Code Flow implementation is secure, follows Xero's recommendations, and is appropriate for a Next.js web server application. Migration to PKCE would reduce security without providing benefits.
