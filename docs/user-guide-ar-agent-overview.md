# Accounts Receivable Agent - Complete User Guide

## Overview

The Accounts Receivable (AR) Agent at `/agents/ar` is LedgerBot's intelligent workspace for managing customer invoices, collections, and cash flow. It combines automated risk assessment, ageing analysis, and AI-powered follow-up communications to help you get paid faster while maintaining positive customer relationships.

**Access**: Navigate to **Agents → Accounts Receivable** from the main menu

## What the AR Agent Does

### Core Capabilities

1. **Invoice & Payment Tracking**
   - Sync customer invoices from Xero
   - Track payment history and patterns
   - Monitor outstanding balances in real-time
   - Handle credit notes, overpayments, and prepayments

2. **Risk Assessment**
   - Automatic customer risk scoring (0-1 scale)
   - 7-factor algorithm analyzing payment behavior
   - Risk-based customer categorization
   - Early warning system for credit issues

3. **Ageing Analysis**
   - 5-bucket ageing report (Current, 1-30, 31-60, 61-90, 90+ days)
   - Visual ageing charts
   - Customer-by-customer breakdown
   - Trend analysis over time

4. **Collection Management**
   - AI-powered follow-up message generation
   - Tone-appropriate communications (polite, firm, final)
   - Customer payment history context
   - Relationship-preserving collection strategies

5. **Cash Flow Visibility**
   - Days Receivable Outstanding (DRO) tracking
   - Total outstanding amounts
   - Overdue invoice monitoring
   - Payment trend analysis

6. **Intelligent Filtering**
   - High-risk customer identification
   - 90+ days overdue focus
   - Search and sort capabilities
   - Priority action lists

---

## Page Layout and Components

### 1. KPI Dashboard (Top Section)

Three key performance indicators displayed prominently:

**Total Outstanding**
- Total amount owed by all customers
- Overdue amount highlighted in red
- Updated in real-time from Xero sync

**Active Debtors**
- Number of customers who currently owe you money
- Count of overdue invoices
- Quick indicator of customer base health

**Days Receivable Outstanding (DRO)**
- Average number of days to collect payment
- Cash flow efficiency metric
- Industry benchmark comparison

**Formula**: DRO = (Average Accounts Receivable / Revenue) × Number of Days

**What this tells you**: At a glance, see how much is owed, how many customers owe money, and how long it takes to collect.

---

### 2. Ageing Chart (Visual Analysis)

**What it shows**: Bar chart breaking down outstanding amounts by age bracket

**5 Ageing Buckets**:
- **Current**: Not yet due (0 days past due date)
- **1-30 Days**: Slightly overdue (1-30 days past due)
- **31-60 Days**: Moderately overdue (31-60 days past due)
- **61-90 Days**: Seriously overdue (61-90 days past due)
- **90+ Days**: Critically overdue (over 90 days past due)

**How to use it**:
- Identify where collection efforts are needed most
- Track improvement as older debts are collected
- Spot trends in payment behavior
- Prioritize collection focus

**Healthy pattern**: Most outstanding in Current, minimal in 90+
**Warning pattern**: Growing 90+ bucket, shrinking Current

---

### 3. Filter Tabs

Three filter views to focus on specific customer segments:

**All**
- Complete list of all customers with outstanding invoices
- Default view on page load
- Sorted by Total Outstanding (highest first)

**High Risk**
- Customers with risk score > 0.7 (70%)
- Automatic flagging based on payment behavior
- Priority collection focus
- Requires immediate attention

**90+ Days**
- Customers with invoices overdue 90+ days
- Critical collection priority
- Relationship at risk
- May require escalation or legal action

**Count badges**: Each tab shows the number of customers in that category.

---

### 4. Customer Table

Main data table with sortable columns:

