# Usage Accounting Implementation Guide

## Overview

This guide will walk you through implementing a comprehensive usage accounting system that allows system administrators to track token usage and costs for all users over time. Currently, the system only stores the most recent token usage per chat session. We need to build a historical tracking system.

---

## Part 1: Understanding the Current System

### Current Token Tracking (What Already Exists)

**Where tokens are tracked now:**
- File: `lib/db/schema.ts` (line 34)
- The `Chat` table has a `lastContext` column that stores only the **most recent** usage
- This gets updated after every AI response but overwrites previous data

**What data is captured:**
- Input tokens, output tokens, cached tokens, reasoning tokens
- Cost in USD (input cost, output cost, reasoning cost, cache read cost)
- Model context limits
- Total tokens used

**Where it gets saved:**
- File: `app/(chat)/api/chat/route.ts` (around line 263)
- Function: `updateChatLastContextById()`
- This happens in the `onFinish` callback after the AI response completes

### Problem Statement

System admins cannot answer questions like:
- How many tokens did user X use this month?
- What is the total cost across all users this week?
- Which users are the heaviest consumers?
- What is the token usage trend over time?

**Why?** Because we only keep the last usage record per chat, not a history.

---

## Part 2: Database Schema Changes

### Step 1: Add the Usage Log Table

We need a new table to store every AI interaction's token usage.

**File to create:** `lib/db/schema.ts`

**What to do:**
1. Open `lib/db/schema.ts`
2. Scroll to the bottom of the file (after the `stream` table definition, around line 173)
3. Add this new table definition:

```typescript
export const usageLog = pgTable("UsageLog", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  messageId: uuid("messageId").references(() => message.id),
  modelId: text("modelId"),
  inputTokens: integer("inputTokens").notNull().default(0),
  outputTokens: integer("outputTokens").notNull().default(0),
  cachedInputTokens: integer("cachedInputTokens").default(0),
  reasoningTokens: integer("reasoningTokens").default(0),
  totalTokens: integer("totalTokens").notNull().default(0),
  inputCostUSD: numeric("inputCostUSD", { precision: 10, scale: 8 }),
  outputCostUSD: numeric("outputCostUSD", { precision: 10, scale: 8 }),
  reasoningCostUSD: numeric("reasoningCostUSD", { precision: 10, scale: 8 }),
  cacheReadCostUSD: numeric("cacheReadCostUSD", { precision: 10, scale: 8 }),
  totalCostUSD: numeric("totalCostUSD", { precision: 10, scale: 8 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type UsageLog = InferSelectModel<typeof usageLog>;
```

**Important notes:**
- You need to import `integer` and `numeric` at the top of the file where other imports are
- Add them to the import statement on line 2-13:

```typescript
import {
  boolean,
  foreignKey,
  integer,  // ADD THIS
  json,
  jsonb,
  numeric,  // ADD THIS
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
```

### Step 2: Generate Migration Files

Drizzle ORM will create the SQL migration automatically.

**Commands to run:**

```bash
pnpm db:generate
```

**What this does:**
- Compares your schema file with the current database
- Creates a new migration file in `lib/db/migrations/`
- Creates a new snapshot in `lib/db/migrations/meta/`

**What you'll see:**
- A new file like `lib/db/migrations/0008_something_something.sql`
- This file contains the SQL `CREATE TABLE` statement

**Review the migration:**
1. Open the newly created `.sql` file
2. Verify it has a `CREATE TABLE "UsageLog"` statement
3. Check that all columns are present
4. Make sure foreign key constraints are correct

### Step 3: Apply the Migration

**Commands to run:**

```bash
pnpm db:migrate
```

**What this does:**
- Runs the SQL migration against your PostgreSQL database
- Creates the `UsageLog` table

**How to verify it worked:**

```bash
pnpm db:studio
```

This opens Drizzle Studio in your browser. You should see a new `UsageLog` table listed.

---

## Part 3: Database Query Functions

### Step 1: Add the Log Usage Function

We need a function to insert usage records into the new table.

**File to edit:** `lib/db/queries.ts`

**What to do:**
1. Open `lib/db/queries.ts`
2. Add import for the new table at the top (around line 22-34):

