# Xero Authentication Implementation Guide

## Overview

LedgerBot's Xero integration uses **OAuth2 Authorization Code Flow** (standard flow with client secret) with AES-256-GCM encryption for secure credential storage. This guide documents the complete authentication architecture, credential management, and security implementation.

---

## Table of Contents

1. [Why Authorization Code Flow](#why-authorization-code-flow)
2. [Authentication Flow](#authentication-flow)
3. [Credential Storage & Encryption](#credential-storage--encryption)
4. [Token Refresh Mechanism](#token-refresh-mechanism)
5. [Security Considerations](#security-considerations)
6. [Code Examples & Integration](#code-examples--integration)
7. [Environment Configuration](#environment-configuration)
8. [Troubleshooting](#troubleshooting)

---

## Why Authorization Code Flow

### Xero's Official Recommendation

According to Xero's official OAuth2 documentation:

> **"The standard authorization code flow is suitable for web server applications that can securely store a client secret."**
>
> **"If you're building a native app (desktop or mobile) then you should refer to the PKCE flow."**

LedgerBot is a **Next.js 15 server-side web application** that meets all criteria for using the Authorization Code Flow.

### Flow Selection Comparison

| **Requirement** | **LedgerBot** | **Code Flow Requirement** | **Match** |
|-----------------|---------------|---------------------------|-----------|
| Application Type | Next.js server-side web app | Web server application | ✅ |
| Client Secret Storage | Vercel encrypted environment variables | Can securely store client secret | ✅ |
| Token Handling | Server-side API routes only | Server-side token exchange | ✅ |
| HTTPS Endpoints | Vercel production deployment | HTTPS endpoints required | ✅ |
| Backend Security | Trusted server environment | Secure backend | ✅ |

### Why NOT PKCE Flow

**PKCE (Proof Key for Code Exchange)** is designed for applications that **cannot** securely store a client secret:

❌ **Native mobile apps** - App binary can be decompiled to extract secrets
❌ **Desktop applications** - Users have file system access to app code
❌ **Distributed client apps** - Application code runs on untrusted devices

**LedgerBot's Architecture**:
✅ **Server-side application** - Code runs in trusted server environment
✅ **Secure secret storage** - Environment variables never leave server
✅ **Backend-only token handling** - No client-side exposure

### Security Comparison: Code Flow vs PKCE

| **Security Aspect** | **Authorization Code Flow** | **PKCE Flow** |
|---------------------|----------------------------|---------------|
| **Token Exchange Security** | Client secret (server-only, never exposed) | Code verifier (stored client-side during auth) |
| **Refresh Token Security** | Client secret required (strong) | Only client_id required (weaker) |
| **Secret Exposure Risk** | Zero (server-only) | Code verifier exposed during OAuth flow |
| **Best For** | ✅ Web server applications | ✅ Native apps without secure storage |
| **Security Level for Server Apps** | **Higher** (client secret provides stronger authentication) | **Lower** (designed for apps that can't store secrets) |

### Key Advantages for LedgerBot

1. **Stronger Authentication**:
   - Client secret provides server-to-server authentication
   - Xero verifies both code AND secret during token exchange
   - Refresh requires client secret (prevents token theft)

2. **Simpler Implementation**:
   - No code verifier generation or storage needed
   - `xero-node` SDK handles all OAuth complexity
   - Less moving parts = fewer security vulnerabilities

3. **Official Recommendation**:
   - Follows Xero's best practices for web server apps
   - Aligns with OAuth2 RFC 6749 for confidential clients
   - Industry standard for server-side applications

4. **Production Ready**:
   - Proven architecture used by thousands of SaaS applications
   - Well-supported by OAuth libraries and documentation
   - Easier security audits and compliance verification

### Detailed Flow Comparison

For a comprehensive technical comparison between Authorization Code Flow and PKCE Flow, including migration considerations, see:

📄 **[Xero OAuth2 Flow Comparison Guide](/docs/xero-oauth-flow-comparison.md)**

This document includes:
- Detailed security analysis
- Implementation code examples
- When to use each flow
- Migration guide (if ever needed)
- Enhancement recommendations

---

## Authentication Flow

### Overview

The Xero OAuth2 flow follows these steps:

```
User → Settings Page → Auth Endpoint → Xero Authorization → Callback Endpoint → Token Storage → Success
```

### Step-by-Step Process

#### 1. User Initiates Connection

**Location**: `app/(settings)/settings/integrations/page.tsx`

User clicks "Connect Xero" button, which triggers a client-side navigation to the auth endpoint:

```typescript
// User clicks connect button
window.location.href = '/api/xero/auth';
```

#### 2. Generate Authorization URL with State

**Location**: `app/api/xero/auth/route.ts`

```typescript
export async function GET() {
  // Verify user is authenticated
  const user = await getAuthUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Create state parameter with user ID and timestamp for CSRF protection
  const state = Buffer.from(
    JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
    })
  ).toString("base64");

  // Generate Xero authorization URL
  const authUrl = await getXeroAuthUrl(state);

  // Return URL for redirect
  return NextResponse.json({ url: authUrl });
}
```

**State Parameter Structure**:
```json
{
  "userId": "user-uuid-here",
  "timestamp": 1704070800000
}
```

This is Base64-encoded and passed to Xero as the `state` parameter to prevent CSRF attacks.

#### 3. Xero Authorization (User Interaction)

User is redirected to Xero's authorization page where they:
- Log in to their Xero account
- Select which organization to connect
- Grant permissions (scopes) to LedgerBot
- Approve the connection

#### 4. OAuth Callback with Authorization Code

**Location**: `app/api/xero/callback/route.ts`

Xero redirects back to LedgerBot's callback URL with `code` and `state` parameters:

```
https://your-domain.com/api/xero/callback?code=AUTH_CODE_HERE&state=BASE64_STATE
```

The callback handler processes this:

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${error}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=missing_params", request.url)
    );
  }

  try {
    // Get authenticated user
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=unauthorized", request.url)
      );
    }

    // Verify state parameter matches current user (CSRF protection)
    const stateData = JSON.parse(
      Buffer.from(state, "base64").toString("utf-8")
    );

    if (stateData.userId !== user.id) {
      console.error("State verification failed: user ID mismatch");
      return NextResponse.redirect(
        new URL("/settings/integrations?error=invalid_state", request.url)
      );
    }

    // Verify timestamp is recent (within 10 minutes)
    const stateAge = Date.now() - stateData.timestamp;
    const TEN_MINUTES = 10 * 60 * 1000;
    if (stateAge > TEN_MINUTES) {
      console.error("State verification failed: expired timestamp");
      return NextResponse.redirect(
        new URL("/settings/integrations?error=expired_state", request.url)
      );
    }

    // Create Xero client and exchange code for tokens
    const xeroClient = createXeroClient(state);
    const tokenSet = await xeroClient.apiCallback(request.url);

    // Get tenant (organization) information
    const tenants = await getXeroTenants(tokenSet.access_token);
    if (!tenants || tenants.length === 0) {
      throw new Error("No Xero organizations found");
    }

    // Use first tenant (in future, could allow user to select)
    const tenant = tenants[0];

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokenSet.access_token);
    const encryptedRefreshToken = encryptToken(tokenSet.refresh_token!);

    // Calculate token expiry (typically 30 minutes for access token)
    const expiresAt = new Date(Date.now() + tokenSet.expires_in! * 1000);

    // Store connection in database
    await createXeroConnection({
      userId: user.id,
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      scopes: getXeroScopes(),
    });

    // Redirect to success page
    return NextResponse.redirect(
      new URL("/settings/integrations?success=xero_connected", request.url)
    );
  } catch (error) {
    console.error("Xero OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/settings/integrations?error=connection_failed", request.url)
    );
  }
}
```

#### 5. Token Storage

After successful token exchange, credentials are encrypted and stored in the database (see [Credential Storage](#credential-storage--encryption) section).

#### 6. Success Redirect

User is redirected back to the integrations settings page with a success message.

---

## Credential Storage & Encryption

### Database Schema

**Location**: `lib/db/schema.ts`

```typescript
export const xeroConnection = pgTable("XeroConnection", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  tenantId: varchar("tenantId", { length: 255 }).notNull(),
  tenantName: varchar("tenantName", { length: 255 }),
  accessToken: text("accessToken").notNull(), // Encrypted with AES-256-GCM
  refreshToken: text("refreshToken").notNull(), // Encrypted with AES-256-GCM
  expiresAt: timestamp("expiresAt").notNull(),
  scopes: jsonb("scopes").$type<string[]>().notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
```

**Key Fields**:
- `accessToken`: OAuth2 access token (encrypted, valid for ~30 minutes)
- `refreshToken`: OAuth2 refresh token (encrypted, valid for ~60 days)
- `expiresAt`: Timestamp when access token expires
- `isActive`: Boolean flag to support multiple connections (only one active per user)
- `scopes`: JSON array of granted OAuth scopes

### AES-256-GCM Encryption

**Location**: `lib/xero/encryption.ts`

LedgerBot uses **AES-256-GCM** (Galois/Counter Mode) for token encryption, which provides both confidentiality and authentication.

#### Encryption Implementation

```typescript
import { createCipheriv, randomBytes, type CipherGCM } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Encrypts a token using AES-256-GCM
 * @param token - Plaintext token to encrypt
 * @returns Encrypted token in format: iv:authTag:encryptedData (all hex-encoded)
 */
export function encryptToken(token: string): string {
  // Get encryption key from environment variable
  const key = getEncryptionKey();

  // Generate random initialization vector (IV)
  // IV must be unique for each encryption to ensure security
  const iv = randomBytes(IV_LENGTH);

  // Create cipher with AES-256-GCM algorithm
  const cipher: CipherGCM = createCipheriv(ALGORITHM, key, iv);

  // Encrypt the token
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Get authentication tag for integrity verification
  const authTag = cipher.getAuthTag();

  // Return format: iv:authTag:encryptedData (all hex-encoded)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}
```

**Encrypted Token Format**:
```
[IV (32 hex chars)]:[Auth Tag (32 hex chars)]:[Encrypted Data (variable length)]
```

Example:
```
a1b2c3d4e5f6789012345678901234ab:1234567890abcdef1234567890abcdef:9f8e7d6c5b4a39281726354...
```

#### Decryption Implementation

```typescript
import { createDecipheriv, type DecipherGCM } from "node:crypto";

/**
 * Decrypts a token encrypted with AES-256-GCM
 * @param encryptedToken - Encrypted token in format: iv:authTag:encryptedData
 * @returns Decrypted plaintext token
 * @throws Error if decryption fails (e.g., tampered data)
 */
export function decryptToken(encryptedToken: string): string {
  // Get encryption key from environment variable
  const key = getEncryptionKey();

  // Parse encrypted token format: iv:authTag:encryptedData
  const parts = encryptedToken.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  // Create decipher with AES-256-GCM algorithm
  const decipher: DecipherGCM = createDecipheriv(ALGORITHM, key, iv);

  // Set authentication tag for verification
  // If tag doesn't match (data was tampered), decryption will throw error
  decipher.setAuthTag(authTag);

  // Decrypt the token
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
```

#### Encryption Key Management

```typescript
/**
 * Gets encryption key from environment variable
 * @returns Buffer containing 32-byte encryption key
 * @throws Error if XERO_ENCRYPTION_KEY is not set or invalid
 */
function getEncryptionKey(): Buffer {
  const encryptionKey = process.env.XERO_ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error("XERO_ENCRYPTION_KEY environment variable is not set");
  }

  // Convert hex string to buffer
  const key = Buffer.from(encryptionKey, "hex");

  // Verify key is exactly 32 bytes (256 bits) for AES-256
  if (key.length !== 32) {
    throw new Error(
      `XERO_ENCRYPTION_KEY must be 32 bytes (64 hex characters), got ${key.length} bytes`
    );
  }

  return key;
}
```

**Generating a Valid Encryption Key**:

```bash
# Generate a random 32-byte (256-bit) key and output as hex
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Example output:
```
a1b2c3d4e5f67890123456789012345678901234567890123456789012345678
```

Add this to your `.env.local`:
```bash
XERO_ENCRYPTION_KEY=a1b2c3d4e5f67890123456789012345678901234567890123456789012345678
```

### Security Features

1. **AES-256-GCM Algorithm**:
   - Industry-standard authenticated encryption
   - Provides both confidentiality (encryption) and integrity (authentication)
   - Resistant to tampering attacks

2. **Random IV (Initialization Vector)**:
   - Unique IV generated for each encryption operation
   - Ensures same token encrypted twice produces different ciphertext
   - Prevents pattern analysis attacks

3. **Authentication Tag**:
   - Verifies data has not been tampered with
   - Decryption automatically fails if data modified
   - Protects against bit-flipping and substitution attacks

4. **Key Security**:
   - 256-bit key provides strong cryptographic security
   - Key stored only in environment variable (never in code or database)
   - Key rotation supported (re-encrypt all tokens with new key)

---

## Token Refresh Mechanism

### Overview

OAuth2 access tokens have a short lifespan (typically 30 minutes). LedgerBot automatically refreshes tokens when they're about to expire, providing seamless access to Xero data.

### Automatic Refresh Logic

**Location**: `lib/xero/connection-manager.ts`

```typescript
/**
 * Gets a decrypted Xero connection and automatically refreshes tokens if expiring soon
 * @param userId - User ID to get connection for
 * @returns Decrypted connection with valid access token
 * @throws Error if no active connection found or refresh fails
 */
export async function getDecryptedConnection(
  userId: string
): Promise<DecryptedXeroConnection | null> {
  // Fetch active connection from database
  const connection = await getActiveXeroConnection(userId);

  if (!connection) {
    return null;
  }

  // Check if token is expiring within 5 minutes
  const now = new Date();
  const expiresAt = new Date(connection.expiresAt);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  // If token expires within 5 minutes, refresh it
  if (expiresAt <= fiveMinutesFromNow) {
    console.log(
      `Xero token expiring soon (${expiresAt.toISOString()}), refreshing...`
    );

    const refreshedConnection = await refreshXeroToken(connection.id);

    // Return decrypted connection with fresh tokens
    return {
      ...refreshedConnection,
      accessToken: decryptToken(refreshedConnection.accessToken),
      refreshToken: decryptToken(refreshedConnection.refreshToken),
    };
  }

  // Token still valid, return decrypted connection
  return {
    ...connection,
    accessToken: decryptToken(connection.accessToken),
    refreshToken: decryptToken(connection.refreshToken),
  };
}
```

### Token Refresh Process

**Location**: `lib/xero/connection-manager.ts`

```typescript
/**
 * Refreshes an expired Xero access token using the refresh token
 * @param connectionId - Connection ID to refresh
 * @returns Updated connection with new tokens
 * @throws Error if refresh fails
 */
async function refreshXeroToken(
  connectionId: string
): Promise<XeroConnectionRecord> {
  // Fetch connection from database
  const connection = await db.query.xeroConnection.findFirst({
    where: eq(xeroConnection.id, connectionId),
  });

  if (!connection) {
    throw new Error(`Xero connection ${connectionId} not found`);
  }

  // Decrypt existing refresh token
  const currentRefreshToken = decryptToken(connection.refreshToken);

  // Create Xero OAuth client
  const xeroClient = createXeroClient();

  try {
    // Use refresh token to get new access token
    const tokenSet = await xeroClient.refreshToken(currentRefreshToken);

    // Encrypt new tokens
    const encryptedAccessToken = encryptToken(tokenSet.access_token);
    const encryptedRefreshToken = encryptToken(tokenSet.refresh_token!);

    // Calculate new expiry time
    const expiresAt = new Date(Date.now() + tokenSet.expires_in! * 1000);

    // Update database with new tokens
    const [updatedConnection] = await db
      .update(xeroConnection)
      .set({
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(xeroConnection.id, connectionId))
      .returning();

    console.log(
      `Successfully refreshed Xero token for connection ${connectionId}`
    );

    return updatedConnection;
  } catch (error) {
    console.error(`Failed to refresh Xero token for ${connectionId}:`, error);

    // Mark connection as inactive if refresh fails
    await db
      .update(xeroConnection)
      .set({ isActive: false })
      .where(eq(xeroConnection.id, connectionId));

    throw new Error("Failed to refresh Xero token. Please reconnect.");
  }
}
```

### Refresh Timing

**5-Minute Threshold**: Tokens are refreshed when they expire within 5 minutes. This provides:
- **Safety margin**: Prevents token expiration during API calls
- **Efficiency**: Avoids unnecessary refreshes for recently refreshed tokens
- **User experience**: Seamless access without interruptions

**Refresh Token Lifespan**: Refresh tokens typically last ~60 days. After this period, users must reconnect their Xero account.

### Error Handling

If token refresh fails:
1. Error is logged to console
2. Connection is marked as `isActive: false` in database
3. Error is thrown to calling code
4. User sees "Xero connection inactive" message in settings
5. User must reconnect Xero account to restore access

---

## Security Considerations

### 1. CSRF Protection (State Parameter)

**Threat**: Cross-Site Request Forgery attacks could trick users into connecting attacker's Xero account to their LedgerBot account.

**Mitigation**: State parameter contains Base64-encoded JSON with:
- `userId`: Verified against authenticated user in callback
- `timestamp`: Verified to be recent (within 10 minutes)

```typescript
// State generation
const state = Buffer.from(
  JSON.stringify({
    userId: user.id,
    timestamp: Date.now(),
  })
).toString("base64");

// State verification in callback
const stateData = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));

if (stateData.userId !== user.id) {
  throw new Error("State verification failed: user ID mismatch");
}

const stateAge = Date.now() - stateData.timestamp;
const TEN_MINUTES = 10 * 60 * 1000;
if (stateAge > TEN_MINUTES) {
  throw new Error("State verification failed: expired timestamp");
}
```

### 2. Token Encryption (AES-256-GCM)

**Threat**: Database compromise could expose OAuth tokens, allowing unauthorized access to Xero accounts.

**Mitigation**: All tokens stored with AES-256-GCM encryption:
- **Confidentiality**: Encrypted tokens unreadable without encryption key
- **Integrity**: Authentication tag detects tampering
- **Key Management**: Encryption key stored only in environment variables (not in database or code)

### 3. Scope Management (Principle of Least Privilege)

**Threat**: Over-permissioned OAuth scopes increase risk if credentials compromised.

**Mitigation**: Request only necessary scopes:

```typescript
const XERO_SCOPES = [
  "offline_access", // Required for refresh tokens
  "accounting.transactions", // Invoices, bills, payments
  "accounting.contacts", // Customers and suppliers
  "accounting.settings", // Organization info, chart of accounts
  "accounting.reports.read", // Financial reports (read-only)
  "accounting.journals.read", // Journal entries (read-only)
  "accounting.attachments", // File attachments
  "payroll.employees", // Employee data
  "payroll.payruns", // Pay run data
  "payroll.timesheets", // Timesheet data
];
```

**Note**: Some scopes are read-only (`.read` suffix) to prevent accidental data modification.

### 4. Single Active Connection Enforcement

**Threat**: Multiple active connections could cause confusion or security issues.

**Mitigation**: Database query ensures only one active connection per user:

```typescript
export async function getActiveXeroConnection(
  userId: string
): Promise<XeroConnectionRecord | null> {
  return await db.query.xeroConnection.findFirst({
    where: and(
      eq(xeroConnection.userId, userId),
      eq(xeroConnection.isActive, true)
    ),
  });
}

export async function createXeroConnection(
  data: NewXeroConnection
): Promise<XeroConnectionRecord> {
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

### 5. Token Exposure Prevention

**Best Practices**:
- ✅ Tokens decrypted only when needed (in `getDecryptedConnection()`)
- ✅ Decrypted tokens never logged or persisted
- ✅ Tokens passed directly to Xero API client (not stored in memory long-term)
- ✅ Database backups contain only encrypted tokens
- ✅ Environment variables use secure secrets management (Vercel, AWS, etc.)

### 6. Connection Validation

**Threat**: Stale or invalid connections could cause errors or expose data.

**Mitigation**: Connection validation on every use:

```typescript
export async function getDecryptedConnection(
  userId: string
): Promise<DecryptedXeroConnection | null> {
  const connection = await getActiveXeroConnection(userId);

  if (!connection) {
    return null; // No active connection
  }

  // Validate token freshness and auto-refresh if needed
  // (see Token Refresh section)
  // ...

  return decryptedConnection;
}
```

### 7. Audit Trail

**Location**: Database `createdAt` and `updatedAt` timestamps

```typescript
export const xeroConnection = pgTable("XeroConnection", {
  // ... other fields
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
```

These timestamps enable:
- Connection history tracking
- Token refresh monitoring
- Security incident investigation

---

## Code Examples & Integration

### Using Xero Connection in MCP Tools

**Location**: `lib/ai/xero-mcp-client.ts`

All Xero MCP tools follow this pattern:

```typescript
export async function executeXeroMCPTool(
  userId: string,
  toolName: string,
  args: Record<string, any>
): Promise<MCPToolResult> {
  // Get active connection with auto-refresh
  const connection = await getDecryptedConnection(userId);

  if (!connection) {
    return {
      content: [
        {
          type: "text",
          text: "No active Xero connection. Please connect your Xero account in Settings > Integrations.",
        },
      ],
    };
  }

  // Create Xero API client with decrypted access token
  const client = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    redirectUris: [process.env.XERO_REDIRECT_URI!],
    scopes: getXeroScopes().join(" "),
  });

  // Set access token (already decrypted)
  await client.setTokenSet({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expires_in: Math.floor(
      (new Date(connection.expiresAt).getTime() - Date.now()) / 1000
    ),
  });

  // Execute tool-specific logic
  switch (toolName) {
    case "xero_list_invoices": {
      const { status, dateFrom, dateTo, contactId } = args;

      const response = await client.accountingApi.getInvoices(
        connection.tenantId,
        undefined, // modifiedAfter
        status === "all" ? undefined : status,
        undefined, // page
        undefined, // includeArchived
        undefined, // createdByMyApp
        undefined, // summaryOnly
        contactId ? [contactId] : undefined
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.body.invoices, null, 2),
          },
        ],
      };
    }

    case "xero_get_invoice": {
      const { invoiceId } = args;

      const response = await client.accountingApi.getInvoice(
        connection.tenantId,
        invoiceId
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.body.invoices?.[0], null, 2),
          },
        ],
      };
    }

    // ... other tool implementations
  }
}
```

### Using in AI SDK Tools

**Location**: `lib/ai/tools/xero-tools.ts`

```typescript
import { tool } from "ai";
import { z } from "zod";
import { executeXeroMCPTool } from "@/lib/ai/xero-mcp-client";

