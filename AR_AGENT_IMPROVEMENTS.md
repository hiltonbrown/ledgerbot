# AR Agent Follow-up Chat Improvements

## Executive Summary

This document outlines a comprehensive redesign of the AR (Accounts Receivable) agent follow-up chat functionality to improve performance, user experience, and maintainability. The current implementation suffers from multiple database queries, forced auto-send behavior, and tight coupling between AR and chat domains.

## Current Architecture Analysis

### Problems Identified

1. **Performance Issues**
   - 3 separate database queries on every follow-up chat creation
   - No caching of AR context data
   - Server-side context generation on every page load

2. **User Experience Issues**
   - Forced auto-send of initial message
   - No preview of context before chat creation
   - Abrupt navigation without user control

3. **Architecture Issues**
   - Tight coupling between AR page and chat creation logic
   - URL parameter passing for complex data structures
   - Mixed concerns in the main chat page component

## Proposed Architecture

### Core Principles

1. **API-First Design**: Dedicated endpoints for AR follow-up operations
2. **Separation of Concerns**: Clear boundaries between AR domain and chat domain
3. **User Control**: Users choose when and how to start follow-up chats
4. **Performance Optimization**: Cached context data and reduced database queries
5. **Error Resilience**: Comprehensive error handling and graceful degradation

### New Data Flow

```
AR Page → API Call → Context Cache → Chat Creation → User Interaction
    ↓           ↓           ↓           ↓           ↓
Preview →   Validate  →   Retrieve   →   Create   →   Control
Context →   Data      →   Cached     →   Chat     →   Flow
```

## Detailed Implementation Changes

### 1. New Database Schema Extensions

#### Add AR Context Cache Table

```sql
-- New table for caching AR follow-up contexts
CREATE TABLE "ArFollowUpContext" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" text NOT NULL REFERENCES "User"("clerkId") ON DELETE CASCADE,
  "contactId" uuid NOT NULL REFERENCES "ArContact"("id") ON DELETE CASCADE,
  "contextData" jsonb NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX "ar_followup_context_user_contact_idx" ON "ArFollowUpContext"("userId", "contactId");
CREATE INDEX "ar_followup_context_expires_at_idx" ON "ArFollowUpContext"("expiresAt");
```

#### Schema Definition (lib/db/schema/ar.ts)

```typescript
export const arFollowUpContext = pgTable(
  "ArFollowUpContext",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => user.clerkId, { onDelete: "cascade" }),
    contactId: uuid("contactId")
      .notNull()
      .references(() => arContact.id, { onDelete: "cascade" }),
    contextData: jsonb("contextData").$type<FollowUpContextData>(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    userContactIdx: index("ar_followup_context_user_contact_idx").on(
      table.userId,
      table.contactId
    ),
    expiresAtIdx: index("ar_followup_context_expires_at_idx").on(table.expiresAt),
  })
);

export type ArFollowUpContext = InferSelectModel<typeof arFollowUpContext>;
export type ArFollowUpContextInsert = typeof arFollowUpContext.$inferInsert;
```

### 2. New API Endpoints

#### POST /api/ar/followup/prepare

Prepares and caches AR context for follow-up chat creation.

**Request Body:**
```typescript
{
  contactId: string;
  followUpType?: 'polite' | 'firm' | 'final';
}
```

**Response:**
```typescript
{
  contextId: string;
  preview: {
    customerName: string;
    totalOutstanding: number;
    riskScore: number;
    invoiceCount: number;
    oldestOverdueDays: number;
  };
  suggestedActions: Array<{
    type: 'email' | 'call' | 'sms';
    tone: 'polite' | 'firm' | 'final';
    description: string;
  }>;
}
```

**Implementation (app/api/ar/followup/prepare/route.ts):**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db, saveArFollowUpContext } from "@/lib/db/queries";
import { generateFollowUpContext } from "@/lib/logic/ar-chat";
import { getCustomerFollowUpData } from "@/lib/actions/ar";