| Column | Description | How to Use |
|--------|-------------|------------|
| **Customer** | Business/person name | Click to view full details |
| **Email** | Contact email | Quick reference for communication |
| **Total Outstanding** | Total amount owed | Sort to prioritize large balances |
| **Current** | Amount not yet due | Healthy outstanding |
| **1-30 Days** | Amount 1-30 days overdue | Early follow-up needed |
| **31-60 Days** | Amount 31-60 days overdue | Firm follow-up required |
| **61-90 Days** | Amount 61-90 days overdue | Serious attention needed |
| **90+ Days** | Amount 90+ days overdue | Critical/escalation required |
| **Risk Score** | 0-1 risk rating | 0=low, 0.7+=high risk |
| **Actions** | Quick action buttons | View details, start follow-up |

**Interactive features**:
- **Click customer row**: Opens detailed customer panel
- **Sort columns**: Click column header to sort ascending/descending
- **Search**: Filter by customer name
- **Risk badges**: Color-coded (green=low <0.3, yellow=medium 0.3-0.7, red=high >0.7)

---

### 5. Action Buttons (Top Right)

**Sync from Xero**
- Fetches latest invoices, payments, and customer data
- Updates risk scores and ageing buckets
- Shows sync timestamp and status
- **When to use**: Daily or before collection activities

**Stale Data Warning**
- Appears if data hasn't been synced in 24+ hours
- Reminds you to sync for accurate information
- Dismissible banner

---

## How the AR Agent Provides Information

### Data Sources

The AR Agent integrates data from multiple sources:

1. **Xero Integration**
   - Customer contact records
   - ACCREC invoices (sales invoices)
   - Payment records
   - Credit notes
   - Overpayments and prepayments
   - Invoice due dates and terms

2. **LedgerBot Database**
   - Customer payment history (24 months)
   - Risk score calculations
   - Ageing bucket assignments
   - Follow-up communications
   - Customer notes and annotations

3. **Real-Time Calculations**
   - Days overdue for each invoice
   - Ageing bucket assignment
   - Risk score computation
   - DRO and KPI metrics

### Automated Processing

#### Xero Sync Process

When you click "Sync from Xero":

1. **Fetch Invoices**: Retrieves all ACCREC invoices from last 24 months
2. **Fetch Payments**: Gets all payment records linked to invoices
3. **Fetch Contacts**: Updates customer contact information
4. **Fetch Credits**: Syncs credit notes, overpayments, prepayments
5. **Calculate Ageing**: Assigns each invoice to ageing bucket
6. **Compute Risk**: Runs risk algorithm for each customer
7. **Update KPIs**: Calculates Total Outstanding, DRO, counts
8. **Store Results**: Saves to LedgerBot database for fast access

**Sync Summary Example**:
```
✓ Sync completed successfully
  - 127 invoices synced
  - 45 customers updated
  - 23 payments processed
  - 3 credit notes synced
  - Last updated: 2025-02-15 09:30 AM
```

**Sync Frequency Recommendations**:
- **Daily**: For active collection management
- **Weekly**: For low-volume businesses
- **Before collection activities**: Always sync before follow-ups
- **After Xero changes**: If you've updated invoices/payments in Xero

---

#### Ageing Bucket Calculation

Each invoice is assigned to one bucket based on days overdue:

**Calculation Logic**:
```
Days Overdue = Today - Invoice Due Date

If Days Overdue <= 0:        → Current (not yet due)
If Days Overdue 1-30:        → 1-30 Days
If Days Overdue 31-60:       → 31-60 Days
If Days Overdue 61-90:       → 61-90 Days
If Days Overdue > 90:        → 90+ Days
```

**Example**:
```
Invoice #INV-001
- Due Date: 2025-01-15
- Today: 2025-02-15
- Days Overdue: 31 days
- Bucket: 31-60 Days
```

**Customer Total by Bucket**: Sum of all customer's invoices in each bucket

---

#### Risk Scoring Algorithm