export function createXeroTools(userId: string) {
  return {
    xero_list_invoices: tool({
      description:
        "Get a list of invoices from Xero. Supports filtering by status (DRAFT, SUBMITTED, AUTHORISED, PAID), date range, and contact.",
      parameters: z.object({
        status: z
          .enum(["all", "DRAFT", "SUBMITTED", "AUTHORISED", "PAID"])
          .optional()
          .describe("Filter by invoice status"),
        dateFrom: z
          .string()
          .optional()
          .describe("Filter invoices from this date (YYYY-MM-DD)"),
        dateTo: z
          .string()
          .optional()
          .describe("Filter invoices to this date (YYYY-MM-DD)"),
        contactId: z
          .string()
          .optional()
          .describe("Filter invoices for specific contact ID"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_invoices",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_get_invoice: tool({
      description: "Get detailed information about a specific invoice by ID.",
      parameters: z.object({
        invoiceId: z.string().describe("The Xero invoice ID (GUID)"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_invoice",
          args
        );
        return result.content[0].text;
      },
    }),

    // ... other tool definitions
  };
}
```

### Integration in Chat Route

**Location**: `app/(chat)/api/chat/route.ts`

```typescript
export async function POST(request: Request) {
  // ... authentication and setup

  // Check if user has Xero connection
  const xeroConnection = await getActiveXeroConnection(user.id);
  const xeroTools = xeroConnection ? createXeroTools(user.id) : {};

  const stream = createUIMessageStream({
    execute: ({ writer: dataStream }) => {
      // Add Xero tool names to active tools if connection exists
      const finalActiveTools: string[] = xeroConnection
        ? [...activeTools, ...xeroToolNames]
        : activeTools;

      const result = streamText({
        model: myProvider.languageModel(selectedChatModel),
        system: systemPrompt({ requestHints, activeTools: finalActiveTools }),
        messages: convertToModelMessages(includeAttachmentText(uiMessages)),
        experimental_activeTools: finalActiveTools as any,
        tools: {
          getWeather,
          createDocument: createDocument({ user, dataStream }),
          updateDocument: updateDocument({ user, dataStream }),
          requestSuggestions: requestSuggestions({ user, dataStream }),
          ...xeroTools, // Conditionally include Xero tools
        },
        // ... other options
      });

      // ... rest of streaming logic
    },
  });

  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}
```

### Error Handling Pattern

```typescript
try {
  const connection = await getDecryptedConnection(userId);

  if (!connection) {
    return {
      content: [
        {
          type: "text",
          text: "No active Xero connection. Please connect your Xero account in Settings > Integrations.",
        },
      ],
    };
  }

  // Use connection...
} catch (error) {
  console.error("Xero API error:", error);

  return {
    content: [
      {
        type: "text",
        text: `Error accessing Xero data: ${error instanceof Error ? error.message : "Unknown error"}. Please check your connection in Settings.`,
      },
    ],
  };
}
```

### Disconnecting Xero

**Location**: `app/api/xero/disconnect/route.ts`

```typescript
export async function POST() {
  const user = await getAuthUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const connection = await getActiveXeroConnection(user.id);

  if (!connection) {
    return NextResponse.json(
      { error: "No active Xero connection" },
      { status: 404 }
    );
  }

  // Deactivate connection (soft delete)
  await deactivateXeroConnection(connection.id);

  return NextResponse.json({ success: true });
}
```

---

## Environment Configuration

### Required Environment Variables

Add these to `.env.local` for local development:

```bash
# Xero OAuth2 Configuration
XERO_CLIENT_ID=your_xero_client_id_here
XERO_CLIENT_SECRET=your_xero_client_secret_here
XERO_REDIRECT_URI=http://localhost:3000/api/xero/callback

# Xero Token Encryption (32-byte hex key)
XERO_ENCRYPTION_KEY=a1b2c3d4e5f67890123456789012345678901234567890123456789012345678
```

### Production Environment Variables

For production (Vercel, AWS, etc.):

```bash
# Xero OAuth2 Configuration
XERO_CLIENT_ID=your_xero_client_id_here
XERO_CLIENT_SECRET=your_xero_client_secret_here
XERO_REDIRECT_URI=https://yourdomain.com/api/xero/callback

# Xero Token Encryption (use secrets management)
XERO_ENCRYPTION_KEY=production_key_from_secrets_manager
```

### Getting Xero OAuth Credentials

1. **Create Xero App**:
   - Go to [Xero Developer Portal](https://developer.xero.com/app/manage)
   - Click "New app"
   - Choose "OAuth 2.0" app type

2. **Configure OAuth Settings**:
   - **App name**: LedgerBot (or your app name)
   - **Redirect URI**: `http://localhost:3000/api/xero/callback` (development) or `https://yourdomain.com/api/xero/callback` (production)
   - **Scopes**: Select all accounting and payroll scopes needed

3. **Get Credentials**:
   - **Client ID**: Copy from app settings
   - **Client Secret**: Copy from app settings (keep secure!)

4. **Generate Encryption Key**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### Environment Variable Validation

The application validates environment variables on startup:

```typescript
// lib/xero/connection-manager.ts
if (!process.env.XERO_CLIENT_ID) {
  throw new Error("XERO_CLIENT_ID environment variable is not set");
}

if (!process.env.XERO_CLIENT_SECRET) {
  throw new Error("XERO_CLIENT_SECRET environment variable is not set");
}

if (!process.env.XERO_REDIRECT_URI) {
  throw new Error("XERO_REDIRECT_URI environment variable is not set");
}

// lib/xero/encryption.ts
if (!process.env.XERO_ENCRYPTION_KEY) {
  throw new Error("XERO_ENCRYPTION_KEY environment variable is not set");
}

const key = Buffer.from(process.env.XERO_ENCRYPTION_KEY, "hex");
if (key.length !== 32) {
  throw new Error(
    `XERO_ENCRYPTION_KEY must be 32 bytes (64 hex characters), got ${key.length} bytes`
  );
}
```

---

## Troubleshooting

### Common Issues

#### 1. "No active Xero connection" Error

**Symptoms**: User sees message "No active Xero connection. Please connect your Xero account in Settings > Integrations."

**Causes**:
- User has not connected Xero account yet
- Connection was disconnected manually
- Token refresh failed and connection was deactivated

**Solution**:
1. Go to Settings > Integrations
2. Click "Connect Xero"
3. Complete OAuth flow
4. Verify connection shows as "Connected"

#### 2. "State verification failed" Error

**Symptoms**: OAuth callback fails with "invalid_state" or "expired_state" error

**Causes**:
- State parameter tampering (CSRF attack attempt)
- State parameter expired (>10 minutes old)
- User ID mismatch

**Solution**:
- Restart OAuth flow from Settings > Integrations
- Ensure user is logged in with same account
- Check for browser extensions blocking OAuth flow

#### 3. "Failed to refresh Xero token" Error

**Symptoms**: Connection becomes inactive, user must reconnect

**Causes**:
- Refresh token expired (typically after 60 days)
- Xero API connectivity issues
- OAuth credentials revoked in Xero

**Solution**:
1. Go to Settings > Integrations
2. Disconnect existing connection (if shown)
3. Click "Connect Xero" to reconnect
4. Complete OAuth flow again

#### 4. "XERO_ENCRYPTION_KEY environment variable is not set" Error

**Symptoms**: Application crashes on startup or when accessing Xero features

**Causes**:
- Environment variable not configured
- Variable name misspelled
- Deployment platform not loading environment variables

**Solution**:
1. Generate encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Add to `.env.local`:
   ```bash
   XERO_ENCRYPTION_KEY=generated_key_here
   ```
3. Restart application
4. For production, add to deployment platform's secrets

#### 5. "XERO_ENCRYPTION_KEY must be 32 bytes" Error

**Symptoms**: Application crashes with encryption key length error

**Causes**:
- Encryption key is not 64 hex characters (32 bytes)
- Key contains non-hex characters
- Key was truncated or modified

**Solution**:
1. Verify key length:
   ```bash
   echo -n "your_key_here" | wc -c  # Should output 64
   ```
2. If incorrect, generate new key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. **IMPORTANT**: Changing encryption key invalidates all existing tokens
4. After changing key, all users must reconnect Xero accounts

#### 6. OAuth Callback 401 Unauthorized Error

**Symptoms**: OAuth callback returns 401 error

**Causes**:
- User not logged in to LedgerBot
- Session expired during OAuth flow
- Clerk authentication issue

**Solution**:
1. Ensure user is logged in before starting OAuth flow
2. Clear browser cookies and log in again
3. Restart OAuth flow from Settings > Integrations

#### 7. "No Xero organizations found" Error

**Symptoms**: OAuth callback fails with "No Xero organizations found"

**Causes**:
- User's Xero account has no organizations
- User didn't select an organization during OAuth flow
- Xero API connectivity issue

**Solution**:
1. Verify user has access to at least one Xero organization
2. Log in to [Xero](https://www.xero.com) directly to confirm access
3. Retry OAuth flow and ensure organization selection step completes

### Debugging Tips

#### Enable Debug Logging

Temporary console logging can help diagnose issues:

```typescript
// lib/xero/connection-manager.ts
export async function getDecryptedConnection(userId: string) {
  console.log(`[DEBUG] Getting Xero connection for user ${userId}`);

  const connection = await getActiveXeroConnection(userId);

  if (!connection) {
    console.log(`[DEBUG] No active connection found for user ${userId}`);
    return null;
  }

  console.log(`[DEBUG] Connection found:`, {
    tenantId: connection.tenantId,
    tenantName: connection.tenantName,
    expiresAt: connection.expiresAt,
    isActive: connection.isActive,
  });

  // ... rest of function
}
```

#### Check Database State

Use Drizzle Studio to inspect database:

```bash
pnpm db:studio
```

Navigate to `XeroConnection` table and verify:
- `isActive` is `true` for expected connections
- `expiresAt` is in the future (or recently past if auto-refresh failed)
- `userId` matches authenticated user's ID

#### Test Token Decryption

Create a test script to verify encryption/decryption:

```typescript
// scripts/test-encryption.ts
import { encryptToken, decryptToken } from "../lib/xero/encryption";

const testToken = "test-token-12345";
const encrypted = encryptToken(testToken);
console.log("Encrypted:", encrypted);

const decrypted = decryptToken(encrypted);
console.log("Decrypted:", decrypted);

if (decrypted === testToken) {
  console.log("✅ Encryption/decryption working correctly");
} else {
  console.error("❌ Encryption/decryption failed");
}
```

Run with:
```bash
tsx scripts/test-encryption.ts
```

#### Monitor Token Refresh

Check server logs for token refresh activity:

```
Xero token expiring soon (2024-01-01T12:30:00.000Z), refreshing...
Successfully refreshed Xero token for connection abc-123-def
```

If refresh is failing, check for:
- Xero API connectivity issues
- Invalid refresh token (may need reconnection)
- OAuth credentials issues

---

## Best Practices

### 1. Key Rotation

Periodically rotate encryption keys for enhanced security:

1. **Generate new key**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Create migration script**:
   ```typescript
   // scripts/rotate-encryption-key.ts
   import { encryptToken, decryptToken } from "../lib/xero/encryption";
   import { db } from "../lib/db";
   import { xeroConnection } from "../lib/db/schema";

   async function rotateKey() {
     const oldKey = process.env.OLD_XERO_ENCRYPTION_KEY!;
     const newKey = process.env.XERO_ENCRYPTION_KEY!;

     const connections = await db.query.xeroConnection.findMany();

     for (const connection of connections) {
       // Decrypt with old key
       const accessToken = decryptToken(connection.accessToken, oldKey);
       const refreshToken = decryptToken(connection.refreshToken, oldKey);

       // Re-encrypt with new key
       const newAccessToken = encryptToken(accessToken, newKey);
       const newRefreshToken = encryptToken(refreshToken, newKey);

       // Update database
       await db
         .update(xeroConnection)
         .set({
           accessToken: newAccessToken,
           refreshToken: newRefreshToken,
         })
         .where(eq(xeroConnection.id, connection.id));
     }

     console.log(`Rotated encryption key for ${connections.length} connections`);
   }

   rotateKey();
   ```

3. **Run migration**:
   ```bash
   OLD_XERO_ENCRYPTION_KEY=old_key_here \
   XERO_ENCRYPTION_KEY=new_key_here \
   tsx scripts/rotate-encryption-key.ts
   ```

### 2. Connection Health Monitoring

Monitor connection health with periodic checks:

```typescript
// lib/xero/health-check.ts
export async function checkXeroConnectionHealth(
  userId: string
): Promise<{ healthy: boolean; message: string }> {
  const connection = await getActiveXeroConnection(userId);

  if (!connection) {
    return { healthy: false, message: "No active connection" };
  }

  const now = new Date();
  const expiresAt = new Date(connection.expiresAt);

  if (expiresAt <= now) {
    return { healthy: false, message: "Access token expired" };
  }

  // Check if refresh token will expire soon (within 7 days)
  // Note: Refresh token expiry not stored, estimate 60 days from creation
  const connectionAge = now.getTime() - connection.createdAt.getTime();
  const FIFTY_THREE_DAYS = 53 * 24 * 60 * 60 * 1000; // 60 days - 7 day warning

  if (connectionAge > FIFTY_THREE_DAYS) {
    return {
      healthy: true,
      message: "Refresh token expiring soon, consider reconnecting",
    };
  }

  return { healthy: true, message: "Connection healthy" };
}
```

### 3. User Notifications

Notify users when connection requires attention:

```typescript
// app/(settings)/settings/integrations/page.tsx
const health = await checkXeroConnectionHealth(user.id);

if (!health.healthy) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Xero Connection Issue</AlertTitle>
      <AlertDescription>{health.message}</AlertDescription>
    </Alert>
  );
}

if (health.message.includes("expiring soon")) {
  return (
    <Alert variant="warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Action Required</AlertTitle>
      <AlertDescription>
        {health.message}. Please reconnect soon to avoid interruption.
      </AlertDescription>
    </Alert>
  );
}
```

### 4. Audit Logging

Log important security events:

```typescript
// lib/xero/audit-log.ts
export async function logXeroEvent(
  userId: string,
  event: "connected" | "disconnected" | "token_refreshed" | "refresh_failed",
  metadata?: Record<string, any>
) {
  console.log(`[XERO AUDIT] User ${userId}: ${event}`, metadata);

  // In production, send to monitoring service (Sentry, DataDog, etc.)
  // await monitoringService.log({
  //   level: "info",
  //   message: `Xero ${event}`,
  //   userId,
  //   ...metadata,
  // });
}

// Usage in connection-manager.ts
await createXeroConnection({ ... });
await logXeroEvent(userId, "connected", { tenantId, tenantName });
```

---

## Summary

LedgerBot's Xero integration implements industry-standard OAuth2 authentication with robust security measures:

- **OAuth2 Authorization Code Flow** with CSRF protection via state parameter
- **AES-256-GCM encryption** for secure token storage in database
- **Automatic token refresh** when tokens expire within 5 minutes
- **Single active connection** enforcement per user
- **Comprehensive error handling** with user-friendly messages
- **Audit trails** via database timestamps and event logging

This architecture ensures secure, seamless access to Xero accounting data while protecting user credentials and maintaining high availability through automatic token management.
