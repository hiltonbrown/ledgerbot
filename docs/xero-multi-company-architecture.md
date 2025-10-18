# Xero Multi-Company Architecture Plan

## Executive Summary

This document outlines the architectural plan for implementing multi-company (multi-tenant) Xero API connections in LedgerBot. The implementation follows a **hybrid approach** that combines single active organisation simplicity with advanced multi-organisation capabilities.

**Key Features:**
- Users can connect multiple Xero organisations
- Default mode: Single active organisation with quick switching
- Advanced mode: Multi-organisation concurrent access for cross-company analysis
- Thread-safe operations with proper data isolation
- Backward compatible with existing single-tenant connections

---

## Current Architecture Analysis

### Current State (Single-Tenant)

**Database Schema:**
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
  isActive: boolean  // Only ONE active per user
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Current Limitations:**
1. ✗ Only one active organisation per user (`isActive` boolean)
2. ✗ No organisation selection UI
3. ✗ Tools always use the single active tenant
4. ✗ No cross-organisation queries
5. ✗ OAuth callback only handles first tenant from list
6. ✗ No tenant context in chat conversations

**Current Strengths:**
1. ✓ Token encryption at rest (AES-256-GCM)
2. ✓ Automatic token refresh
3. ✓ Clean separation of concerns
4. ✓ MCP-compatible tool interfaces
5. ✓ Proper error handling

---

## Proposed Multi-Company Architecture

### Phase 1: Foundation (Core Multi-Tenant Support)

#### 1.1 Database Schema Changes

**Update XeroConnection Table:**
```typescript
xeroConnection {
  id: uuid (PK)
  userId: uuid (FK -> User)
  tenantId: varchar(255)
  tenantName: varchar(255)
  tenantType: varchar(50)  // NEW: ORGANISATION, PRACTICEMANAGER, PRACTICE
  accessToken: text (encrypted)
  refreshToken: text (encrypted)
  expiresAt: timestamp
  scopes: jsonb
  isActive: boolean  // CHANGED: Multiple can be active
  isPrimary: boolean  // NEW: Default/primary organisation
  displayOrder: integer  // NEW: User-defined sort order
  connectionId: varchar(255)  // NEW: Xero's connection ID
  authEventId: varchar(255)  // NEW: Track auth events
  createdDateUtc: timestamp  // NEW: From Xero API
  updatedDateUtc: timestamp  // NEW: From Xero API
  createdAt: timestamp
  updatedAt: timestamp
}

// Add indexes
CREATE INDEX idx_xero_user_active ON xeroConnection(userId, isActive);
CREATE INDEX idx_xero_user_primary ON xeroConnection(userId, isPrimary);
CREATE UNIQUE INDEX idx_xero_connection_id ON xeroConnection(connectionId);
```

**New UserSettings Fields:**
```typescript
userSettings {
  // ... existing fields
  xeroMultiOrgMode: boolean  // NEW: Enable multi-org mode
  xeroDefaultTenantId: varchar(255)  // NEW: Default tenant for queries
}
```

**New ChatContext Table (Optional - for conversation-level tenant context):**
```typescript
chatXeroContext {
  id: uuid (PK)
  chatId: uuid (FK -> Chat)
  activeTenantIds: jsonb  // Array of active tenant IDs for this chat
  multiOrgEnabled: boolean  // Multi-org mode for this chat
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 1.2 Connection Manager Updates

**File: `lib/xero/connection-manager.ts`**

```typescript
// NEW: Get all active connections for a user
export async function getActiveXeroConnections(
  userId: string
): Promise<XeroConnection[]> {
  return await db
    .select()
    .from(xeroConnection)
    .where(
      and(
        eq(xeroConnection.userId, userId),
        eq(xeroConnection.isActive, true)
      )
    )
    .orderBy(
      desc(xeroConnection.isPrimary),
      asc(xeroConnection.displayOrder),
      desc(xeroConnection.updatedAt)
    );
}

// NEW: Get primary connection
export async function getPrimaryXeroConnection(
  userId: string
): Promise<XeroConnection | null> {
  const [connection] = await db
    .select()
    .from(xeroConnection)
    .where(
      and(
        eq(xeroConnection.userId, userId),
        eq(xeroConnection.isActive, true),
        eq(xeroConnection.isPrimary, true)
      )
    )
    .limit(1);
  
  return connection ?? null;
}

// NEW: Get connection by tenant ID
export async function getXeroConnectionByTenantId(
  userId: string,
  tenantId: string
): Promise<XeroConnection | null> {
  const [connection] = await db
    .select()
    .from(xeroConnection)
    .where(
      and(
        eq(xeroConnection.userId, userId),
        eq(xeroConnection.tenantId, tenantId),
        eq(xeroConnection.isActive, true)
      )
    )
    .limit(1);
  
  return connection ?? null;
}

// NEW: Set primary connection
export async function setPrimaryXeroConnection(
  userId: string,
  tenantId: string
): Promise<void> {
  // Remove primary flag from all user's connections
  await db
    .update(xeroConnection)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(eq(xeroConnection.userId, userId));
  
  // Set new primary
  await db
    .update(xeroConnection)
    .set({ isPrimary: true, updatedAt: new Date() })
    .where(
      and(
        eq(xeroConnection.userId, userId),
        eq(xeroConnection.tenantId, tenantId)
      )
    );
}