Every customer receives a risk score from 0.0 (low risk) to 1.0 (high risk) based on 7 weighted factors:

**Risk Factors & Weights**:

| Factor | Weight | What It Measures | How It's Calculated |
|--------|--------|------------------|---------------------|
| **Late Payment Rate** | 30% | Frequency of late payments | `late_payments / total_invoices` |
| **Avg Days Late** | 20% | Average delay on late payments | `min(avg_days_late, 90) / 90` (capped at 90) |
| **Max Days Late** | 10% | Worst-case payment delay | `min(max_days_late, 120) / 120` (capped at 120) |
| **% Invoices 90+** | 20% | Proportion in 90+ bucket | `percent_90_plus / 100` |
| **Credit Terms** | 5% | Risk from payment terms | <14 days: 1.0, 14-30: 0.5, >30: 0.0 |
| **Days Since Last Payment** | 5% | Payment recency | `min(days_since_last, 60) / 60` (capped at 60) |
| **Outstanding Ratio** | 10% | Current debt vs. annual billing | `min(outstanding / billed_12m, 1.0)` |

**Risk Score Interpretation**:
- **0.0 - 0.3**: Low Risk (green) - Reliable payer, minimal concern
- **0.3 - 0.7**: Medium Risk (yellow) - Monitor, may need reminders
- **0.7 - 1.0**: High Risk (red) - Serious concern, immediate action

---

**Example Calculation**:

**Customer: ABC Plumbing Pty Ltd**
- 12 invoices in last 24 months
- 4 late payments
- Average 18 days late (when late)
- Max 55 days late
- 1 invoice in 90+ bucket (8.3%)
- Payment terms: 30 days
- Last payment: 12 days ago
- Outstanding: $3,500
- Billed last 12m: $25,000

**Scoring**:
1. Late Payment Rate: 4/12 = 0.33 × 0.30 = **0.099**
2. Avg Days Late: 18/90 = 0.20 × 0.20 = **0.040**
3. Max Days Late: 55/120 = 0.458 × 0.10 = **0.046**
4. % 90+ Invoices: 8.3% = 0.083 × 0.20 = **0.017**
5. Credit Terms: 30 days = 0.5 × 0.05 = **0.025**
6. Days Since Last: 12/60 = 0.20 × 0.05 = **0.010**
7. Outstanding Ratio: 3500/25000 = 0.14 × 0.10 = **0.014**

**Total Risk Score**: 0.099 + 0.040 + 0.046 + 0.017 + 0.025 + 0.010 + 0.014 = **0.251**

**Result**: 0.25 = Low-Medium Risk (green/yellow border)

---

### Customer Details Panel

Click any customer in the table to open detailed side panel:

**Information Displayed**:

1. **Customer Header**
   - Name and contact details
   - Total outstanding amount
   - Risk score with visual indicator
   - Risk level badge (Low/Medium/High)

2. **Invoice List**
   - All outstanding invoices
   - Invoice number, date, due date
   - Amount and amount outstanding
   - Days overdue
   - Ageing bucket assignment
   - Status (awaiting payment, partially paid, overdue)

3. **Payment History**
   - Recent payments
   - Payment dates and amounts
   - Payment patterns and trends
   - Average days to pay

4. **Credit Summary**
   - Available credit notes
   - Overpayments that can be allocated
   - Prepayments on account

5. **Risk Details**
   - Breakdown of risk factors
   - Which factors contribute most
   - Recommendations for management

6. **Suggested Actions**
   - Recommended communication tone
   - Suggested follow-up type (email, phone, SMS)
   - Escalation recommendations
   - Next steps

**Quick Actions**:
- **Start Follow-Up**: Launch AI-powered follow-up chat
- **Send Email**: Generate collection email draft
- **Call Customer**: Display phone number for quick call
- **Add Note**: Record conversation or reminder

---

## Follow-Up & Collection Process

### AI-Powered Follow-Up

