# A/R Agent Test Plan

## Overview
This document outlines the test strategy and coverage for the A/R Agent, including edge cases, backend logic validation, and end-to-end UI workflows.

## Edge Case Scenarios

### 1. Invoice with Credit Note Fully Offset
**Scenario**: An invoice has a credit note that fully offsets the amount owed.  
**Expected**: `amountOutstanding = 0`, invoice excluded from ageing report, no impact on risk score.  
**Test Type**: Unit test  
**Pass Criteria**: `calculateCustomerHistory` correctly excludes fully offset invoices from totals.

### 2. Partial Payments Applied
**Scenario**: An invoice has partial payments, leaving a remaining balance.  
**Expected**: `amountOutstanding > 0`, `daysOutstanding` correctly calculated from due date.  
**Test Type**: Unit test  
**Pass Criteria**: Ageing bucket calculation reflects partial payment status accurately.

### 3. Overpayment Scenario
**Scenario**: Payments exceed invoice total, resulting in negative outstanding.  
**Expected**: Invoice treated as fully paid (`amountOutstanding = 0`), excluded from risk calculations.  
**Test Type**: Unit test  
**Pass Criteria**: No negative values in ageing report; overpaid invoices don't inflate totals.

### 4. New Customer with Zero Paid Invoices
**Scenario**: Customer has only unpaid invoices, no payment history.  
**Expected**: `avgDaysLate = 0`, `lastPaymentDate = null`, risk score reflects lack of payment history.  
**Test Type**: Unit test  
**Pass Criteria**: Risk score defaults to medium-high (0.5-0.7) for new customers with no payment track record.

### 5. Xero API Pagination Errors
**Scenario**: Xero API returns 429 rate limit or partial results.  
**Expected**: Graceful error handling, retry logic, job marked as failed with error details.  
**Test Type**: Integration test (mocked API)  
**Pass Criteria**: Job run logs error, does not crash, retries with backoff.

### 6. Large Customer Base Performance
**Scenario**: Ageing report with > 10,000 customers.  
**Expected**: UI remains responsive, uses pagination or virtual scrolling.  
**Test Type**: Performance/E2E test  
**Pass Criteria**: Initial load < 3s, table renders smoothly, filtering works without lag.

## Backend Unit Tests

### Test Suite: `lib/logic/ar.test.ts`
- ✓ Ageing bucket calculation for various overdue periods
- ✓ Customer history aggregation
- ✓ Risk score calculation
- **New**: Credit note offset handling
- **New**: Partial payment scenarios
- **New**: Overpayment handling
- **New**: New customer default risk score

### Test Suite: `lib/ingestion/xero.test.ts`
- **New**: Mock Xero API responses
- **New**: Pagination handling
- **New**: Rate limit error handling
- **New**: Partial results scenario

## End-to-End UI Tests

### Test Suite: `tests/e2e/ageing-report.spec.ts`

#### Test 1: Load Ageing Report
**Steps**:
1. Navigate to `/agents/ar`
2. Wait for table to load

**Assertions**:
- Table displays customer rows
- Column headers present
- No error messages

#### Test 2: Filter by Risk Score
**Steps**:
1. Enter "0.5" in "Min Risk Score" filter
2. Verify filtered results

**Assertions**:
- Only customers with risk > 0.5 displayed
- Filter persists on interaction

#### Test 3: Open Customer Details
**Steps**:
1. Click on a customer row
2. Wait for sheet to open

**Assertions**:
- Sheet displays customer name
- Invoice list visible
- "Start Follow-Up Chat" button present

#### Test 4: Start Follow-Up Chat
**Steps**:
1. Open customer details
2. Click "Start Follow-Up Chat"
3. Wait for navigation

**Assertions**:
- Redirected to `/chat/new`
- URL contains `context=ar_followup`
- Chat session auto-sends prompt

## Performance Benchmarks

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Ageing report initial load | < 3s | Lighthouse/Playwright timing |
| Table render (1000 rows) | < 500ms | React profiler |
| Filter response time | < 200ms | User interaction timing |
| Modal open time | < 100ms | Animation duration |

## Test Data Setup

### Fixtures
- `fixtures/customers.json`: Sample customer data with varying histories
- `fixtures/invoices.json`: Mix of paid, unpaid, overdue, credit-noted invoices
- `fixtures/payments.json`: Full, partial, overpayment examples

### Database Seeding
- Seed script: `scripts/seed-ar-test-data.ts`
- Generates realistic AR data for local testing
- Supports large dataset generation for performance testing

## Continuous Integration

### Test Execution
- Unit tests: Run on every commit (`npm test`)
- E2E tests: Run on PRs and merges to main
- Performance tests: Run weekly or on demand

### Coverage Goals
- Unit test coverage: > 80%
- Critical path E2E coverage: 100%
- Edge case scenario coverage: All scenarios documented above
