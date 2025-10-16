# Xero Integration - Developer Notes

## Architecture Overview

The Xero integration follows a layered architecture pattern with clear separation of concerns:

```
User Interface Layer
    ↓
AI SDK Tool Layer (lib/ai/tools/xero-tools.ts)
    ↓
MCP Client Layer (lib/ai/xero-mcp-client.ts)
    ↓
Connection Manager Layer (lib/xero/connection-manager.ts)
    ↓
Xero Node SDK (xero-node)
    ↓
Xero API
```

### Key Design Decisions

1. **Built-in MCP Server**: Instead of running an external MCP server process, we implement MCP-compatible interfaces directly in the application for better performance and simpler deployment.

2. **Token Encryption at Rest**: All OAuth tokens are encrypted using AES-256-GCM before storage to protect sensitive credentials.

3. **Automatic Token Refresh**: Tokens are automatically refreshed when they expire within 5 minutes, ensuring uninterrupted access.

4. **Dynamic Tool Loading**: Xero tools are conditionally loaded based on active connection status, avoiding unnecessary API calls.

5. **Single Active Connection**: Users can connect multiple Xero organisations but only one is active at a time for simplicity.

## Implementation Details

### Database Schema

**XeroConnection Table** (`lib/db/schema.ts`):

```typescript
export const xeroConnection = pgTable("XeroConnection", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  tenantId: varchar("tenantId", { length: 255 }).notNull(),
  tenantName: varchar("tenantName", { length: 255 }),
  accessToken: text("accessToken").notNull(), // Encrypted
  refreshToken: text("refreshToken").notNull(), // Encrypted
  expiresAt: timestamp("expiresAt").notNull(),
  scopes: jsonb("scopes").$type<string[]>().notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
```

**Indexes**:
- Primary key on `id`
- Foreign key on `userId` with cascade delete
- Query optimization on `userId` + `isActive` (most common query)

**Security Considerations**:
- Access and refresh tokens are encrypted using `XERO_ENCRYPTION_KEY`
- Encryption key must be 32 bytes (64 hex characters)
- Never log or expose decrypted tokens

### Encryption Layer

**File**: `lib/xero/encryption.ts`

**Algorithm**: AES-256-GCM (Authenticated Encryption)
- **Key Size**: 256 bits (32 bytes)
- **IV Length**: 12 bytes (96 bits) - randomly generated per encryption
- **Auth Tag Length**: 16 bytes (128 bits)

**Encrypted Token Format**:
```
[IV:AuthTag:EncryptedData]
hex(12 bytes):hex(16 bytes):hex(variable)
```

**Key Management**:
```bash
# Generate encryption key (development)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Production: Use secrets manager (AWS Secrets Manager, GCP Secret Manager, etc.)
```

**Best Practices**:
- Store encryption key in environment variables, not in code
- Rotate encryption keys periodically (requires re-encryption of all tokens)
- Use different keys for development, staging, and production

### OAuth Flow

**Initialization** (`app/api/xero/auth/route.ts`):

```typescript
// State includes userId for verification and timestamp for expiry
const state = Buffer.from(
  JSON.stringify({
    userId: user.id,
    timestamp: Date.now(),
  })
).toString("base64");

const authUrl = getXeroAuthUrl(state);
```

**Security Measures**:
1. **State Parameter**: Prevents CSRF attacks by verifying user identity
2. **Timestamp**: Can be used to expire old authorization requests
3. **HTTPS Only**: Redirect URIs must use HTTPS in production

**Callback Handler** (`app/api/xero/callback/route.ts`):

Flow:
1. Verify state parameter matches user ID
2. Exchange authorization code for tokens
3. Fetch tenant (organisation) information
4. Encrypt and store tokens in database
5. Redirect to settings page with success message

**Error Handling**:
- Invalid state → Redirect with `error=invalid_state`
- No organisations → Redirect with `error=no_organizations`
- Token exchange failure → Redirect with `error=connection_failed`

### Connection Manager

**File**: `lib/xero/connection-manager.ts`

**Key Functions**:

1. **createXeroClient()**: Initialize Xero SDK client with environment credentials
2. **getDecryptedConnection(userId)**: Retrieve and decrypt active connection, auto-refresh if needed
3. **refreshXeroToken(connectionId)**: Refresh expired tokens using refresh token
4. **getXeroTenants(accessToken)**: Fetch list of accessible organisations
5. **getXeroAuthUrl(state)**: Generate OAuth authorization URL

**Token Refresh Logic**:

```typescript
// Check if token expires within 5 minutes
const expiresAt = new Date(connection.expiresAt);
const now = new Date();
const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

if (expiresAt <= fiveMinutesFromNow) {
  // Trigger refresh
  await refreshXeroToken(connection.id);
}
```

**Concurrency Considerations**:
- Multiple simultaneous requests may trigger duplicate refresh attempts
- Consider implementing a mutex or caching layer for high-traffic scenarios

### MCP Client Layer

**File**: `lib/ai/xero-mcp-client.ts`

**Tool Interface**:
```typescript
export interface XeroMCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}
```

**Available Tools**:
1. `xero_list_invoices` - List invoices with filters
2. `xero_get_invoice` - Get specific invoice
3. `xero_list_contacts` - List contacts with search
4. `xero_get_contact` - Get specific contact
5. `xero_list_accounts` - Get chart of accounts
6. `xero_list_journal_entries` - List manual journals
7. `xero_get_bank_transactions` - List bank transactions
8. `xero_get_organisation` - Get organisation info

**Xero API Quirks**:

1. **Where Clause Syntax**:
   ```typescript
   // Correct
   where: 'Status=="PAID"'
   where: 'Date>=DateTime(2024-01-01)'

   // Multiple conditions
   where: 'Status=="PAID" AND Date>=DateTime(2024-01-01)'
   ```

2. **Manual Journals Date Filtering**:
   - Xero API doesn't support date filtering for manual journals
   - We filter client-side after fetching

3. **Pagination**:
   - Most endpoints support `page` parameter
   - Default implementation uses `limit` without pagination
   - Consider implementing pagination for large datasets

4. **Rate Limiting**:
   - Xero enforces rate limits (60 calls per minute per organisation)
   - No rate limiting implemented yet - see "Opportunities for Improvement"

### AI SDK Integration

**File**: `lib/ai/tools/xero-tools.ts`

**Tool Creation Pattern**:
```typescript
export function createXeroTools(userId: string) {
  return {
    xero_list_invoices: tool({
      description: "...",
      parameters: z.object({
        status: z.enum([...]).optional(),
        dateFrom: z.string().optional(),
        // ...
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
    // ... other tools
  };
}
```

**Key Points**:
- Each tool is scoped to a specific user via `userId`
- Zod schemas provide type safety and validation
- Tool execution is async and handles errors gracefully
- Results are returned as text (JSON stringified)

### Chat Route Integration

**File**: `app/(chat)/api/chat/route.ts`

**Integration Pattern**:
```typescript
// Check for Xero connection
const xeroConnection = await getActiveXeroConnection(user.id);
const xeroTools = xeroConnection ? createXeroTools(user.id) : {};

// Add to active tools
const finalActiveTools = xeroConnection
  ? [...activeTools, ...xeroToolNames]
  : activeTools;

// Merge with existing tools
const result = streamText({
  tools: {
    getWeather,
    createDocument: createDocument({ user, dataStream }),
    updateDocument: updateDocument({ user, dataStream }),
    requestSuggestions: requestSuggestions({ user, dataStream }),
    ...xeroTools, // Conditional inclusion
  },
  experimental_activeTools: finalActiveTools,
  // ...
});
```

**Performance Considerations**:
- Connection check happens on every chat request
- Consider caching connection status if performance becomes an issue
- Database query is fast (indexed on userId + isActive)

### UI Components

**XeroIntegrationCard** (`components/settings/xero-integration-card.tsx`):

**State Management**:
- `connection`: Current connection state (server-rendered initial value)
- `isConnecting`: Loading state during OAuth initiation
- `isDisconnecting`: Loading state during disconnection
- `error`: Error message display
- `successMessage`: Success message display

**OAuth Flow Handling**:
```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const xeroStatus = params.get("xero");
  const errorParam = params.get("error");

  if (xeroStatus === "connected") {
    setSuccessMessage("Successfully connected to Xero!");
    window.history.replaceState({}, "", window.location.pathname);
    window.location.reload(); // Refresh to get updated connection
  } else if (errorParam) {
    setError(`Connection failed: ${errorParam.replace(/_/g, " ")}`);
    window.history.replaceState({}, "", window.location.pathname);
  }
}, []);
```

**Client-Server Interaction**:
1. Server renders initial connection status
2. Client handles OAuth redirect
3. Client initiates connection/disconnection via API
4. Server re-renders on page reload

## Environment Configuration

**Required Variables**:

```bash
# OAuth Credentials (from Xero Developer Portal)
XERO_CLIENT_ID=your_client_id_here
XERO_CLIENT_SECRET=your_client_secret_here

# Redirect URI (must match Xero app configuration)
XERO_REDIRECT_URI=http://localhost:3000/api/xero/callback

# Token Encryption Key (32 bytes / 64 hex characters)
XERO_ENCRYPTION_KEY=your_64_character_hex_key_here
```

**Development vs Production**:

| Environment | Consideration |
|-------------|---------------|
| Development | Use Xero Demo Company for testing |
| Development | Localhost redirect URI is allowed |
| Production | HTTPS required for redirect URI |
| Production | Use secrets manager for keys |
| Production | Rotate encryption keys periodically |

## Testing Strategy

### Manual Testing Checklist

**Connection Flow**:
- [ ] Connect with valid Xero account
- [ ] Connect with multiple organisations (verify first org selected)
- [ ] Connect after previous disconnect
- [ ] Handle OAuth cancellation
- [ ] Handle OAuth errors

**Token Management**:
- [ ] Verify tokens are encrypted in database
- [ ] Test token refresh (manually expire token)
- [ ] Test with expired refresh token
- [ ] Verify token refresh happens automatically

**Tool Execution**:
- [ ] Test each tool individually
- [ ] Test with various filter combinations
- [ ] Test with invalid parameters
- [ ] Test with no data available
- [ ] Test rate limiting behavior

**Error Handling**:
- [ ] Network errors during OAuth
- [ ] API errors from Xero
- [ ] Invalid encryption key
- [ ] Missing environment variables
- [ ] Concurrent refresh attempts

### Automated Testing

**Unit Tests** (not yet implemented):
```typescript
describe("Xero Encryption", () => {
  it("should encrypt and decrypt tokens", () => {
    const token = "test_token_123";
    const encrypted = encryptToken(token);
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(token);
  });

  it("should use different IVs for each encryption", () => {
    const token = "test_token_123";
    const encrypted1 = encryptToken(token);
    const encrypted2 = encryptToken(token);
    expect(encrypted1).not.toBe(encrypted2);
  });
});

describe("Connection Manager", () => {
  it("should refresh expired tokens", async () => {
    // Mock expired connection
    // Verify refresh is called
  });

  it("should not refresh valid tokens", async () => {
    // Mock valid connection
    // Verify refresh is not called
  });
});
```

**Integration Tests** (not yet implemented):
- OAuth flow end-to-end
- Tool execution with real Xero data
- Token refresh cycle
- Error scenarios

### Testing with Xero Demo Company

Xero provides demo companies for testing:
1. Sign up for Xero Developer account
2. Create a demo organisation
3. Use demo company for integration testing
4. Data resets periodically

## Monitoring and Logging

### Current Logging

**Connection Events**:
```typescript
console.error("Xero connection error:", error);
console.error("Failed to refresh Xero token:", error);
console.error("Failed to get Xero tenants:", error);
```

**Tool Execution**:
```typescript
console.error(`Xero MCP tool error (${toolName}):`, error);
```

### Recommended Monitoring

**Metrics to Track**:
- Connection success/failure rate
- Token refresh frequency
- Tool execution latency
- API error rates by endpoint
- Rate limit violations

**Alerts to Configure**:
- High connection failure rate (> 5% in 5 minutes)
- Token refresh failures (any occurrence)
- API rate limit exceeded (any occurrence)
- Encryption/decryption errors (any occurrence)

**Implementation**:
```typescript
// Example with Sentry
import * as Sentry from "@sentry/nextjs";

try {
  await refreshXeroToken(connectionId);
  // Track success metric
} catch (error) {
  Sentry.captureException(error, {
    tags: { integration: "xero", operation: "token_refresh" },
    user: { id: userId },
  });
  throw error;
}
```

## Security Considerations

### Token Security

1. **Encryption at Rest**: All tokens encrypted with AES-256-GCM
2. **Encryption Key Management**: Store in environment, never in code
3. **No Token Logging**: Never log decrypted tokens
4. **Secure Transmission**: HTTPS only for redirect URIs
5. **Token Rotation**: Automatic refresh before expiry

### OAuth Security

1. **State Parameter**: CSRF protection via user ID verification
2. **Redirect URI Validation**: Xero validates against registered URIs
3. **Authorization Code**: Single-use, expires quickly
4. **PKCE**: Not implemented (consider for mobile apps)

### API Security

1. **User Isolation**: Connection query always filters by userId
2. **Cascade Delete**: Connections deleted when user deleted
3. **No Shared Connections**: Each user has independent connections
4. **Rate Limiting**: Not implemented (see opportunities)