The AR Agent helps you craft appropriate follow-up communications based on customer risk and relationship.

#### Follow-Up Tone Selection

**Three tone levels**, automatically suggested based on situation:

**1. Polite (Friendly Reminder)**
**When to use**:
- First reminder after due date
- Good payment history (low risk score)
- Invoice 1-30 days overdue
- Valued, long-term customer

**Tone characteristics**:
- Friendly and understanding
- Assumes oversight or timing issue
- Gentle reminder approach
- Maintains positive relationship

**Example opening**:
> "I hope this email finds you well. This is a friendly reminder that Invoice #INV-2025-042 for $1,250.00, which was due on 15 January, remains outstanding. We understand that sometimes invoices can be overlooked in the busy day-to-day..."

---

**2. Firm (Direct Follow-Up)**
**When to use**:
- Second or third reminder
- Invoice 31-60 days overdue
- Medium risk score (0.3-0.7)
- Previous polite reminders sent

**Tone characteristics**:
- Professional but direct
- Clear expectation of payment
- Mentions consequences of non-payment
- Still respectful

**Example opening**:
> "This is an important notice regarding overdue Invoice #INV-2025-042 for $1,250.00, which was due on 15 January and is now 45 days overdue. We require immediate payment to avoid further action..."

---

**3. Final (Last Notice)**
**When to use**:
- Invoice 60+ days overdue
- High risk score (>0.7)
- Multiple previous reminders ignored
- Escalation imminent

**Tone characteristics**:
- Serious and formal
- Clear consequences stated
- Legal language if appropriate
- Final opportunity before escalation

**Example opening**:
> "FINAL NOTICE: This is a formal demand for payment of Invoice #INV-2025-042 for $1,250.00, now 75 days overdue. If full payment is not received within 7 days, we will be forced to escalate this matter to our collection agency/legal team..."

---

#### Follow-Up Workflow

**Step 1: Select Customer**
- From ageing report table
- Click customer name or "Start Follow-Up" button
- Customer details panel opens

**Step 2: Review Context**
- AI analyzes:
  - Outstanding invoice details
  - Payment history and patterns
  - Risk score
  - Previous follow-up history
  - Relationship value

**Step 3: Choose Tone**
- System suggests appropriate tone
- You can override if needed
- Select: Polite, Firm, or Final

**Step 4: Generate Draft**
- AI creates contextual follow-up message
- Includes:
  - Personalized greeting
  - Invoice details (number, amount, due date, days overdue)
  - Payment instructions
  - Your contact information
  - Professional sign-off

**Step 5: Review & Customize**
- Review AI-generated draft
- Edit as needed for personal touch
- Add customer-specific details
- Adjust tone if necessary

**Step 6: Send or Schedule**
- Copy to email client and send
- Save draft for later review
- Schedule reminder for follow-up

**Important**: The AR Agent **generates drafts only**. It **does not send emails** automatically. You always review and send via your email client.

---

### Dunning Sequence Example

**Recommended collection sequence for typical customer**:

**Day 0 (Due Date)**
- Invoice sent, payment expected

**Day 7 (+7 days)**
- **Action**: Polite reminder email
- **Content**: "Friendly reminder, in case invoice was overlooked"
- **Tone**: Polite
- **Goal**: Prompt payment without damaging relationship

**Day 21 (+21 days)**
- **Action**: Firm follow-up email + phone call
- **Content**: "Payment now overdue, requesting immediate attention"
- **Tone**: Firm
- **Goal**: Escalate urgency, understand any payment issues

**Day 45 (+45 days)**
- **Action**: Final notice email + phone call
- **Content**: "Final notice before escalation, serious consequences stated"
- **Tone**: Final
- **Goal**: Last opportunity before collections/legal

**Day 60 (+60 days)**
- **Action**: Escalation
- **Options**: Collections agency, legal action, suspend credit
- **Tone**: Formal/legal