// UPDATED: Get decrypted connection with tenant ID parameter
export async function getDecryptedConnection(
  userId: string,
  tenantId?: string  // NEW: Optional tenant ID
): Promise<DecryptedXeroConnection | null> {
  let connection: XeroConnection | null;
  
  if (tenantId) {
    // Get specific tenant
    connection = await getXeroConnectionByTenantId(userId, tenantId);
  } else {
    // Get primary tenant (backward compatible)
    connection = await getPrimaryXeroConnection(userId);
  }
  
  if (!connection) {
    return null;
  }
  
  // Check if token needs refresh (existing logic)
  const expiresAt = new Date(connection.expiresAt);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  
  if (expiresAt <= fiveMinutesFromNow) {
    try {
      const refreshedConnection = await refreshXeroToken(connection.id);
      if (refreshedConnection) {
        return {
          ...refreshedConnection,
          accessToken: decryptToken(refreshedConnection.accessToken),
          refreshToken: decryptToken(refreshedConnection.refreshToken),
        };
      }
    } catch (error) {
      console.error("Failed to refresh Xero token:", error);
      return null;
    }
  }
  
  return {
    ...connection,
    accessToken: decryptToken(connection.accessToken),
    refreshToken: decryptToken(connection.refreshToken),
  };
}

// NEW: Get all decrypted connections
export async function getAllDecryptedConnections(
  userId: string
): Promise<DecryptedXeroConnection[]> {
  const connections = await getActiveXeroConnections(userId);
  
  const decryptedConnections = await Promise.all(
    connections.map(async (conn) => {
      // Check and refresh if needed
      const expiresAt = new Date(conn.expiresAt);
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
      
      let connection = conn;
      if (expiresAt <= fiveMinutesFromNow) {
        try {
          const refreshed = await refreshXeroToken(conn.id);
          if (refreshed) connection = refreshed;
        } catch (error) {
          console.error(`Failed to refresh token for ${conn.tenantId}:`, error);
        }
      }
      
      return {
        ...connection,
        accessToken: decryptToken(connection.accessToken),
        refreshToken: decryptToken(connection.refreshToken),
      };
    })
  );
  
  return decryptedConnections;
}

// NEW: Sync connections from Xero API
export async function syncXeroConnections(
  userId: string,
  accessToken: string
): Promise<void> {
  const xeroClient = createXeroClient();
  await xeroClient.setTokenSet({
    access_token: accessToken,
    refresh_token: "",
    token_type: "Bearer",
  });
  
  // Get connections from Xero
  const connections = await xeroClient.connections.getConnections();
  
  // Get existing connections from DB
  const existingConnections = await db
    .select()
    .from(xeroConnection)
    .where(eq(xeroConnection.userId, userId));
  
  const existingTenantIds = new Set(
    existingConnections.map(c => c.tenantId)
  );
  
  // Mark connections that no longer exist in Xero as inactive
  const xeroTenantIds = new Set(connections.map(c => c.tenantId));
  for (const existing of existingConnections) {
    if (!xeroTenantIds.has(existing.tenantId)) {
      await db
        .update(xeroConnection)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(xeroConnection.id, existing.id));
    }
  }
}
```

#### 1.3 OAuth Callback Flow Updates

**File: `app/api/xero/callback/route.ts`**

```typescript
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.redirect(
        new URL("/login?error=unauthorized", request.url)
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("Xero OAuth error:", error);
      return NextResponse.redirect(
        new URL(
          `/settings/integrations?error=${encodeURIComponent(error)}`,
          request.url
        )
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=missing_parameters", request.url)
      );
    }

    // Verify state
    try {
      const stateData = JSON.parse(
        Buffer.from(state, "base64").toString("utf-8")
      );
      if (stateData.userId !== user.id) {
        return NextResponse.redirect(
          new URL("/settings/integrations?error=invalid_state", request.url)
        );
      }
    } catch {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=invalid_state", request.url)
      );
    }

    // Exchange code for tokens
    const xeroClient = createXeroClient(state);
    const tokenSet = await xeroClient.apiCallback(request.url);

    if (
      !tokenSet.access_token ||
      !tokenSet.refresh_token ||
      !tokenSet.expires_in
    ) {
      throw new Error("Invalid token set received from Xero");
    }

    // Get ALL tenants (not just first one)
    const tenants = await getXeroTenants(tokenSet.access_token);

    if (tenants.length === 0) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=no_organizations", request.url)
      );
    }

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + tokenSet.expires_in * 1000);

    // Get existing connections to determine if this is first connection
    const existingConnections = await getActiveXeroConnections(user.id);
    const isFirstConnection = existingConnections.length === 0;

    // Store ALL tenants (CHANGED from storing only first)
    for (let i = 0; i < tenants.length; i++) {
      const tenant = tenants[i];
      
      // Check if connection already exists
      const existing = await getXeroConnectionByTenantId(
        user.id,
        tenant.tenantId
      );

      if (existing) {
        // Update existing connection
        await updateXeroTokens({
          id: existing.id,
          accessToken: encryptToken(tokenSet.access_token),
          refreshToken: encryptToken(tokenSet.refresh_token),
          expiresAt,
        });
      } else {
        // Create new connection
        await createXeroConnection({
          userId: user.id,
          tenantId: tenant.tenantId,
          tenantName: tenant.tenantName,
          tenantType: tenant.tenantType || "ORGANISATION",
          accessToken: encryptToken(tokenSet.access_token),
          refreshToken: encryptToken(tokenSet.refresh_token),
          expiresAt,
          scopes: getXeroScopes(),
          isPrimary: isFirstConnection && i === 0, // First tenant of first connection is primary
          displayOrder: i,
        });
      }
    }

    // Redirect to settings page with success
    const successUrl = new URL("/settings/integrations", request.url);
    successUrl.searchParams.set("xero", "connected");
    successUrl.searchParams.set("count", tenants.length.toString());
    
    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error("Xero callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=${encodeURIComponent("connection_failed")}`,
        request.url
      )
    );
  }
}
```

#### 1.4 Tool Execution Layer Updates

**File: `lib/ai/xero-mcp-client.ts`**

```typescript
/**
 * Get an authenticated Xero client for a user
 * UPDATED: Support tenant ID parameter
 */