### Data Privacy

1. **No Data Storage**: Xero data not stored in database
2. **Real-time Fetch**: Data retrieved only when requested
3. **No Background Sync**: No automatic data synchronization
4. **User Consent**: OAuth flow requires explicit user authorization

## Performance Optimization

### Current Optimizations

1. **Token Caching**: Decrypted connection cached during request lifecycle
2. **Conditional Tool Loading**: Tools only loaded when connection active
3. **Database Indexing**: Query optimization on userId + isActive
4. **Single Query**: One database query per chat request for connection

### Potential Optimizations

1. **Connection Status Cache**:
   ```typescript
   // Redis cache
   const cacheKey = `xero:connection:${userId}`;
   const cached = await redis.get(cacheKey);
   if (cached) return JSON.parse(cached);

   const connection = await getActiveXeroConnection(userId);
   await redis.setex(cacheKey, 300, JSON.stringify(connection)); // 5 min TTL
   ```

2. **Request Batching**: Group multiple Xero API calls
3. **Response Caching**: Cache frequently accessed data (chart of accounts)
4. **Pagination**: Implement for large datasets

## Deployment Checklist

### Pre-Deployment

- [ ] Set all environment variables in production
- [ ] Generate production encryption key
- [ ] Register production redirect URI in Xero app
- [ ] Review and test OAuth flow in staging
- [ ] Set up monitoring and alerts
- [ ] Document runbook for common issues

### Database Migration

```bash
# Generate migration
pnpm db:generate

# Review generated SQL
cat lib/db/migrations/[timestamp]_xero_connection.sql

# Test in development
pnpm db:migrate

# Apply in production (automated via build)
pnpm build
```

### Xero Developer Portal Setup

1. **Create OAuth App**:
   - Go to developer.xero.com
   - Create new app
   - Set app type to "Web app"
   - Add redirect URI (production URL)
   - Note client ID and secret

2. **Configure Scopes**:
   - offline_access
   - accounting.transactions
   - accounting.contacts
   - accounting.settings
   - accounting.reports.read
   - accounting.journals.read
   - accounting.attachments
   - payroll.* (if needed)

3. **Add Authorised Redirect URIs**:
   - Development: `http://localhost:3000/api/xero/callback`
   - Production: `https://yourdomain.com/api/xero/callback`

### Post-Deployment

- [ ] Test connection with production Xero account
- [ ] Verify token encryption/decryption works
- [ ] Test automatic token refresh
- [ ] Monitor for errors in first 24 hours
- [ ] Verify SSL certificate for redirect URI

## Troubleshooting Guide

### Common Issues

**Issue**: "Invalid client_id"
- **Cause**: Wrong XERO_CLIENT_ID in environment
- **Fix**: Verify client ID in Xero Developer Portal

**Issue**: "Redirect URI mismatch"
- **Cause**: XERO_REDIRECT_URI doesn't match registered URI
- **Fix**: Update Xero app configuration or environment variable

**Issue**: "Decryption failed"
- **Cause**: Wrong XERO_ENCRYPTION_KEY or key changed
- **Fix**: Verify encryption key matches key used for encryption

**Issue**: "Token expired" errors
- **Cause**: Refresh token expired (60 days)
- **Fix**: User must reconnect Xero

**Issue**: "Rate limit exceeded"
- **Cause**: Too many API calls to Xero
- **Fix**: Implement rate limiting and caching

### Debugging Tools

**Check Encrypted Tokens**:
```sql
SELECT
  id,
  "userId",
  "tenantName",
  "isActive",
  "expiresAt",
  LEFT("accessToken", 20) || '...' as token_preview
FROM "XeroConnection"
WHERE "userId" = 'user_id_here';
```

**Test Decryption**:
```typescript
// In Node.js REPL or test script
import { decryptToken } from './lib/xero/encryption';

const encryptedToken = '...'; // From database
const decrypted = decryptToken(encryptedToken);
console.log('Decrypted:', decrypted);
```

**Test Xero API**:
```typescript
import { createXeroClient } from './lib/xero/connection-manager';

const client = createXeroClient();
// Test with access token
await client.setAccessToken(accessToken);
const response = await client.accountingApi.getInvoices(tenantId);
```

## API Reference

### Database Queries

**getActiveXeroConnection(userId: string)**
- Returns active Xero connection for user
- Returns null if no active connection

**createXeroConnection(data)**
- Creates new connection
- Deactivates existing connections first
- Returns created connection

