# A/R Agent - Accounts Receivable Management

## Overview

The A/R Agent is an intelligent accounts receivable management system integrated into LedgerBot. It automates the collection and analysis of customer payment data from Xero, provides risk scoring, generates interactive ageing reports, and enables AI-powered follow-up communications.

### Key Features

- **Data Ingestion**: Manual sync from Xero via the "Sync from Xero" button
- **Risk Scoring**: 0-1 scale risk assessment based on payment history and ageing patterns
- **Interactive Ageing Report**: Real-time dashboard at `/agents/ar` with sorting and filtering
- **AI-Powered Follow-Up**: Generate tailored collection messages via integrated chat
- **Monitoring Dashboard**: Track sync jobs and data freshness at `/agents/ar/monitoring`
- **Automated Alerts**: Stale data warnings and high-risk customer notifications

## System Architecture

```
┌─────────────────┐
│   Xero API      │
│  (Source Data)  │
└────────┬────────┘
         │
         │ Manual Sync (Sync from Xero button)
         ▼
┌─────────────────────────────────┐
│  Data Ingestion Pipeline        │
│  (/app/api/agents/ar/sync)      │
│  - Fetch invoices (24 months)   │
│  - Fetch payments               │
│  - Fetch contacts               │
│  - Calculate ageing buckets     │
│  - Compute risk scores          │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  PostgreSQL Database             │
│  - ArContact                     │
│  - ArInvoice                     │
│  - ArPayment                     │
│  - ArCustomerHistory             │
│  - ArJobRun                      │
└────────┬────────────────────────┘
         │
         ├────────────────────────┐
         │                        │
         ▼                        ▼
┌──────────────────┐    ┌─────────────────────┐
│  Ageing Report   │    │  Monitoring         │
│  /agents/ar      │    │  /agents/ar/monitor │
│  - Table view    │    │  - Job stats        │
│  - Risk badges   │    │  - Error logs       │
│  - Filters       │    │  - DSO metrics      │
└────────┬─────────┘    └─────────────────────┘
         │
         │ Click "Start Follow-Up"
         ▼
┌─────────────────────────────────┐
│  Chat Interface                  │
│  /chat/new?context=ar_followup  │
│  - Auto-populated prompt         │
│  - AI draft generation           │
│  - Risk-appropriate tone         │
└──────────────────────────────────┘
```

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Xero Developer Account
- Vercel Account (for AI Gateway)

### Environment Variables

Create a `.env.local` file:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ledgerbot"

# Xero API
XERO_CLIENT_ID="your-xero-client-id"
XERO_CLIENT_SECRET="your-xero-client-secret"
XERO_REDIRECT_URI="http://localhost:3000/api/xero/callback"

# Vercel AI
AI_GATEWAY_API_KEY="your-vercel-ai-gateway-key"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..."
CLERK_SECRET_KEY="..."
```

### Database Setup

```bash
# Install dependencies
pnpm install

# Generate migrations
pnpm db:generate

# Run migrations
pnpm db:migrate

# View database (optional)
pnpm db:studio
```

### Running the Application

```bash
# Development server
pnpm dev

# Open http://localhost:3000
```

### Initial Data Sync

Use the in-product "Sync from Xero" button or trigger the API directly:

```bash
curl -X POST http://localhost:3000/api/agents/ar/sync \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Developer Guide

### Adding a New Feature

#### Example: Adjusting Ageing Buckets

1. **Update Logic** (`lib/logic/ar.ts`):
```typescript
export function calculateAgeingBucket(
  dueDate: Date,
  amountOutstanding: number
): string | null {
  // Modify thresholds here
  if (daysOverdue <= 30) return "1-30";
  if (daysOverdue <= 60) return "31-60";
  // Add new bucket: 61-120
  if (daysOverdue <= 120) return "61-120";
  return "120+";
}
```

2. **Update Schema** (`lib/db/schema/ar.ts`):
```typescript
ageingBucket: varchar("ageingBucket", { length: 20 }), // Increase if needed
```

3. **Update UI** (`components/ar/ageing-report-table.tsx`):
```typescript
// Add new column for 61-120 bucket
<TableHead>61-120 Days</TableHead>
```

4. **Run Tests**:
```bash
pnpm test lib/logic/ar.test.ts
```

#### Example: Adjusting Risk Score Weights

Edit `lib/logic/ar.ts`:

```typescript
export function calculateRiskScore(stats: CustomerHistoryStats): number {
  const weights = {
    latePaymentRate: 0.30,   // ← Adjust these
    avgDaysLate: 0.20,
    maxDaysLate: 0.10,
    percentInvoices90Plus: 0.20,
    outstandingRatio: 0.10,
    daysSinceLastPayment: 0.05,
    creditTerms: 0.05,
  };
  
  // Score calculation remains the same
  return score;
}
```

Test changes:
```bash
pnpm test lib/logic/ar.test.ts
```

### File Structure

```
lib/
├── actions/ar.ts           # Server actions for data fetching
├── ingestion/
│   └── xero.ts            # Xero API integration
├── logic/
│   ├── ar.ts              # Core business logic
│   ├── ar.test.ts         # Unit tests
│   └── ar-chat.ts         # Follow-up message generation
└── db/
    └── schema/ar.ts       # Database schema

app/
├── agents/ar/
│   ├── page.tsx           # Ageing report UI
│   └── monitoring/
│       └── page.tsx       # Job monitoring dashboard
└── api/agents/ar/sync/
    └── route.ts           # Manual sync endpoint

components/ar/
├── ageing-report-table.tsx      # Main table component
├── customer-details-sheet.tsx   # Invoice details modal
└── stale-data-banner.tsx        # Data freshness warning
```

## API Reference

### Server Actions

#### `getAgeingReportData()`
Fetches aggregated customer AR data with ageing buckets.

**Returns**: `Promise<AgeingReportItem[]>`

#### `getCustomerInvoiceDetails(contactId: string)`
Retrieves invoice list for a specific customer.

**Returns**: Invoice details with outstanding amounts and ageing.

### Database Schema

#### `ArContact`
Customer/contact records synced from Xero.

#### `ArInvoice`
Invoice records with calculated `ageingBucket` and `amountOutstanding`.

#### `ArPayment`
Payment records linked to invoices.

#### `ArCustomerHistory`
Aggregated customer stats including:
- `riskScore`: 0-1 assessment
- `totalOutstanding`: Current AR balance
- `avgDaysLate`: Average payment delay
- `percentInvoices90Plus`: % of severely overdue invoices

#### `ArJobRun`
Job execution logs with stats and errors.

## Risk Scoring Algorithm

See [`docs/risk-algorithm.md`](./risk-algorithm.md) for detailed documentation.

**Summary**:
- **Low Risk (0-0.3)**: Consistent on-time payments
- **Medium Risk (0.3-0.7)**: Occasional delays
- **High Risk (0.7-1.0)**: Frequent late payments, high overdue amounts

## Testing

### Unit Tests
```bash
# Run AR logic tests
pnpm test lib/logic/ar.test.ts

# Run with coverage
pnpm test --coverage
```

### E2E Tests
```bash
# Run Playwright tests
pnpm test:e2e

# Run specific test
pnpm exec playwright test tests/e2e/ageing-report.spec.ts
```

See [`docs/ar-test-plan.md`](./ar-test-plan.md) for comprehensive test coverage.

## Troubleshooting

### Sync Job Failures

Check `/agents/ar/monitoring` for error details. Common issues:

- **Xero token expired**: Re-authorize Xero connection
- **Rate limit (429)**: Job will retry with backoff
- **Invalid data**: Check error logs for specific invoice/contact IDs

### Stale Data Warning

If data is >24 hours old:
1. Check job status in monitoring dashboard
2. Review error logs for last failed job
3. Manually trigger sync if needed

### Missing Customers in Report

Ensure:
- Customer has invoices in last 24 months
- Xero connection is active
- `syncXeroData()` completed successfully

## Performance Optimization

### Large Datasets (>1000 customers)

The ageing report uses client-side filtering. For very large datasets:

1. **Add Pagination**: Implement server-side pagination in `getAgeingReportData()`
2. **Virtual Scrolling**: Use `react-virtual` for table rendering
3. **Database Indexes**: Already optimized, but review for custom queries

### Cron Job Timeout

If sync takes >5 minutes (Vercel limit):
- Process users in batches
- Use background jobs via queue (e.g., BullMQ)
- Consider incremental sync for large tenants

## Contributing

When adding features to the A/R Agent:

1. Update schema if needed (`lib/db/schema/ar.ts`)
2. Add/modify logic (`lib/logic/ar.ts`)
3. Write unit tests (`lib/logic/ar.test.ts`)
4. Update UI components as needed
5. Document changes in this file
6. Add E2E tests for UI changes

## License

See main [LICENSE](../LICENSE) file.