async function getXeroClient(
  userId: string,
  tenantId?: string  // NEW: Optional tenant ID
): Promise<{ client: XeroClient; connection: DecryptedXeroConnection }> {
  const connection = await getDecryptedConnection(userId, tenantId);

  if (!connection) {
    throw new Error(
      tenantId
        ? `No active Xero connection found for tenant ${tenantId}`
        : "No active Xero connection found. Please connect to Xero first."
    );
  }

  const client = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID || "",
    clientSecret: process.env.XERO_CLIENT_SECRET || "",
    redirectUris: [process.env.XERO_REDIRECT_URI || ""],
    scopes: connection.scopes,
  });

  await client.setTokenSet({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    token_type: "Bearer",
    expires_in: Math.floor(
      (new Date(connection.expiresAt).getTime() - Date.now()) / 1000
    ),
  });

  return { client, connection };
}

/**
 * Execute a Xero MCP tool
 * UPDATED: Support tenant ID in args
 */
export async function executeXeroMCPTool(
  userId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<XeroMCPToolResult> {
  try {
    // Extract tenant ID from args if provided
    const tenantId = args.tenantId as string | undefined;
    
    // Remove tenantId from args before passing to Xero API
    const { tenantId: _, ...apiArgs } = args;
    
    const { client, connection } = await getXeroClient(userId, tenantId);

    // All switch cases remain the same, just use connection.tenantId
    // which now comes from the specified tenant or primary tenant
    
    switch (toolName) {
      case "xero_list_invoices": {
        // ... existing implementation
        const response = await client.accountingApi.getInvoices(
          connection.tenantId,  // Uses correct tenant
          // ... rest of parameters
        );
        // ... rest of implementation
      }
      // ... other cases remain the same
    }
  } catch (error) {
    console.error(`Xero MCP tool error (${toolName}):`, error);
    return {
      content: [
        {
          type: "text",
          text: `Error executing Xero tool: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * NEW: Execute tool across multiple tenants
 */
export async function executeXeroMCPToolMultiTenant(
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
  tenantIds?: string[]  // If not provided, use all active tenants
): Promise<Record<string, XeroMCPToolResult>> {
  const connections = tenantIds
    ? await Promise.all(
        tenantIds.map(id => getDecryptedConnection(userId, id))
      ).then(conns => conns.filter(c => c !== null) as DecryptedXeroConnection[])
    : await getAllDecryptedConnections(userId);

  const results: Record<string, XeroMCPToolResult> = {};

  // Execute tool for each tenant in parallel
  await Promise.all(
    connections.map(async (connection) => {
      try {
        const result = await executeXeroMCPTool(
          userId,
          toolName,
          { ...args, tenantId: connection.tenantId }
        );
        results[connection.tenantId] = result;
      } catch (error) {
        results[connection.tenantId] = {
          content: [
            {
              type: "text",
              text: `Error for ${connection.tenantName}: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    })
  );

  return results;
}
```

#### 1.5 AI Tools Layer Updates

**File: `lib/ai/tools/xero-tools.ts`**

```typescript
/**
 * Create Xero tools for a specific user
 * UPDATED: Support tenant context
 */
export function createXeroTools(userId: string, multiOrgMode = false) {
  // Add tenantId parameter to all tool schemas
  const baseTenantSchema = {
    tenantId: z
      .string()
      .optional()
      .describe(
        "Xero organisation ID. If not provided, uses primary organisation. Required in multi-org mode for specific queries."
      ),
  };

  return {
    xero_list_invoices: tool({
      description:
        "Get a list of invoices from Xero. Supports filtering by status, date range, and contact. Use this to find invoices for accounting queries.",
      inputSchema: z.object({
        ...baseTenantSchema,
        status: z
          .enum(["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"])
          .optional()
          .describe("Invoice status filter"),
        dateFrom: z
          .string()
          .optional()
          .describe(
            "Filter invoices from this date (ISO 8601 format, e.g., 2024-01-01)"
          ),
        dateTo: z
          .string()
          .optional()
          .describe(
            "Filter invoices to this date (ISO 8601 format, e.g., 2024-12-31)"
          ),
        contactId: z.string().optional().describe("Filter by contact ID"),
        limit: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum number of invoices to return"),
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

    // NEW: Multi-org comparison tool
    ...(multiOrgMode
      ? {
          xero_compare_organisations: tool({
            description:
              "Compare data across multiple Xero organisations. Use this for cross-company analysis and reporting.",
            inputSchema: z.object({
              metric: z
                .enum([
                  "revenue",
                  "expenses",
                  "profit",
                  "invoices",
                  "contacts",
                ])
                .describe("Metric to compare across organisations"),
              dateFrom: z
                .string()
                .optional()
                .describe("Start date for comparison (ISO 8601 format)"),
              dateTo: z
                .string()
                .optional()
                .describe("End date for comparison (ISO 8601 format)"),
              tenantIds: z
                .array(z.string())
                .optional()
                .describe(
                  "Specific organisation IDs to compare. If not provided, compares all connected organisations."
                ),
            }),
            execute: async (args) => {
              // Implementation for cross-org comparison
              const { metric, dateFrom, dateTo, tenantIds } = args;
              
              // Get data from all specified tenants
              const results = await executeXeroMCPToolMultiTenant(
                userId,
                "xero_list_invoices", // or other relevant tool based on metric
                { dateFrom, dateTo },
                tenantIds
              );
              
              // Aggregate and format results
              const comparison = Object.entries(results).map(
                ([tenantId, result]) => ({
                  tenantId,
                  data: result.content[0].text,
                })
              );
              
              return JSON.stringify(comparison, null, 2);
            },
          }),

          xero_list_organisations: tool({
            description:
              "List all connected Xero organisations. Use this to see which organisations are available for queries.",
            inputSchema: z.object({}),
            execute: async () => {
              const connections = await getAllDecryptedConnections(userId);
              const orgs = connections.map((conn) => ({
                tenantId: conn.tenantId,
                tenantName: conn.tenantName,
                tenantType: conn.tenantType,
                isPrimary: conn.isPrimary,
              }));
              return JSON.stringify(orgs, null, 2);
            },
          }),
        }
      : {}),

    // ... rest of existing tools with tenantId parameter added
  };
}
```

---

### Phase 2: User Interface & Experience

#### 2.1 Organisation Selector Component

**File: `components/xero/organisation-selector.tsx`**

```typescript
"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Check } from "lucide-react";

interface XeroOrganisation {
  tenantId: string;
  tenantName: string;
  isPrimary: boolean;
  tenantType: string;
}

interface OrganisationSelectorProps {
  organisations: XeroOrganisation[];
  selectedTenantId?: string;
  onSelect: (tenantId: string) => void;
  className?: string;
}

export function OrganisationSelector({
  organisations,
  selectedTenantId,
  onSelect,
  className,
}: OrganisationSelectorProps) {
  const [selected, setSelected] = useState(
    selectedTenantId || organisations.find((o) => o.isPrimary)?.tenantId || ""
  );

  useEffect(() => {
    if (selectedTenantId) {
      setSelected(selectedTenantId);
    }
  }, [selectedTenantId]);

  const handleSelect = (tenantId: string) => {
    setSelected(tenantId);
    onSelect(tenantId);
  };

  if (organisations.length === 0) {
    return null;
  }

  if (organisations.length === 1) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>{organisations[0].tenantName}</span>
      </div>
    );
  }

  return (
    <Select value={selected} onValueChange={handleSelect}>
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <SelectValue placeholder="Select organisation" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {organisations.map((org) => (
          <SelectItem key={org.tenantId} value={org.tenantId}>
            <div className="flex items-center justify-between gap-2 w-full">
              <span>{org.tenantName}</span>
              {org.isPrimary && (
                <Badge variant="secondary" className="text-xs">
                  Primary
                </Badge>
              )}
              {selected === org.tenantId && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

#### 2.2 Multi-Org Settings Panel

**File: `components/settings/xero-multi-org-settings.tsx`**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Star, Trash2 } from "lucide-react";

interface XeroConnection {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantType: string;
  isPrimary: boolean;
  isActive: boolean;
  expiresAt: Date;
  displayOrder: number;
}

interface XeroMultiOrgSettingsProps {
  connections: XeroConnection[];
  multiOrgMode: boolean;
  onToggleMultiOrg: (enabled: boolean) => Promise<void>;
  onSetPrimary: (tenantId: string) => Promise<void>;
  onDisconnect: (connectionId: string) => Promise<void>;
}

export function XeroMultiOrgSettings({
  connections,
  multiOrgMode,
  onToggleMultiOrg,
  onSetPrimary,
  onDisconnect,
}: XeroMultiOrgSettingsProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleMultiOrg = async (enabled: boolean) => {
    setIsUpdating(true);
    try {
      await onToggleMultiOrg(enabled);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetPrimary = async (tenantId: string) => {
    setIsUpdating(true);
    try {
      await onSetPrimary(tenantId);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (
      !confirm(
        "Are you sure you want to disconnect this organisation? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsUpdating(true);
    try {
      await onDisconnect(connectionId);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Multi-Org Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Multi-Organisation Mode</CardTitle>
          <CardDescription>
            Enable advanced features for working with multiple Xero organisations
            simultaneously
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="multi-org-mode">Enable Multi-Org Mode</Label>
              <p className="text-sm text-muted-foreground">
                Access data from multiple organisations in a single conversation
              </p>
            </div>
            <Switch
              id="multi-org-mode"
              checked={multiOrgMode}
              onCheckedChange={handleToggleMultiOrg}
              disabled={isUpdating || connections.length < 2}
            />
          </div>
          {connections.length < 2 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Connect at least 2 organisations to enable multi-org mode
            </p>
          )}
        </CardContent>
      </Card>

      {/* Connected Organisations */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Organisations</CardTitle>
          <CardDescription>
            Manage your connected Xero organisations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{connection.tenantName}</p>
                      {connection.isPrimary && (
                        <Badge variant="default" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {connection.tenantType} • Expires{" "}
                      {new Date(connection.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!connection.isPrimary && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimary(connection.tenantId)}
                      disabled={isUpdating}
                    >
                      Set as Primary
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDisconnect(connection.id)}
                    disabled={isUpdating || connections.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 2.3 Chat Header Organisation Selector

**File: `components/chat-header.tsx` (Update)**

```typescript
// Add organisation selector to chat header
import { OrganisationSelector } from "@/components/xero/organisation-selector";

export function ChatHeader({ /* ... */ }) {
  const [xeroOrganisations, setXeroOrganisations] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>();

  // Fetch organisations on mount
  useEffect(() => {
    async function fetchOrganisations() {
      const response = await fetch("/api/xero/organisations");
      if (response.ok) {
        const data = await response.json();
        setXeroOrganisations(data.organisations);
        setSelectedTenantId(data.primary?.tenantId);
      }
    }
    fetchOrganisations();
  }, []);

  const handleOrganisationSelect = async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    // Store in chat context or session
    await fetch("/api/xero/set-active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, chatId }),
    });
  };

  return (
    <header className="flex items-center justify-between">
      {/* ... existing header content */}
      
      {xeroOrganisations.length > 0 && (
        <OrganisationSelector
          organisations={xeroOrganisations}
          selectedTenantId={selectedTenantId}
          onSelect={handleOrganisationSelect}
          className="w-[250px]"
        />
      )}
    </header>
  );
}
```

---

### Phase 3: API Routes & Backend

#### 3.1 New API Routes

**File: `app/api/xero/organisations/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getActiveXeroConnections, getPrimaryXeroConnection } from "@/lib/db/queries";

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connections = await getActiveXeroConnections(user.id);
    const primary = await getPrimaryXeroConnection(user.id);

    const organisations = connections.map((conn) => ({
      tenantId: conn.tenantId,
      tenantName: conn.tenantName,
      tenantType: conn.tenantType,
      isPrimary: conn.isPrimary,
      expiresAt: conn.expiresAt,
    }));

    return NextResponse.json({
      organisations,
      primary: primary
        ? {
            tenantId: primary.tenantId,
            tenantName: primary.tenantName,
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to fetch Xero organisations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organisations" },
      { status: 500 }
    );
  }
}
```

**File: `app/api/xero/set-primary/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { setPrimaryXeroConnection } from "@/lib/xero/connection-manager";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenantId } = await request.json();

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    await setPrimaryXeroConnection(user.id, tenantId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to set primary organisation:", error);
    return NextResponse.json(
      { error: "Failed to set primary organisation" },
      { status: 500 }
    );
  }
}
```

**File: `app/api/xero/sync/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { syncXeroConnections, getDecryptedConnection } from "@/lib/xero/connection-manager";

export async function POST() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get any active connection to get access token
    const connection = await getDecryptedConnection(user.id);

    if (!connection) {
      return NextResponse.json(
        { error: "No active Xero connection" },
        { status: 404 }
      );
    }

    await syncXeroConnections(user.id, connection.accessToken);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to sync Xero connections:", error);
    return NextResponse.json(
      { error: "Failed to sync connections" },
      { status: 500 }
    );
  }
}
```

---

### Phase 4: Thread Safety & Concurrency

#### 4.1 Connection Pool Manager

**File: `lib/xero/connection-pool.ts`**

```typescript
import "server-only";

import { LRUCache } from "lru-cache";
import type { DecryptedXeroConnection } from "./types";
import { getDecryptedConnection } from "./connection-manager";

/**
 * Connection pool to prevent concurrent token refresh issues
 * Uses LRU cache with TTL to manage connections
 */

interface ConnectionCacheEntry {
  connection: DecryptedXeroConnection;
  refreshPromise?: Promise<DecryptedXeroConnection | null>;
}

const connectionCache = new LRUCache<string, ConnectionCacheEntry>({
  max: 100, // Maximum 100 cached connections
  ttl: 1000 * 60 * 5, // 5 minutes TTL
  updateAgeOnGet: true,
});

/**
 * Get connection with thread-safe token refresh
 */
export async function getConnectionSafe(
  userId: string,
  tenantId?: string
): Promise<DecryptedXeroConnection | null> {
  const cacheKey = `${userId}:${tenantId || "primary"}`;
  
  // Check cache first
  const cached = connectionCache.get(cacheKey);
  
  if (cached) {
    // If refresh is in progress, wait for it
    if (cached.refreshPromise) {
      const refreshed = await cached.refreshPromise;
      return refreshed;
    }
    
    // Check if token is still valid
    const expiresAt = new Date(cached.connection.expiresAt);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    if (expiresAt > fiveMinutesFromNow) {
      return cached.connection;
    }
  }
  
  // Need to fetch/refresh - create promise to prevent concurrent refreshes
  const refreshPromise = getDecryptedConnection(userId, tenantId);
  
  // Store promise in cache
  connectionCache.set(cacheKey, {
    connection: cached?.connection as DecryptedXeroConnection,
    refreshPromise,
  });
  
  try {
    const connection = await refreshPromise;
    
    if (connection) {
      // Update cache with new connection
      connectionCache.set(cacheKey, { connection });
    }
    
    return connection;
  } catch (error) {
    // Remove failed promise from cache
    connectionCache.delete(cacheKey);
    throw error;
  }
}

/**
 * Invalidate cached connection
 */
export function invalidateConnection(userId: string, tenantId?: string): void {
  const cacheKey = `${userId}:${tenantId || "primary"}`;
  connectionCache.delete(cacheKey);
}

/**
 * Clear all cached connections for a user
 */
export function clearUserConnections(userId: string): void {
  const keys = Array.from(connectionCache.keys());
  keys.forEach((key) => {
    if (key.startsWith(`${userId}:`)) {
      connectionCache.delete(key);
    }
  });
}
```

#### 4.2 Request Context Manager

**File: `lib/xero/request-context.ts`**

```typescript
import "server-only";

import { AsyncLocalStorage } from "async_hooks";

/**
 * Request context for tenant isolation
 * Prevents cross-tenant data leakage in concurrent requests
 */

interface XeroRequestContext {
  userId: string;
  tenantId?: string;
  requestId: string;
  timestamp: number;
}

const requestContext = new AsyncLocalStorage<XeroRequestContext>();

/**
 * Run function with Xero request context
 */
export function withXeroContext<T>(
  context: Omit<XeroRequestContext, "timestamp">,
  fn: () => T
): T {
  return requestContext.run(
    {
      ...context,
      timestamp: Date.now(),
    },
    fn
  );
}

/**
 * Get current request context
 */
export function getXeroContext(): XeroRequestContext | undefined {
  return requestContext.getStore();
}

/**
 * Validate tenant access in current context
 */
export function validateTenantAccess(tenantId: string): void {
  const context = getXeroContext();
  
  if (!context) {
    throw new Error("No Xero request context available");
  }
  
  if (context.tenantId && context.tenantId !== tenantId) {
    throw new Error(
      `Tenant mismatch: expected ${context.tenantId}, got ${tenantId}`
    );
  }
}
```

---

### Phase 5: Migration Strategy

#### 5.1 Database Migration

**File: `lib/db/migrations/YYYYMMDD_add_multi_tenant_support.sql`**

```sql
-- Add new columns to XeroConnection table
ALTER TABLE "XeroConnection"
ADD COLUMN "tenantType" VARCHAR(50),
ADD COLUMN "isPrimary" BOOLEAN DEFAULT false,
ADD COLUMN "displayOrder" INTEGER DEFAULT 0,
ADD COLUMN "connectionId" VARCHAR(255),
ADD COLUMN "authEventId" VARCHAR(255),
ADD COLUMN "createdDateUtc" TIMESTAMP,
ADD COLUMN "updatedDateUtc" TIMESTAMP;

-- Set existing connections as primary
UPDATE "XeroConnection"
SET "isPrimary" = true
WHERE "isActive" = true;

-- Create indexes
CREATE INDEX idx_xero_user_active ON "XeroConnection"("userId", "isActive");
CREATE INDEX idx_xero_user_primary ON "XeroConnection"("userId", "isPrimary");
CREATE UNIQUE INDEX idx_xero_connection_id ON "XeroConnection"("connectionId")
WHERE "connectionId" IS NOT NULL;

-- Add new columns to UserSettings table
ALTER TABLE "UserSettings"
ADD COLUMN "xeroMultiOrgMode" BOOLEAN DEFAULT false,
ADD COLUMN "xeroDefaultTenantId" VARCHAR(255);

-- Create ChatXeroContext table (optional)
CREATE TABLE "ChatXeroContext" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "chatId" UUID NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
  "activeTenantIds" JSONB,
  "multiOrgEnabled" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_xero_context ON "ChatXeroContext"("chatId");
```

#### 5.2 Data Migration Script

**File: `scripts/migrate-xero-connections.ts`**

```typescript
import { db } from "@/lib/db/queries";
import { xeroConnection } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Migrate existing single-tenant connections to multi-tenant structure
 */
async function migrateXeroConnections() {
  console.log("Starting Xero connection migration...");

  // Get all existing connections
  const connections = await db.select().from(xeroConnection);

  console.log(`Found ${connections.length} connections to migrate`);

  for (const connection of connections) {
    try {
      // Set as primary if active
      const updates: any = {
        isPrimary: connection.isActive,
        displayOrder: 0,
        tenantType: "ORGANISATION", // Default type
      };

      await db
        .update(xeroConnection)
        .set(updates)
        .where(eq(xeroConnection.id, connection.id));

      console.log(`Migrated connection ${connection.id}`);
    } catch (error) {
      console.error(`Failed to migrate connection ${connection.id}:`, error);
    }
  }

  console.log("Migration complete!");
}

// Run migration
migrateXeroConnections()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
```

---

### Phase 6: Testing Strategy

#### 6.1 Unit Tests

**File: `__tests__/xero/connection-manager.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getActiveXeroConnections,
  getPrimaryXeroConnection,
  setPrimaryXeroConnection,
} from "@/lib/xero/connection-manager";

describe("Xero Connection Manager - Multi-Tenant", () => {
  const testUserId = "test-user-123";

  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup test data
  });

  it("should return all active connections for a user", async () => {
    const connections = await getActiveXeroConnections(testUserId);
    expect(connections).toHaveLength(2);
  });

  it("should return primary connection", async () => {
    const primary = await getPrimaryXeroConnection(testUserId);
    expect(primary).toBeDefined();
    expect(primary?.isPrimary).toBe(true);
  });

  it("should set new primary connection", async () => {
    const connections = await getActiveXeroConnections(testUserId);
    const newPrimary = connections.find((c) => !c.isPrimary);

    await setPrimaryXeroConnection(testUserId, newPrimary!.tenantId);

    const updated = await getPrimaryXeroConnection(testUserId);
    expect(updated?.tenantId).toBe(newPrimary!.tenantId);
  });

  it("should handle concurrent token refresh safely", async () => {
    // Test concurrent access doesn't cause duplicate refreshes
    const promises = Array(10)
      .fill(null)
      .map(() => getDecryptedConnection(testUserId));

    const results = await Promise.all(promises);
    expect(results.every((r) => r !== null)).toBe(true);
  });
});
```

#### 6.2 Integration Tests

**File: `__tests__/xero/multi-org-flow.test.ts`**

```typescript
import { describe, it, expect } from "vitest";

describe("Multi-Org OAuth Flow", () => {
  it("should connect multiple organisations in one flow", async () => {
    // Test OAuth callback with multiple tenants
  });

  it("should sync connections from Xero API", async () => {
    // Test connection sync
  });

  it("should handle organisation disconnection", async () => {
    // Test disconnect flow
  });
});

describe("Multi-Org Tool Execution", () => {
  it("should execute tool on specific tenant", async () => {
    // Test tenant-specific tool execution
  });

  it("should execute tool across multiple tenants", async () => {
    // Test multi-tenant tool execution
  });

  it("should prevent cross-tenant data leakage", async () => {
    // Test data isolation
  });
});
```

---

## Security Considerations

### 1. Data Isolation

**Principle:** Each tenant's data must be completely isolated from other tenants.

**Implementation:**
- Always validate `userId` and `tenantId` in database queries
- Use request context to track active tenant
- Never cache decrypted tokens across requests
- Validate tenant access before every API call

**Example:**
```typescript
// GOOD: Explicit tenant validation
const connection = await getXeroConnectionByTenantId(userId, tenantId);
if (!connection) {
  throw new Error("Unauthorized access to tenant");
}

// BAD: No validation
const connection = await db.select().from(xeroConnection)
  .where(eq(xeroConnection.tenantId, tenantId));
```

### 2. Token Management

**Principle:** Tokens must never be exposed or mixed between tenants.

**Implementation:**
- Encrypt all tokens at rest
- Use connection pool to prevent concurrent refresh issues
- Clear token cache on disconnect
- Rotate encryption keys periodically

### 3. Thread Safety

**Principle:** Concurrent requests must not interfere with each other.

**Implementation:**
- Use AsyncLocalStorage for request context
- Implement connection pooling with mutex
- Validate tenant context before operations
- Use database transactions for multi-step operations

### 4. Rate Limiting

**Principle:** Respect Xero's rate limits per organisation.

**Implementation:**
```typescript
// File: lib/xero/rate-limiter.ts
import { RateLimiter } from "limiter";

const rateLimiters = new Map<string, RateLimiter>();

export function getRateLimiter(tenantId: string): RateLimiter {
  if (!rateLimiters.has(tenantId)) {
    // Xero: 60 calls per minute per organisation
    rateLimiters.set(
      tenantId,
      new RateLimiter({ tokensPerInterval: 60, interval: "minute" })
    );
  }
  return rateLimiters.get(tenantId)!;
}

export async function withRateLimit<T>(
  tenantId: string,
  fn: () => Promise<T>
): Promise<T> {
  const limiter = getRateLimiter(tenantId);
  await limiter.removeTokens(1);
  return fn();
}
```

---

## Performance Optimization

### 1. Connection Caching

- Cache decrypted connections for 5 minutes
- Invalidate cache on token refresh
- Use LRU cache to limit memory usage

### 2. Parallel Execution

- Execute multi-tenant queries in parallel
- Use Promise.all for concurrent API calls
- Implement timeout for slow tenants

### 3. Query Optimization

- Add database indexes for common queries
- Use connection pooling
- Batch similar operations

---

## Rollout Plan

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema changes
- [ ] Connection manager updates
- [ ] OAuth callback modifications
- [ ] Basic multi-tenant support

### Phase 2: UI/UX (Week 3)
- [ ] Organisation selector component
- [ ] Settings page updates
- [ ] Chat header integration
- [ ] Multi-org mode toggle

### Phase 3: Advanced Features (Week 4)
- [ ] Multi-tenant tool execution
- [ ] Cross-organisation comparison
- [ ] Thread safety implementation
- [ ] Rate limiting

### Phase 4: Testing & Polish (Week 5)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance testing
- [ ] Documentation

### Phase 5: Migration & Deployment (Week 6)
- [ ] Data migration script
- [ ] Backward compatibility testing
- [ ] Staged rollout
- [ ] Monitoring setup

---

## Monitoring & Observability

### Key Metrics

1. **Connection Health**
   - Active connections per user
   - Token refresh success rate
   - Connection errors by tenant

2. **Performance**
   - API call latency by tenant
   - Token refresh duration
   - Cache hit rate

3. **Usage**
   - Multi-org mode adoption
   - Cross-tenant queries
   - Organisation switching frequency

### Alerts

- Token refresh failures
- Rate limit violations
- Cross-tenant data access attempts
- Concurrent refresh conflicts

---

## Documentation Updates

### User Documentation

1. **Getting Started with Multi-Org**
   - How to connect multiple organisations
   - Switching between organisations
   - Enabling multi-org mode

2. **Advanced Features**
   - Cross-organisation queries
   - Organisation comparison
   - Best practices

### Developer Documentation

1. **API Reference**
   - New endpoints
   - Updated tool schemas
   - Multi-tenant patterns

2. **Architecture Guide**
   - Connection management
   - Thread safety
   - Security considerations

---

## Success Criteria

### Functional Requirements
- ✓ Users can connect multiple Xero organisations
- ✓ Users can switch between organisations
- ✓ Tools work with specific tenant context
- ✓ Multi-org mode enables cross-organisation queries
- ✓ Backward compatible with single-tenant setup

### Non-Functional Requirements
- ✓ No cross-tenant data leakage
- ✓ Thread-safe concurrent operations
- ✓ < 100ms overhead for tenant switching
- ✓ 99.9% token refresh success rate
- ✓ Respects Xero rate limits

### User Experience
- ✓ Intuitive organisation selection
- ✓ Clear indication of active organisation
- ✓ Smooth switching experience
- ✓ Helpful error messages

---

## Future Enhancements

### Phase 7: Advanced Features (Future)

1. **Organisation Groups**
   - Group related organisations
   - Aggregate reporting across groups
   - Bulk operations

2. **Smart Context Detection**
   - AI-powered organisation selection
   - Automatic context switching based on query
   - Learning user preferences

3. **Enhanced Analytics**
   - Cross-organisation dashboards
   - Comparative analytics
   - Trend analysis

4. **Bulk Operations**
   - Xero's bulk connection feature
   - Select multiple orgs during OAuth
   - Faster onboarding

---

## Appendix

### A. Xero API Limits

- **Rate Limit:** 60 calls per minute per organisation
- **Connection Limit:** 25 tenants for uncertified apps
- **Token Expiry:** Access tokens expire after 30 minutes
- **Refresh Token:** Valid for 60 days

### B. Database Schema Reference

See Phase 1.1 for complete schema definitions.

### C. API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/xero/organisations` | GET | List connected organisations |
| `/api/xero/set-primary` | POST | Set primary organisation |
| `/api/xero/sync` | POST | Sync connections from Xero |
| `/api/xero/disconnect` | POST | Disconnect organisation |

### D. Environment Variables

```bash
# Existing
XERO_CLIENT_ID=your_client_id
XERO_CLIENT_SECRET=your_client_secret
XERO_REDIRECT_URI=your_redirect_uri
XERO_ENCRYPTION_KEY=your_encryption_key

# New (optional)
XERO_ENABLE_BULK_CONNECTIONS=true
XERO_MAX_CONNECTIONS_PER_USER=10
```

---

## Conclusion

This architecture provides a robust foundation for multi-company Xero API connections with:

1. **Flexibility:** Hybrid approach supports both simple and advanced use cases
2. **Security:** Strong data isolation and thread safety
3. **Performance:** Efficient caching and parallel execution
4. **Scalability:** Designed to handle many organisations per user
5. **Maintainability:** Clean separation of concerns and comprehensive testing

The phased rollout approach ensures stable delivery while maintaining backward compatibility with existing single-tenant implementations.