**updateXeroTokens({ id, accessToken, refreshToken, expiresAt })**
- Updates tokens for connection
- Returns updated connection

**deactivateXeroConnection(id: string)**
- Sets isActive to false
- Returns updated connection

**deleteXeroConnection(id: string)**
- Permanently deletes connection
- Cascades to delete all user connections on user delete

### Connection Manager Functions

**createXeroClient(): XeroClient**
- Creates Xero SDK client with environment credentials

**getDecryptedConnection(userId: string): Promise<DecryptedXeroConnection | null>**
- Gets active connection with decrypted tokens
- Auto-refreshes if expiring within 5 minutes

**getXeroTenants(accessToken: string): Promise<XeroTenant[]>**
- Fetches list of accessible organisations

**getXeroAuthUrl(state: string): string**
- Generates OAuth authorization URL

### MCP Tool Functions

**executeXeroMCPTool(userId: string, toolName: string, args: Record<string, unknown>): Promise<XeroMCPToolResult>**
- Executes Xero MCP tool
- Returns result with content array
- Handles errors gracefully

**isXeroMCPTool(toolName: string): boolean**
- Checks if tool name is a Xero tool

## Migration Guide

### From External MCP Server

If migrating from an external Xero MCP server:

1. **Update Tool Calls**:
   ```typescript
   // Old: External MCP server
   const result = await mcpClient.callTool("xero_list_invoices", args);

   // New: Built-in
   const result = await executeXeroMCPTool(userId, "xero_list_invoices", args);
   ```

2. **Update Connection Management**:
   - Remove MCP server process management
   - Use built-in connection manager
   - Update environment variables

3. **Update Tool Definitions**:
   - Import from `lib/ai/tools/xero-tools`
   - Use AI SDK tool format

### Adding New Xero Tools

To add new Xero API endpoints:

1. **Add MCP Tool Definition** (`lib/ai/xero-mcp-client.ts`):
   ```typescript
   {
     name: "xero_new_tool",
     description: "Description of new tool",
     inputSchema: {
       type: "object",
       properties: {
         // Define parameters
       },
     },
   }
   ```

2. **Implement Tool Execution**:
   ```typescript
   case "xero_new_tool": {
     const response = await client.newEndpoint(connection.tenantId, ...);
     return { content: [{ type: "text", text: JSON.stringify(response.body) }] };
   }
   ```

3. **Add AI SDK Wrapper** (`lib/ai/tools/xero-tools.ts`):
   ```typescript
   xero_new_tool: tool({
     description: "...",
     parameters: z.object({ ... }),
     execute: async (args) => {
       const result = await executeXeroMCPTool(userId, "xero_new_tool", args);
       return result.content[0].text;
     },
   })
   ```

4. **Update Tool Names Export**:
   ```typescript
   export const xeroToolNames = xeroMCPTools.map((tool) => tool.name);
   ```

## Dependencies

### Core Dependencies

- **xero-node** (v13.1.0): Official Xero Node.js SDK
- **@modelcontextprotocol/sdk** (v1.20.0): MCP protocol types
- **ai**: Vercel AI SDK for tool integration
- **zod**: Schema validation for tool parameters

### Node.js Built-ins

- **crypto**: For AES-256-GCM encryption
- **buffer**: For base64 encoding/decoding

## Contributing

### Code Style

Follow existing patterns:
- Use TypeScript strict mode
- Prefer `const` over `let`
- Use async/await over promises
- Handle errors explicitly
- Add JSDoc comments for public functions

### Pull Request Checklist

- [ ] Add tests for new functionality
- [ ] Update documentation (CLAUDE.md, this file)
- [ ] Run linter: `pnpm lint`
- [ ] Test OAuth flow manually
- [ ] Test token refresh
- [ ] Verify encryption/decryption
- [ ] Check for console.log statements (remove or use proper logging)

## Resources

### Official Documentation

- [Xero API Documentation](https://developer.xero.com/documentation/)
- [xero-node SDK](https://github.com/XeroAPI/xero-node)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

### Useful Links

- [Xero Developer Portal](https://developer.xero.com/)
- [Xero API Rate Limits](https://developer.xero.com/documentation/guides/oauth2/limits/)
- [Xero Scopes](https://developer.xero.com/documentation/guides/oauth2/scopes/)
- [AES-GCM Specification](https://csrc.nist.gov/publications/detail/sp/800-38d/final)

### Community Resources

- [Xero Developer Community](https://central.xero.com/s/)
- [Stack Overflow: xero-api](https://stackoverflow.com/questions/tagged/xero-api)