```typescript
import {
  type Chat,
  chat,
  type DBMessage,
  document,
  message,
  type Suggestion,
  stream,
  suggestion,
  type User,
  user,
  usageLog,  // ADD THIS LINE
  vote,
} from "./schema";
```

3. Scroll to the bottom of the file (after `getStreamIdsByChatId`, around line 562)
4. Add these new functions:

```typescript
export async function logUsage({
  userId,
  chatId,
  messageId,
  usage,
}: {
  userId: string;
  chatId: string;
  messageId?: string;
  usage: AppUsage;
}) {
  try {
    return await db.insert(usageLog).values({
      userId,
      chatId,
      messageId: messageId ?? null,
      modelId: usage.modelId ?? null,
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      cachedInputTokens: usage.cachedInputTokens ?? 0,
      reasoningTokens: usage.reasoningTokens ?? 0,
      totalTokens: usage.totalTokens ?? 0,
      inputCostUSD: usage.costUSD?.inputUSD?.toString() ?? null,
      outputCostUSD: usage.costUSD?.outputUSD?.toString() ?? null,
      reasoningCostUSD: usage.costUSD?.reasoningUSD?.toString() ?? null,
      cacheReadCostUSD: usage.costUSD?.cacheReadUSD?.toString() ?? null,
      totalCostUSD: usage.costUSD?.totalUSD?.toString() ?? null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to log usage:", error);
    // Don't throw - we don't want usage logging to break the chat flow
    return;
  }
}

export async function getUserUsageByDateRange({
  userId,
  startDate,
  endDate,
}: {
  userId: string;
  startDate: Date;
  endDate: Date;
}) {
  try {
    const result = await db
      .select({
        totalTokens: sql<number>`SUM(${usageLog.totalTokens})`,
        totalCost: sql<number>`SUM(CAST(${usageLog.totalCostUSD} AS DECIMAL))`,
        messageCount: count(usageLog.id),
        inputTokens: sql<number>`SUM(${usageLog.inputTokens})`,
        outputTokens: sql<number>`SUM(${usageLog.outputTokens})`,
        cachedInputTokens: sql<number>`SUM(${usageLog.cachedInputTokens})`,
        reasoningTokens: sql<number>`SUM(${usageLog.reasoningTokens})`,
      })
      .from(usageLog)
      .where(
        and(
          eq(usageLog.userId, userId),
          gte(usageLog.createdAt, startDate),
          lt(usageLog.createdAt, endDate)
        )
      )
      .execute();

    return result[0];
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user usage by date range"
    );
  }
}

export async function getAllUsersUsageSummary({
  startDate,
  endDate,
  limit = 100,
}: {
  startDate: Date;
  endDate: Date;
  limit?: number;
}) {
  try {
    return await db
      .select({
        userId: usageLog.userId,
        userEmail: user.email,
        totalTokens: sql<number>`SUM(${usageLog.totalTokens})`,
        totalCost: sql<number>`SUM(CAST(${usageLog.totalCostUSD} AS DECIMAL))`,
        messageCount: count(usageLog.id),
        inputTokens: sql<number>`SUM(${usageLog.inputTokens})`,
        outputTokens: sql<number>`SUM(${usageLog.outputTokens})`,
        cachedInputTokens: sql<number>`SUM(${usageLog.cachedInputTokens})`,
        reasoningTokens: sql<number>`SUM(${usageLog.reasoningTokens})`,
      })
      .from(usageLog)
      .innerJoin(user, eq(usageLog.userId, user.id))
      .where(
        and(
          gte(usageLog.createdAt, startDate),
          lt(usageLog.createdAt, endDate)
        )
      )
      .groupBy(usageLog.userId, user.email)
      .orderBy(desc(sql`SUM(${usageLog.totalTokens})`))
      .limit(limit)
      .execute();
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get all users usage summary"
    );
  }
}

export async function getUserUsageHistory({
  userId,
  limit = 100,
  offset = 0,
}: {
  userId: string;
  limit?: number;
  offset?: number;
}) {
  try {
    return await db
      .select({
        id: usageLog.id,
        chatId: usageLog.chatId,
        messageId: usageLog.messageId,
        modelId: usageLog.modelId,
        totalTokens: usageLog.totalTokens,
        inputTokens: usageLog.inputTokens,
        outputTokens: usageLog.outputTokens,
        cachedInputTokens: usageLog.cachedInputTokens,
        reasoningTokens: usageLog.reasoningTokens,
        totalCostUSD: usageLog.totalCostUSD,
        createdAt: usageLog.createdAt,
      })
      .from(usageLog)
      .where(eq(usageLog.userId, userId))
      .orderBy(desc(usageLog.createdAt))
      .limit(limit)
      .offset(offset)
      .execute();
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user usage history"
    );
  }
}
```