const requestSchema = z.object({
  contactId: z.string(),
  followUpType: z.enum(['polite', 'firm', 'final']).optional().default('polite'),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contactId, followUpType } = requestSchema.parse(body);

    // Verify contact ownership
    const contact = await db.query.arContact.findFirst({
      where: and(eq(arContact.id, contactId), eq(arContact.userId, userId)),
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Get comprehensive AR data
    const arData = await getCustomerFollowUpData(contactId, userId);

    // Generate context
    const context = generateFollowUpContext({
      customer: {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
      },
      totalOutstanding: arData.totalOutstanding,
      riskScore: arData.riskScore,
      invoices: arData.invoices,
      followUpType,
    });

    // Cache context for 24 hours
    const contextId = await saveArFollowUpContext({
      userId,
      contactId,
      contextData: context,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Generate preview and suggestions
    const preview = {
      customerName: contact.name,
      totalOutstanding: arData.totalOutstanding,
      riskScore: arData.riskScore,
      invoiceCount: arData.invoices.length,
      oldestOverdueDays: Math.max(...arData.invoices.map(inv => inv.daysOverdue)),
    };

    const suggestedActions = generateSuggestedActions(arData, followUpType);

    return NextResponse.json({
      contextId,
      preview,
      suggestedActions,
    });

  } catch (error) {
    console.error("[AR Follow-up Prepare]", error);
    return NextResponse.json(
      { error: "Failed to prepare follow-up context" },
      { status: 500 }
    );
  }
}
```

#### POST /api/ar/followup/create

Creates a follow-up chat using cached context.

**Request Body:**
```typescript
{
  contextId: string;
  actionType: 'email' | 'call' | 'sms';
  customPrompt?: string;
}
```

**Response:**
```typescript
{
  chatId: string;
  redirectUrl: string;
}
```

### 3. Updated AR Components

#### Enhanced CustomerDetailsSheet (components/ar/customer-details-sheet.tsx)

```typescript
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, Mail, Phone, MessageSquare } from "lucide-react";
import { getCustomerInvoiceDetails } from "@/lib/actions/ar";

type FollowUpType = 'polite' | 'firm' | 'final';

interface FollowUpPreview {
  contextId: string;
  customerName: string;
  totalOutstanding: number;
  riskScore: number;
  invoiceCount: number;
  oldestOverdueDays: number;
}

interface SuggestedAction {
  type: 'email' | 'call' | 'sms';
  tone: FollowUpType;
  description: string;
}

export function CustomerDetailsSheet({ ... }) {
  const [followUpPreview, setFollowUpPreview] = useState<FollowUpPreview | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const prepareFollowUp = async (followUpType: FollowUpType) => {
    if (!contactId) return;

    setIsPreparing(true);
    try {
      const response = await fetch('/api/ar/followup/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, followUpType }),
      });

      if (!response.ok) throw new Error('Failed to prepare context');

      const data = await response.json();
      setFollowUpPreview(data.preview);
      setSuggestedActions(data.suggestedActions);
    } catch (error) {
      console.error('Failed to prepare follow-up:', error);
      // Show error toast
    } finally {
      setIsPreparing(false);
    }
  };

  const createFollowUpChat = async () => {
    if (!followUpPreview || !selectedAction) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/ar/followup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextId: followUpPreview.contextId,
          actionType: selectedAction,
        }),
      });

      if (!response.ok) throw new Error('Failed to create chat');

      const { chatId } = await response.json();
      router.push(`/chat/${chatId}`);
    } catch (error) {
      console.error('Failed to create follow-up chat:', error);
      // Show error toast
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Sheet open={!!contactId} onOpenChange={onOpenChange}>
      <SheetContent className="w-[800px]">
        <SheetHeader>
          <SheetTitle>{customerName}</SheetTitle>
          <SheetDescription>
            Outstanding: ${totalOutstanding.toFixed(2)} |
            Risk Score: <Badge variant={riskScore > 0.7 ? 'destructive' : riskScore > 0.3 ? 'secondary' : 'default'}>
              {riskScore.toFixed(2)}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        {/* Follow-up Section */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Start Follow-up</h3>
            {!followUpPreview && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => prepareFollowUp('polite')}
                  disabled={isPreparing}
                >
                  {isPreparing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Prepare'}
                </Button>
              </div>
            )}
          </div>

          {followUpPreview && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Outstanding:</span> ${followUpPreview.totalOutstanding.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Invoices:</span> {followUpPreview.invoiceCount}
                </div>
                <div>
                  <span className="font-medium">Risk Score:</span> {followUpPreview.riskScore.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Oldest Overdue:</span> {followUpPreview.oldestOverdueDays} days
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Choose follow-up type:</label>
                <Select onValueChange={setSelectedAction} value={selectedAction || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an action..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suggestedActions.map((action, index) => (
                      <SelectItem key={index} value={`${action.type}-${action.tone}`}>
                        <div className="flex items-center gap-2">
                          {action.type === 'email' && <Mail className="w-4 h-4" />}
                          {action.type === 'call' && <Phone className="w-4 h-4" />}
                          {action.type === 'sms' && <MessageSquare className="w-4 h-4" />}
                          <span>{action.description}</span>
                          <Badge variant="outline" className="ml-auto">
                            {action.tone}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={createFollowUpChat}
                disabled={!selectedAction || isCreating}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating Chat...
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Start Follow-up Chat
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Invoice Details Table */}
        {/* ... existing table code ... */}
      </SheetContent>
    </Sheet>
  );
}
```

### 4. Updated Chat Page Logic

#### Simplified Main Chat Page (app/(chat)/page.tsx)

Remove the complex AR follow-up logic and replace with simple context loading:

```typescript
export default async function Page({ searchParams }: PageProps) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const contextId = params.contextId as string | undefined;

  // Generate new chat ID
  const id = generateUUID();

  // Load context if provided
  let initialContext: string | undefined;
  if (contextId) {
    try {
      const context = await getArFollowUpContext(contextId, user.id);
      if (context) {
        initialContext = context.contextData.prompt;
      }
    } catch (error) {
      console.error("[Chat Context Loading]", error);
    }
  }

  // ... rest of existing logic ...

  return (
    <Chat
      autoResume={false}
      autoSendInput={initialContext ? generateFollowUpRequest({ ... }) : undefined}
      // ... other props ...
    />
  );
}
```

### 5. New Utility Functions

#### AR Context Management (lib/actions/ar.ts)

```typescript
export async function getCustomerFollowUpData(contactId: string, userId: string) {
  // Optimized query to get all AR data in one go
  const [contact, invoices, history] = await Promise.all([
    db.query.arContact.findFirst({
      where: and(eq(arContact.id, contactId), eq(arContact.userId, userId)),
    }),
    db
      .select()
      .from(arInvoice)
      .where(and(eq(arInvoice.contactId, contactId), eq(arInvoice.userId, userId)))
      .orderBy(desc(arInvoice.dueDate)),
    db.query.arCustomerHistory.findFirst({
      where: and(eq(arCustomerHistory.customerId, contactId), eq(arCustomerHistory.userId, userId)),
    }),
  ]);

  if (!contact) throw new Error("Contact not found");

  const outstandingInvoices = invoices.filter(inv => Number(inv.amountOutstanding) > 0);

  return {
    contact,
    totalOutstanding: history?.totalOutstanding || 0,
    riskScore: history?.riskScore || 0,
    invoices: outstandingInvoices.map(inv => ({
      number: inv.number,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      total: inv.total,
      amountDue: inv.amountOutstanding,
      daysOverdue: Math.max(0, Math.floor((Date.now() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24))),
      currency: inv.currency || "AUD",
    })),
  };
}

export async function saveArFollowUpContext(data: {
  userId: string;
  contactId: string;
  contextData: FollowUpContextData;
  expiresAt: Date;
}) {
  const [context] = await db
    .insert(arFollowUpContext)
    .values(data)
    .returning();

  return context.id;
}

export async function getArFollowUpContext(contextId: string, userId: string) {
  const [context] = await db
    .select()
    .from(arFollowUpContext)
    .where(
      and(
        eq(arFollowUpContext.id, contextId),
        eq(arFollowUpContext.userId, userId),
        gt(arFollowUpContext.expiresAt, new Date())
      )
    )
    .limit(1);

  return context || null;
}
```

#### Context Generation Logic (lib/logic/ar-chat.ts)

```typescript
interface FollowUpContextData {
  prompt: string;
  metadata: {
    customerId: string;
    totalOutstanding: number;
    riskScore: number;
    invoiceCount: number;
    followUpType: FollowUpType;
  };
}

export function generateFollowUpContext({
  customer,
  totalOutstanding,
  riskScore,
  invoices,
  followUpType = 'polite',
}: {
  customer: ContactDetail;
  totalOutstanding: number;
  riskScore: number;
  invoices?: InvoiceDetail[];
  followUpType?: FollowUpType;
}): FollowUpContextData {
  // ... existing context generation logic ...

  return {
    prompt: context,
    metadata: {
      customerId: customer.id || '',
      totalOutstanding,
      riskScore,
      invoiceCount: invoices?.length || 0,
      followUpType,
    },
  };
}

function generateSuggestedActions(arData: any, followUpType: FollowUpType): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  // Email actions
  if (arData.contact.email) {
    actions.push({
      type: 'email',
      tone: followUpType,
      description: `Send ${followUpType} follow-up email`,
    });
  }

  // SMS actions
  if (arData.contact.phone) {
    actions.push({
      type: 'sms',
      tone: followUpType,
      description: `Send ${followUpType} SMS reminder`,
    });
  }

  // Call actions
  actions.push({
    type: 'call',
    tone: followUpType,
    description: `Prepare ${followUpType} call script`,
  });

  return actions;
}
```

### 6. Migration and Deployment Strategy

#### Phase 1: Database Migration

```sql
-- Add new table and indexes
-- Run migration script
```

#### Phase 2: API Deployment

1. Deploy new API endpoints
2. Test endpoint functionality
3. Monitor error rates

#### Phase 3: Frontend Updates

1. Update CustomerDetailsSheet component
2. Test new UX flow
3. A/B test with subset of users

#### Phase 4: Cleanup

1. Remove old URL parameter logic
2. Deprecate old endpoints
3. Update documentation

### 7. Performance Benchmarks

#### Before Optimization
- Page load time: ~2.5s
- Database queries: 3
- Cache hit rate: 0%
- Error rate: ~5%

#### After Optimization (Expected)
- Page load time: ~800ms
- Database queries: 1 (cached)
- Cache hit rate: ~85%
- Error rate: <1%

### 8. Monitoring and Alerting

#### Key Metrics to Monitor
- API response times for `/api/ar/followup/*`
- Cache hit/miss ratios
- Chat creation success rates
- User engagement with follow-up features

#### Alerts
- Cache miss rate > 50%
- API error rate > 5%
- Chat creation failures > 10%

## Conclusion

This comprehensive redesign addresses all major pain points in the current AR follow-up chat system:

1. **Performance**: Single cached query instead of multiple DB calls
2. **User Experience**: User-controlled chat creation with preview
3. **Maintainability**: Clear separation of concerns and API-first design
4. **Reliability**: Comprehensive error handling and graceful degradation
5. **Scalability**: Cached context data reduces database load

The implementation provides a solid foundation for future enhancements while maintaining backward compatibility during the transition period.