**Note**: Adjust timing based on:
- Customer payment history (good payers get more grace)
- Invoice amount (larger amounts = more aggressive)
- Customer value (high-value customers handled carefully)
- Industry norms (some industries pay slower)

---

## Credit Notes, Overpayments, Prepayments

### Credit Notes

**What they are**: Credits issued to customers for returns, refunds, or adjustments

**How they work**:
- Reduce customer's outstanding balance
- Can be allocated to specific invoices or left unallocated
- Synced automatically from Xero

**Display**:
- Shown in customer details panel
- **Unallocated credits**: Available for future use, displayed separately
- **Allocated credits**: Already applied to invoices, reflected in invoice balance

**Important**: Allocated credits are already factored into "Total Outstanding" - they've reduced the invoice amounts owed. Unallocated credits are shown for information but **not subtracted** from Total Outstanding until allocated in Xero.

---

### Overpayments

**What they are**: When customer pays more than invoice amount

**Common causes**:
- Customer error (typo in payment amount)
- Payment from customer doesn't specify invoice
- Exchange rate differences (foreign currency)

**How they're handled**:
- Stored as credit on customer account
- Can be allocated to future invoices
- Can be refunded to customer
- Shown in customer details panel

---

### Prepayments

**What they are**: Payments received before invoice is issued

**Common causes**:
- Deposit or down payment
- Retainer for ongoing services
- Advance payment for large order

**How they're handled**:
- Held on customer account
- Allocated when invoices are issued
- Reduce invoice amounts owed
- Shown in customer details panel

---

## Working with Xero

### Xero Sync Details

**What gets synced from Xero**:
- All ACCREC invoices (customer invoices) from last 24 months
- Invoice status (draft, awaiting payment, paid, voided)
- Payment records linked to invoices
- Customer contact details
- Credit notes (authorised and paid)
- Overpayments
- Prepayments
- Invoice due dates and payment terms

**What doesn't sync**:
- Draft invoices (not yet sent to customer)
- Voided invoices (cancelled)
- Quotes or estimates
- Invoices older than 24 months (unless still outstanding)

**Sync behavior**:
- **Initial sync**: Fetches all historical data (can take 1-2 minutes)
- **Subsequent syncs**: Updates changed records only (30-60 seconds)
- **Incremental**: Only processes new/changed data
- **Idempotent**: Safe to run multiple times

---

### Data Freshness

**Sync timestamp**: Displayed at top of page ("Last updated: ...")

**Stale data warning**: Appears if data is >24 hours old
- Banner notification
- Recommendation to sync before collection activities
- Dismissible, but reappears until synced

**Why sync matters**:
- Customers may have paid since last sync
- Avoid embarrassing follow-ups on paid invoices
- Risk scores update based on recent payments
- Accurate ageing buckets

---

### Xero-Specific Features

When connected to Xero, the AR Agent:

**Read Operations**:
- Fetch all customer invoices (ACCREC type)
- Get invoice payment history
- Retrieve customer contact details
- Access credit notes, overpayments, prepayments

**Data Enrichment**:
- Combines Xero invoice data with LedgerBot risk intelligence
- Adds ageing analysis not available in Xero
- Provides risk scores beyond Xero reporting
- Historical payment pattern analysis

**Note**: The AR Agent is currently **read-only** for Xero. It syncs data but doesn't write back to Xero. Follow-up emails are drafts that you send manually.

---

## Data Models and Structure

### Customer (ArContact)

**Stored Information**:
- Name, email, phone
- Xero contact ID (external reference)
- Created/updated timestamps

**Calculated Stats** (from ArCustomerHistory):
- Number of invoices (24 month period)
- Number of late payments
- Average days late
- Maximum days late
- Percent invoices in 90+ bucket
- Total outstanding
- Total billed last 12 months
- Last payment date
- Credit terms (days)
- Risk score (0-1)

---

### Invoice (ArInvoice)