**Important notes:**
- You need to import `sql` from drizzle-orm at the top (around line 3-14):

```typescript
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  sql,  // ADD THIS LINE
  type SQL,
} from "drizzle-orm";
```

**What each function does:**

1. **`logUsage()`** - Inserts a single usage record (called after each AI response)
2. **`getUserUsageByDateRange()`** - Aggregates total usage for one user in a date range
3. **`getAllUsersUsageSummary()`** - Gets usage summary for ALL users (admin view)
4. **`getUserUsageHistory()`** - Gets detailed log of all interactions for a user with pagination

---

## Part 4: Hook Up Usage Logging

### Step 1: Modify the Chat API Route

Now we need to call `logUsage()` after every AI response.

**File to edit:** `app/(chat)/api/chat/route.ts`

**What to do:**

1. Add import at the top (around line 31-39):

```typescript
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  logUsage,  // ADD THIS LINE
  saveChat,
  saveMessages,
  updateChatLastContextById,
} from "@/lib/db/queries";
```

2. Find the `onFinish` callback (around line 249)
3. Modify it to add the usage logging call:

**Current code (around line 249-271):**

```typescript
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((currentMessage) => ({
            id: currentMessage.id,
            role: currentMessage.role,
            parts: currentMessage.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });

        if (finalMergedUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }
        }
      },
```

**Replace with:**

```typescript
      onFinish: async ({ messages }) => {
        const savedMessages = messages.map((currentMessage) => ({
          id: currentMessage.id,
          role: currentMessage.role,
          parts: currentMessage.parts,
          createdAt: new Date(),
          attachments: [],
          chatId: id,
        }));

        await saveMessages({ messages: savedMessages });

        if (finalMergedUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }

          // Log usage for admin tracking
          try {
            const assistantMessage = savedMessages.find(
              (msg) => msg.role === "assistant"
            );
            await logUsage({
              userId: session.user.id,
              chatId: id,
              messageId: assistantMessage?.id,
              usage: finalMergedUsage,
            });
          } catch (err) {
            console.warn("Unable to log usage for admin tracking", err);
          }
        }
      },
```

**What this does:**
- Saves messages as before
- Updates the chat's lastContext as before
- **NEW:** Also logs the usage to the UsageLog table for historical tracking
- Finds the assistant message ID to associate with the log entry
- Wraps in try/catch so logging failures don't break the chat

**Why we need the assistant message ID:**
- Each log entry should reference which specific message it's tracking
- The assistant message is the one that consumed the tokens

---

## Part 5: Create Admin API Routes

Now we need API endpoints that admins can call to get usage data.

### Step 1: Create the Admin API Directory Structure

**Commands to run:**

```bash
mkdir -p app/\(admin\)/api/usage
```

This creates the directory structure for admin routes.

### Step 2: Create Usage Summary Endpoint

**File to create:** `app/(admin)/api/usage/summary/route.ts`

