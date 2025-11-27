# AR UI Component Documentation

## Overview

The AR (Accounts Receivable) UI provides an interactive dashboard for viewing customer payment data, assessing risk scores, and initiating follow-up communications. Built with Next.js 15 and React 19.

## Component Architecture

### Directory Structure

```
app/agents/ar/
├── page.tsx                          # Server Component - Main page
├── monitoring/
│   └── page.tsx                      # Monitoring dashboard
└── customer/
    └── [id]/                         # (Future) Customer detail pages

components/ar/
├── ageing-report-table.tsx           # Client Component - Main table
├── ageing-report-table-optimized.tsx # Performance-optimized version
├── customer-details-sheet.tsx        # Client Component - Invoice details modal
├── stale-data-banner.tsx            # Client Component - Alert banner
└── ageing-report-table.test.tsx     # Unit tests

lib/actions/
└── ar.ts                             # Server Actions for data fetching

lib/logic/
├── ar.ts                             # Business logic (ageing, risk scoring)
├── ar.test.ts                        # Unit tests for logic
└── ar-chat.ts                        # Chat integration logic

lib/db/schema/
└── ar.ts                             # Database schema definitions
```

### Component Hierarchy

```
page.tsx (Server Component)
├── data fetching via getAgeingReportData()
├── job status fetching via database query
└── renders:
    ├── StaleDataBanner (Client)
    └── AgeingReportTable (Client)
        └── CustomerDetailsSheet (Client, lazy-loaded)
```

## Data Flow

### 1. Initial Page Load

```
User navigates to /agents/ar
    ↓
page.tsx (Server Component) executes
    ↓
Fetches data in parallel:
├── getAgeingReportData() → Customer AR summary
└── Database query → Latest job run status
    ↓
Server renders HTML with data
    ↓
Client hydrates interactive components
    ↓
User sees ageing report table
```

### 2. User Interactions

#### Filtering/Sorting
```
User changes filter/sort
    ↓
State update in AgeingReportTable
    ↓
useMemo recomputes filtered/sorted data
    ↓
Re-render table rows (optimized with memoization)
```

#### Opening Customer Details
```
User clicks customer row
    ↓
setSelectedContactId(id) called
    ↓
CustomerDetailsSheet receives contactId prop
    ↓
useEffect triggers in Sheet component
    ↓
getCustomerInvoiceDetails(id) fetches invoice data
    ↓
Sheet displays invoice list
```

#### Starting Follow-Up Chat
```
User clicks "Start Follow-Up Chat" button
    ↓
handleStartChat() constructs URL params
    ↓
Router navigates to /chat/new?context=ar_followup&...
    ↓
Chat page detects AR context
    ↓
Fetches customer name from database
    ↓
generateFollowUpPrompt() creates AI prompt
    ↓
Auto-sends prompt to chat
```

## Component Details

### 1. `app/agents/ar/page.tsx`

**Type**: Server Component  
**Purpose**: Data fetching and page layout

**Key Features**:
- Fetches ageing report data
- Fetches latest job run status
- Server-side rendering for fast initial load
- Passes data to client components

**Props**: None (uses searchParams from Next.js)

**Data Dependencies**:
```typescript
- getAgeingReportData(): AgeingReportItem[]
- arJobRun database query: ArJobRun | null
```

---

### 2. `components/ar/ageing-report-table.tsx`

**Type**: Client Component  
**Purpose**: Interactive data table with filtering and sorting

**Props**:
```typescript
interface AgeingReportTableProps {
  initialData: AgeingReportItem[];
}
```

**State**:
```typescript
- data: AgeingReportItem[]          // Initialized from props
- sortField: SortField              // Current sort column
- sortDirection: "asc" | "desc"     // Sort direction
- filterMinBalance: string          // Min outstanding filter
- filterMinRisk: string             // Min risk score filter
- filterHas90Plus: "all" | "yes"    // 90+ day filter
- selectedContactId: string | null  // Selected customer for modal
```

**Key Methods**:
- `handleSort(field)` - Toggle sort on column
- `filteredData` (useMemo) - Apply filters
- `sortedData` (useMemo) - Apply sorting

---

### 3. `components/ar/customer-details-sheet.tsx`

**Type**: Client Component  
**Purpose**: Display invoice details for a customer

**Props**:
```typescript
interface CustomerDetailsSheetProps {
  contactId: string | null;
  customerName: string;
  totalOutstanding: number;
  riskScore: number;
  onOpenChange: (open: boolean) => void;
}
```

**State**:
```typescript
- invoices: InvoiceDetail[]  // Fetched invoice list
- loading: boolean           // Loading state
```

**Side Effects**:
```typescript
useEffect(() => {
  if (contactId) {
    setLoading(true);
    getCustomerInvoiceDetails(contactId)
      .then(setInvoices)
      .finally(() => setLoading(false));
  }
}, [contactId]);
```