**Core Fields**:
- Invoice number, issue date, due date
- Subtotal, tax, total amount
- Amount paid (for partially paid)
- Amount outstanding (current balance owed)
- Credit note amount applied
- Status (awaiting_payment, paid, partially_paid, overdue)
- Ageing bucket assignment
- Xero invoice ID

---

### Payment (ArPayment)

**Payment Data**:
- Amount paid
- Payment date
- Payment method
- Reference/transaction ID
- Xero payment ID
- Link to invoice

---

### Customer History (ArCustomerHistory)

**Analytics Data** (24-month rolling window):
- Number of invoices
- Late payment statistics
- Days late metrics
- Outstanding amounts
- Billing totals
- Risk score
- Computed timestamp

---

## Performance Metrics & KPIs

### Days Receivable Outstanding (DRO)

**Formula**: `DRO = (Average AR / Revenue) × Days in Period`

**Simplified calculation**: `(Total Outstanding / Daily Revenue) = Days to collect`

**What it means**:
- **30 DRO**: Average 30 days to collect payment
- **45 DRO**: Average 45 days to collect
- **60+ DRO**: Slow collection, cash flow concern

**Industry benchmarks**:
- **Net 30 terms**: DRO should be 30-40 days
- **Net 60 terms**: DRO should be 60-70 days
- **Higher DRO**: Collection issues, slow payers
- **Lower DRO**: Efficient collection, good cash flow

**How to improve**:
- Shorter payment terms
- More aggressive follow-up
- Early payment discounts
- Automated reminders
- Credit checks on new customers

---

### Ageing Distribution

**Healthy distribution**:
- **Current**: 70-80% of total outstanding
- **1-30 Days**: 10-15%
- **31-60 Days**: 5-10%
- **61-90 Days**: 2-5%
- **90+ Days**: <2%

**Warning signs**:
- **90+ growing**: Collection problems
- **Current shrinking**: Payment delays worsening
- **Even distribution**: No collection priority/system

---

### Collection Effectiveness Index (CEI)

**Formula**: `(Beginning AR + Sales - Ending AR) / (Beginning AR + Sales - Ending Current AR) × 100`

**What it measures**: How effectively you collect owed money

**Benchmark**:
- **80-100%**: Excellent collection
- **60-80%**: Good collection
- **<60%**: Poor collection, needs improvement

---

## Best Practices

### Daily Operations

**Morning Routine** (5 minutes):
1. Open AR Agent
2. Click "Sync from Xero"
3. Review KPI dashboard for changes
4. Check "High Risk" filter for new flags
5. Check "90+ Days" filter for escalations

**Invoice Review** (as customers pay):
1. Sync after payments processed in Xero
2. Verify payment applied correctly
3. Update risk scores automatically
4. Remove from ageing if fully paid

---

### Weekly Collection Activities

**Monday** (30 minutes):
- Full sync from Xero
- Review ageing report
- Identify customers for follow-up
- Prioritize based on:
  - Amount owed (largest first)
  - Days overdue (oldest first)
  - Risk score (highest first)
  - Relationship value (preserve key customers)

**Wednesday** (45-60 minutes):
- Generate follow-up emails for overdue customers
- Use appropriate tone (polite → firm → final)
- Send emails in batches
- Log actions in notes

**Friday** (15 minutes):
- Review responses and payments received
- Update customer statuses
- Plan next week's actions
- Sync final time for weekend

---

### Monthly Review

**First Monday of Month** (1 hour):
1. **Full sync and reconciliation**
2. **Review metrics**:
   - DRO trend (improving or worsening?)
   - Total outstanding vs. last month
   - Ageing distribution changes
   - High-risk customer count
3. **Customer review**:
   - Update risk assessments
   - Identify customers needing credit review
   - Flag customers for account restrictions
4. **Process review**:
   - Are follow-ups effective?
   - Do templates need updating?
   - Are payment terms appropriate?
   - Should we offer early payment discounts?