**Content:**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getAllUsersUsageSummary } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new ChatSDKError("unauthorized:api", "Not authenticated").toResponse();
    }

    // TODO: Add admin role check here
    // For now, any authenticated user can access this
    // In production, add: if (!isAdmin(session.user)) { return unauthorized }

    const { searchParams } = new URL(request.url);

    // Default to last 30 days if not specified
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : new Date();

    const limit = searchParams.get("limit")
      ? Number.parseInt(searchParams.get("limit")!, 10)
      : 100;

    const summary = await getAllUsersUsageSummary({
      startDate,
      endDate,
      limit,
    });

    return NextResponse.json({
      data: summary,
      meta: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit,
        count: summary.length,
      },
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Error fetching usage summary:", error);
    return new ChatSDKError(
      "internal_server_error:api",
      "Failed to fetch usage summary"
    ).toResponse();
  }
}
```

**What this endpoint does:**
- URL: `GET /api/usage/summary?startDate=2025-01-01&endDate=2025-01-31&limit=100`
- Returns aggregated usage for ALL users
- Query parameters:
  - `startDate` (optional) - defaults to 30 days ago
  - `endDate` (optional) - defaults to now
  - `limit` (optional) - defaults to 100 users
- Response format:
  ```json
  {
    "data": [
      {
        "userId": "uuid",
        "userEmail": "user@example.com",
        "totalTokens": 150000,
        "totalCost": 0.45,
        "messageCount": 50,
        "inputTokens": 100000,
        "outputTokens": 50000,
        "cachedInputTokens": 10000,
        "reasoningTokens": 5000
      }
    ],
    "meta": {
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-01-31T23:59:59.999Z",
      "limit": 100,
      "count": 15
    }
  }
  ```

### Step 3: Create User-Specific Usage Endpoint

**File to create:** `app/(admin)/api/usage/user/[userId]/route.ts`

**Content:**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getUserUsageByDateRange, getUserUsageHistory } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new ChatSDKError("unauthorized:api", "Not authenticated").toResponse();
    }

    // TODO: Add admin role check here
    // Also allow users to view their own usage:
    // if (!isAdmin(session.user) && session.user.id !== params.userId) {
    //   return unauthorized
    // }

    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : new Date();

    const view = searchParams.get("view") || "summary"; // summary or history

    if (view === "history") {
      const limit = searchParams.get("limit")
        ? Number.parseInt(searchParams.get("limit")!, 10)
        : 100;

      const offset = searchParams.get("offset")
        ? Number.parseInt(searchParams.get("offset")!, 10)
        : 0;

      const history = await getUserUsageHistory({
        userId: params.userId,
        limit,
        offset,
      });

      return NextResponse.json({
        data: history,
        meta: {
          userId: params.userId,
          view: "history",
          limit,
          offset,
          count: history.length,
        },
      });
    }

    // Default: return summary
    const summary = await getUserUsageByDateRange({
      userId: params.userId,
      startDate,
      endDate,
    });

    return NextResponse.json({
      data: summary,
      meta: {
        userId: params.userId,
        view: "summary",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Error fetching user usage:", error);
    return new ChatSDKError(
      "internal_server_error:api",
      "Failed to fetch user usage"
    ).toResponse();
  }
}
```

**What this endpoint does:**
- URL: `GET /api/usage/user/[userId]?view=summary&startDate=2025-01-01&endDate=2025-01-31`
- Returns usage for a specific user
- Query parameters:
  - `view` - either "summary" (aggregated) or "history" (detailed log)
  - `startDate` (optional) - defaults to 30 days ago
  - `endDate` (optional) - defaults to now
  - `limit` (optional for history view) - defaults to 100
  - `offset` (optional for history view) - defaults to 0

**Summary view response:**
```json
{
  "data": {
    "totalTokens": 150000,
    "totalCost": 0.45,
    "messageCount": 50,
    "inputTokens": 100000,
    "outputTokens": 50000,
    "cachedInputTokens": 10000,
    "reasoningTokens": 5000
  },
  "meta": {
    "userId": "uuid",
    "view": "summary",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-01-31T23:59:59.999Z"
  }
}
```

**History view response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "chatId": "uuid",
      "messageId": "uuid",
      "modelId": "grok-2-vision-1212",
      "totalTokens": 3000,
      "inputTokens": 2000,
      "outputTokens": 1000,
      "cachedInputTokens": 0,
      "reasoningTokens": 0,
      "totalCostUSD": "0.009",
      "createdAt": "2025-01-15T14:30:00.000Z"
    }
  ],
  "meta": {
    "userId": "uuid",
    "view": "history",
    "limit": 100,
    "offset": 0,
    "count": 50
  }
}
```

### Step 4: Create CSV Export Endpoint

**File to create:** `app/(admin)/api/usage/export/route.ts`

**Content:**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getAllUsersUsageSummary } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new ChatSDKError("unauthorized:api", "Not authenticated").toResponse();
    }

    // TODO: Add admin role check here

    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : new Date();

    const format = searchParams.get("format") || "csv"; // csv or json

    const summary = await getAllUsersUsageSummary({
      startDate,
      endDate,
      limit: 10000, // Large limit for export
    });

    if (format === "json") {
      return NextResponse.json({
        data: summary,
        meta: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          exportedAt: new Date().toISOString(),
          count: summary.length,
        },
      });
    }

    // Generate CSV
    const headers = [
      "User ID",
      "Email",
      "Total Tokens",
      "Total Cost (USD)",
      "Message Count",
      "Input Tokens",
      "Output Tokens",
      "Cached Input Tokens",
      "Reasoning Tokens",
    ];

    const rows = summary.map((row) => [
      row.userId,
      row.userEmail,
      row.totalTokens,
      row.totalCost || "0",
      row.messageCount,
      row.inputTokens,
      row.outputTokens,
      row.cachedInputTokens || "0",
      row.reasoningTokens || "0",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="usage-export-${startDate.toISOString().split("T")[0]}-to-${endDate.toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Error exporting usage data:", error);
    return new ChatSDKError(
      "internal_server_error:api",
      "Failed to export usage data"
    ).toResponse();
  }
}
```