**Navigation**:
```typescript
handleStartChat() {
  const params = new URLSearchParams({
    context: "ar_followup",
    customerId: contactId,
    outstanding: totalOutstanding.toString(),
    riskScore: riskScore.toString(),
  });
  router.push(`/chat/new?${params.toString()}`);
}
```

---

### 4. `components/ar/stale-data-banner.tsx`

**Type**: Client Component
**Purpose**: Alert users if data is stale or needs manual sync

**Props**:
```typescript
interface StaleDataBannerProps {
  lastSyncDate: Date | null;
}
```

**Logic**:
- No sync: Show prompt to trigger manual sync
- > 24 hours old: Show warning
- Otherwise: Render null (no banner)

---

## Running Locally

### Prerequisites
```bash
Node.js 18+
PostgreSQL database
pnpm package manager
```

### Environment Variables

Required in `.env.local`:
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ledgerbot"

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Xero Integration (optional for mock data)
XERO_CLIENT_ID="your-client-id"
XERO_CLIENT_SECRET="your-secret"
```

### Setup Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Run database migrations
pnpm db:migrate

# 3. (Optional) Seed test data
pnpm db:seed  # If seed script exists

# 4. Start development server
pnpm dev

# 5. Navigate to http://localhost:3000/agents/ar
```

### Mock Data

For testing without Xero connection, create mock data:

```bash
# Run custom script
node scripts/seed-ar-mock-data.js
```

Or use the admin panel:
```
Navigate to /admin/seed-data
Select "AR Test Data"
Click "Generate"
```

---

## Testing Components

### Unit Tests

Run AR logic tests:
```bash
pnpm test lib/logic/ar.test.ts
```

Run UI component tests:
```bash
pnpm test components/ar/ageing-report-table.test.tsx
```

### E2E Tests

Run Playwright tests:
```bash
pnpm test:e2e tests/e2e/ageing-report.spec.ts
```

### Storybook (Interactive Testing)

```bash
pnpm storybook
# Opens http://localhost:6006
```

Browse components in isolation, test different states, verify accessibility.

---

## Performance Considerations

### Current Optimizations
- ✅ Pagination (50 items/page)
- ✅ Memoized filtering/sorting
- ✅ Lazy-loaded modal
- ✅ Code splitting

### When to Optimize Further

**Trigger**: > 10,000 customers

**Options**:
1. **Virtual Scrolling**: Use `@tanstack/react-virtual`
2. **Server-Side Pagination**: Move pagination to backend
3. **Debounced Filters**: Reduce re-render frequency

See [`docs/ar-performance-optimization.md`](./ar-performance-optimization.md) for details.

---

## Accessibility

All components follow WCAG 2.1 AA standards:

- ✅ Keyboard navigation
- ✅ Screen reader labels
- ✅ Focus indicators
- ✅ Color contrast ratios >= 4.5:1
- ✅ Touch targets >= 44px

### Testing Accessibility

```bash
# Run axe accessibility tests
pnpm test:a11y

# Manual testing with screen reader
# macOS: VoiceOver (Cmd+F5)
# Windows: NVDA
```

---

## Troubleshooting

### Issue: Table shows "No customers found"

**Causes**:
1. No data in database
2. Filters too restrictive
3. Failed data sync

**Solutions**:
1. Check monitoring dashboard: `/agents/ar/monitoring`
2. Clear all filters
3. Manually trigger sync or seed test data

---

### Issue: Modal doesn't open

**Causes**:
1. Click event not firing
2. ContactId is null
3. JavaScript error

**Solutions**:
1. Check browser console for errors
2. Verify `selectedContactId` state in React DevTools
3. Ensure `CustomerDetailsSheet` is imported correctly

---

### Issue: "Start Follow-Up Chat" doesn't navigate

**Causes**:
1. Router not initialized
2. Invalid query parameters
3. Chat route not configured

**Solutions**:
1. Check that customer data includes `contactId`
2. Verify `/chat/new` route exists
3. Check browser console for navigation errors

---

## Data Types Reference

### AgeingReportItem
```typescript
interface AgeingReportItem {
  contactId: string;
  customerName: string;
  totalOutstanding: number;
  ageingCurrent: number;
  ageing1_30: number;
  ageing31_60: number;
  ageing61_90: number;
  ageing90Plus: number;
  riskScore: number;
  lastUpdated: Date;
}
```

### InvoiceDetail
```typescript
interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  amount: number;
  amountOutstanding: number;
  status: string;
  ageingBucket: string | null;
}
```

---

## Related Documentation

- [AR_AGENT.md](./AR_AGENT.md) - Complete AR Agent guide
- [risk-algorithm.md](./risk-algorithm.md) - Risk scoring details
- [ar-performance-optimization.md](./ar-performance-optimization.md) - Performance guide
- [ar-test-plan.md](./ar-test-plan.md) - Testing strategy