---

### Risk Management

**Credit Decisions**:
- **Low risk (<0.3)**: Standard terms, no restrictions
- **Medium risk (0.3-0.7)**: Monitor, consider COD for large orders
- **High risk (>0.7)**: Restrict credit, require prepayment

**Proactive Actions**:
- Set credit limits based on risk score
- Require deposits from high-risk customers
- More frequent follow-ups for medium/high risk
- Escalate high-risk overdue invoices quickly

**Warning Signs**:
- Risk score increasing over time
- Payment delays getting longer
- Avoiding communication
- Making partial payments
- Requesting extended terms frequently

---

## Troubleshooting

### Common Issues

**"Sync from Xero failed"**
- **Cause**: Xero connection expired, network issue, API rate limit
- **Solution**:
  - Reconnect Xero (Settings → Integrations)
  - Wait 1 minute if rate limited
  - Check internet connection
  - Try again

**"Customer showing incorrect balance"**
- **Cause**: Xero data not synced, recent payment not reflected
- **Solution**:
  - Sync from Xero to get latest data
  - Check payment applied correctly in Xero
  - Verify credit notes allocated properly

**"Risk score seems wrong"**
- **Cause**: Insufficient payment history, recent behavior change, calculation based on old data
- **Solution**:
  - Sync from Xero for latest payments
  - Review risk factor breakdown in customer details
  - New customers may have inflated scores (limited history)
  - Score updates after each sync

**"90+ Days bucket has paid invoices"**
- **Cause**: Xero not synced since payment received
- **Solution**: Sync from Xero to update

**"Customer not appearing in report"**
- **Cause**: No outstanding balance, filtered out, wrong date range
- **Solution**:
  - Check "All" filter active
  - Search by customer name
  - Verify customer has outstanding invoices in Xero

---

## Advanced Features

### Search and Filtering

**Search bar**:
- Filters by customer name
- Real-time as you type
- Case-insensitive
- Partial matches

**Combining filters**:
- Use filter tabs + search together
- Example: "High Risk" tab + search "Plumbing" = high-risk plumbing customers

**Sorting**:
- Click any column header to sort
- Click again to reverse sort
- Multi-column sorting: Shift+Click (if available)

---

### Custom Notes

**Adding notes to customers** (in customer details panel):
- Record phone call outcomes
- Document payment plans
- Note customer situations
- Set reminders for follow-up

**Note visibility**:
- Private: Only you see
- Shared: Team members see (if multi-user)

---

### Export and Reporting

**Export ageing report**:
- CSV format
- For Excel analysis
- For accountant review
- For board reports

**What's included**:
- All table columns
- Current ageing snapshot
- Risk scores
- Contact details

---

## Security and Compliance

### Data Protection

**Encrypted Storage**:
- Customer contact details encrypted
- Xero access tokens encrypted (AES-256-GCM)
- Payment history secured

**Access Control**:
- User-specific data isolation
- No cross-user visibility
- Xero connection per-user

**Audit Trail**:
- Sync history tracked
- Follow-up communications logged
- Risk score calculation history
- Action timestamps

---

### Privacy

**Customer data handling**:
- Synced from Xero under your existing agreement
- Stored securely in LedgerBot database
- Never shared with third parties
- Used only for your account management

**Email drafts**:
- Generated locally
- Not sent by LedgerBot
- You control all customer communication

---

## Related Documentation

- [Simple AR Agent Guide](./user-guide-ar-agent-simple.md) - Quick start workflow guide
- [Risk Algorithm Documentation](./risk-algorithm.md) - Detailed risk scoring explanation
- [AR Agent Architecture](./AR_AGENT.md) - Technical implementation details
- [CLAUDE.md](../CLAUDE.md) - System architecture reference

---

**Last Updated**: December 2025
**Version**: 1.0
**Agent Location**: `/agents/ar`