**What this endpoint does:**
- URL: `GET /api/usage/export?format=csv&startDate=2025-01-01&endDate=2025-01-31`
- Downloads usage data as CSV or JSON
- Query parameters:
  - `format` - either "csv" or "json"
  - `startDate` (optional)
  - `endDate` (optional)
- CSV response will trigger browser download
- JSON response returns structured data

---

## Part 6: Testing Your Implementation

### Step 1: Verify Database Setup

**Check the table exists:**

```bash
pnpm db:studio
```

1. Look for `UsageLog` table in the left sidebar
2. Click on it - it should be empty initially
3. Verify all columns are present

### Step 2: Test Usage Logging

**Start the dev server:**

```bash
pnpm dev
```

**Test the chat:**
1. Go to http://localhost:3000
2. Log in (or continue as guest)
3. Send a message to the AI
4. Wait for the response

**Verify logging worked:**

```bash
pnpm db:studio
```

1. Refresh the browser
2. Click on `UsageLog` table
3. You should see a new row with:
   - Your userId
   - The chatId
   - Token counts
   - Cost values
   - Timestamp

### Step 3: Test the Admin API Endpoints

**Using curl or your browser:**

**Test 1: Get all users summary**
```bash
curl http://localhost:3000/api/usage/summary
```

Expected: JSON with array of user usage data

**Test 2: Get specific user summary**
```bash
# Replace USER_ID with actual user ID from database
curl "http://localhost:3000/api/usage/user/USER_ID?view=summary"
```

Expected: JSON with aggregated usage for that user

**Test 3: Get specific user history**
```bash
curl "http://localhost:3000/api/usage/user/USER_ID?view=history&limit=10"
```

Expected: JSON array with detailed log entries

**Test 4: Export CSV**
```bash
curl "http://localhost:3000/api/usage/export?format=csv" --output usage-export.csv
```

Expected: CSV file downloaded with usage data

**Test 5: Export JSON**
```bash
curl "http://localhost:3000/api/usage/export?format=json"
```

Expected: JSON with all users' usage data

### Step 4: Test Date Range Filtering

**Test with specific date range:**
```bash
curl "http://localhost:3000/api/usage/summary?startDate=2025-01-01&endDate=2025-01-31"
```

Expected: Only usage from January 2025

### Step 5: Test Multiple Chats

**Generate more data:**
1. Have several chat conversations
2. Try different models (regular vs reasoning)
3. Use attachments if possible

**Verify in database:**
- Each AI response should create a UsageLog entry
- Token counts should vary based on conversation length
- Cost values should be present

---

## Part 7: Adding Admin Role Protection (Optional but Recommended)

Right now, any authenticated user can access the admin endpoints. You should add role-based access control.

### Step 1: Add Admin Flag to User Schema

**File to edit:** `lib/db/schema.ts`

**Modify the user table (around line 16-20):**

```typescript
export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
  isAdmin: boolean("isAdmin").notNull().default(false),  // ADD THIS
});
```

### Step 2: Generate and Run Migration

```bash
pnpm db:generate
pnpm db:migrate
```

### Step 3: Create Admin Middleware Helper

**File to create:** `lib/auth/admin.ts`

**Content:**

```typescript
import type { Session } from "next-auth";
import { ChatSDKError } from "@/lib/errors";
import { getUser } from "@/lib/db/queries";

export async function requireAdmin(session: Session | null) {
  if (!session?.user?.email) {
    throw new ChatSDKError("unauthorized:api", "Not authenticated");
  }

  const [user] = await getUser(session.user.email);

  if (!user?.isAdmin) {
    throw new ChatSDKError("forbidden:api", "Admin access required");
  }

  return user;
}
```

### Step 4: Use in Admin Routes

**Update each admin route file to add this check:**

**Example for `app/(admin)/api/usage/summary/route.ts`:**

```typescript
import { requireAdmin } from "@/lib/auth/admin";

export async function GET(request: Request) {
  try {
    const session = await auth();

    // Add this line:
    await requireAdmin(session);

    // ... rest of the endpoint code
  } catch (error) {
    // ... error handling
  }
}
```

**Repeat for:**
- `app/(admin)/api/usage/user/[userId]/route.ts`
- `app/(admin)/api/usage/export/route.ts`

### Step 5: Manually Set Admin Users

**Using Drizzle Studio:**

```bash
pnpm db:studio
```

1. Click on `User` table
2. Find the user you want to make admin
3. Edit the row
4. Set `isAdmin` to `true`
5. Save

**Or using SQL in production:**

```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'admin@example.com';
```

---

## Part 8: Common Issues and Troubleshooting

### Issue: Migration fails with "column already exists"

**Solution:**
1. Check if you already ran the migration
2. Run `pnpm db:studio` and look for the table
3. If table exists, the migration already ran
4. If you need to start over, you can drop the table in Studio or via SQL

### Issue: "usageLog is not defined" error

**Solution:**
- Make sure you added the import in `lib/db/queries.ts`
- Check that you exported the table from `lib/db/schema.ts`
- Restart your dev server

### Issue: Usage not being logged

**Check these things:**
1. Is `finalMergedUsage` defined? (Add console.log to check)
2. Look for errors in the console (server logs)
3. Check the try/catch isn't swallowing errors silently
4. Verify the database connection is working

**Debug by adding console logs:**

```typescript
if (finalMergedUsage) {
  console.log("About to log usage:", finalMergedUsage);
  try {
    await logUsage({
      userId: session.user.id,
      chatId: id,
      messageId: assistantMessage?.id,
      usage: finalMergedUsage,
    });
    console.log("Usage logged successfully");
  } catch (err) {
    console.error("Failed to log usage:", err);
  }
}
```

### Issue: API returns 404

**Solution:**
- Check the directory structure is correct
- Make sure files are named `route.ts` not `route.tsx`
- Restart the dev server
- Check the URL matches the folder structure

### Issue: Cost values are null

**This is expected if:**
- TokenLens catalog fetch failed
- Model doesn't have pricing info
- The model ID is not recognized

**Check by:**
1. Look at server logs for TokenLens warnings
2. Verify `modelId` is being set in the usage object
3. Check if `usage.costUSD` exists before trying to access it

### Issue: Can't query by date range

**Solution:**
- Make sure dates are valid ISO strings
- Use `new Date().toISOString()` to format dates
- Check timezone handling (dates are stored in UTC)

**Example of correct date format:**
```
?startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z
```

---

## Part 9: Next Steps and Enhancements

Once the basic system is working, consider these improvements:

### Enhancement 1: Add Indexes for Performance

**File to edit:** `lib/db/schema.ts`

Add indexes to the `usageLog` table:

```typescript
export const usageLog = pgTable("UsageLog", {
  // ... existing columns
}, (table) => ({
  userIdIdx: index("usage_log_user_id_idx").on(table.userId),
  chatIdIdx: index("usage_log_chat_id_idx").on(table.chatId),
  createdAtIdx: index("usage_log_created_at_idx").on(table.createdAt),
  userCreatedIdx: index("usage_log_user_created_idx").on(table.userId, table.createdAt),
}));
```

Don't forget to import `index` at the top:

```typescript
import {
  // ... other imports
  index,
} from "drizzle-orm/pg-core";
```

Then generate and run migration:
```bash
pnpm db:generate
pnpm db:migrate
```

### Enhancement 2: Add Caching

Cache expensive queries using Next.js cache:

```typescript
import { unstable_cache as cache } from "next/cache";

export const getCachedUsageSummary = cache(
  async (startDate: Date, endDate: Date) => {
    return getAllUsersUsageSummary({ startDate, endDate, limit: 100 });
  },
  ["usage-summary"],
  { revalidate: 300 } // 5 minutes
);
```

### Enhancement 3: Add Real-time Aggregates

Create a separate `usage_summary` table that gets updated periodically:

```typescript
export const usageSummary = pgTable("UsageSummary", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId").notNull().references(() => user.id),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  totalTokens: integer("totalTokens").notNull(),
  totalCostUSD: numeric("totalCostUSD", { precision: 10, scale: 8 }),
  messageCount: integer("messageCount").notNull(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
```

### Enhancement 4: Add Usage Alerts

Create a function to check if users exceed thresholds:

```typescript
export async function checkUsageThreshold({
  userId,
  thresholdTokens,
  periodHours = 24,
}: {
  userId: string;
  thresholdTokens: number;
  periodHours?: number;
}) {
  const startDate = new Date(Date.now() - periodHours * 60 * 60 * 1000);
  const endDate = new Date();

  const usage = await getUserUsageByDateRange({ userId, startDate, endDate });

  return {
    exceeded: (usage.totalTokens || 0) > thresholdTokens,
    totalTokens: usage.totalTokens || 0,
    thresholdTokens,
    percentageUsed: ((usage.totalTokens || 0) / thresholdTokens) * 100,
  };
}
```

### Enhancement 5: Add Dashboard UI

Create an admin dashboard page at `app/(admin)/admin/usage/page.tsx`:

```typescript
import { auth } from "@/app/(auth)/auth";
import { requireAdmin } from "@/lib/auth/admin";
import { getAllUsersUsageSummary } from "@/lib/db/queries";

export default async function UsageAdminPage() {
  const session = await auth();
  await requireAdmin(session);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const summary = await getAllUsersUsageSummary({
    startDate: thirtyDaysAgo,
    endDate: now,
    limit: 100,
  });

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Usage Dashboard</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th>Email</th>
              <th>Total Tokens</th>
              <th>Total Cost</th>
              <th>Messages</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row.userId}>
                <td>{row.userEmail}</td>
                <td>{row.totalTokens.toLocaleString()}</td>
                <td>${Number(row.totalCost).toFixed(4)}</td>
                <td>{row.messageCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Summary Checklist

Use this checklist to track your progress:

- [ ] Part 1: Understand current system
- [ ] Part 2: Database schema
  - [ ] Add imports to schema.ts
  - [ ] Add usageLog table definition
  - [ ] Run `pnpm db:generate`
  - [ ] Review migration SQL
  - [ ] Run `pnpm db:migrate`
  - [ ] Verify in `pnpm db:studio`
- [ ] Part 3: Database queries
  - [ ] Add imports to queries.ts
  - [ ] Add `logUsage()` function
  - [ ] Add `getUserUsageByDateRange()` function
  - [ ] Add `getAllUsersUsageSummary()` function
  - [ ] Add `getUserUsageHistory()` function
- [ ] Part 4: Hook up logging
  - [ ] Import `logUsage` in route.ts
  - [ ] Modify `onFinish` callback
  - [ ] Add try/catch for logging
- [ ] Part 5: Create API routes
  - [ ] Create directory structure
  - [ ] Create summary endpoint
  - [ ] Create user-specific endpoint
  - [ ] Create export endpoint
- [ ] Part 6: Testing
  - [ ] Test chat and verify logging
  - [ ] Test all API endpoints
  - [ ] Test date filtering
  - [ ] Generate multiple conversations
- [ ] Part 7: Admin protection (optional)
  - [ ] Add isAdmin to schema
  - [ ] Generate and run migration
  - [ ] Create requireAdmin helper
  - [ ] Update all admin routes
  - [ ] Set admin users in database
- [ ] Part 8: Handle any issues
- [ ] Part 9: Plan enhancements

---

## Getting Help

If you get stuck:

1. Check the error message carefully
2. Look at the server logs (terminal where `pnpm dev` is running)
3. Use `console.log()` to debug
4. Check Drizzle Studio to see actual database state
5. Review the existing code in similar files
6. Search for similar patterns in the codebase

Remember: The goal is to track every AI interaction so admins can answer:
- How much is each user costing us?
- Who are our power users?
- What's our total usage trend?
- Do we need to adjust rate limits?
