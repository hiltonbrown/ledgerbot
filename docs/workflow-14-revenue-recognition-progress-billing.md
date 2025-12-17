# Workflow 14: Revenue Recognition and Progress Billing

## Overview

LedgerBot's revenue recognition and progress billing workflow monitors project progress against milestones, calculates work-in-progress (WIP) values, generates progress invoices based on completion percentages or time-and-materials data, and posts appropriate revenue recognition journals to match income with delivery periods.

This workflow ensures accurate financial reporting for project-based businesses, maintains compliance with accounting standards (AASB 15/IFRS 15), and improves cash flow through timely progress billing.

## How It Works

1. **Project Tracking**: LedgerBot monitors project progress, milestones, and completion percentages
2. **WIP Calculation**: Calculates work-in-progress asset values based on costs incurred vs. revenue recognized
3. **Progress Billing**: Generates invoices based on milestones achieved or percentage completion
4. **Revenue Recognition**: Posts journal entries to recognize revenue matching service delivery
5. **Financial Statement Accuracy**: Ensures P&L and balance sheet correctly reflect project economics

## Prerequisites

- Active Xero connection established
- Project tracking (Xero Projects or external system)
- Clear project milestones and deliverables
- Cost tracking by project/job
- Understanding of revenue recognition requirements for your business

## Step-by-Step Guide

### 1. Set Up Project Parameters

Define for each project:
- Total contract value
- Delivery milestones or completion stages
- Billing triggers
- Expected costs
- Timeline

### 2. Track Project Progress

Monitor and update:
- Percentage completion
- Costs incurred to date
- Milestones achieved
- Time spent (for time-and-materials projects)

### 3. Calculate WIP

LedgerBot calculates:
- Costs incurred to date
- Revenue recognized to date
- Revenue invoiced to date
- WIP asset balance (costs incurred > revenue recognized)
- Deferred revenue liability (invoiced > revenue recognized)

### 4. Generate Progress Invoice

When billing trigger reached:
- Create invoice for milestone or % completion
- Include appropriate narrative and documentation
- Send to customer

### 5. Post Revenue Recognition Journal

Match revenue to delivery:
- DR WIP / CR Revenue (recognize earned revenue)
- DR Accounts Receivable / CR Deferred Revenue (invoice customer)
- Ensure P&L reflects actual earned revenue

## Example Prompts

### Prompt 1: Percentage of Completion Revenue Recognition
```
We have a $180,000 consulting project that is 45% complete based on hours
worked (450 hours of estimated 1,000 hours). We've incurred $72,000 in costs
(mostly labor). Calculate: (1) revenue to recognize ($81,000 = 45% of $180k),
(2) gross profit to date ($9,000), (3) WIP balance if we've only invoiced
$54,000 so far. Post the revenue recognition journal and create the next
progress invoice for the work completed since last billing.
```

### Prompt 2: Milestone-Based Progress Billing
```
Our software development project has reached Milestone 3: "User Acceptance
Testing Complete." This milestone is worth 25% of the $240,000 contract
($60,000). We've already invoiced Milestones 1 and 2 (total $120,000). Create
a progress invoice for Milestone 3 ($60,000) and post the revenue recognition
journal. Show me updated WIP position and remaining contract value to invoice.
```

### Prompt 3: Time and Materials Project
```
Project "Website Redesign" is time-and-materials with rates: Senior Developer
$175/hr, Designer $150/hr, Junior Developer $95/hr. This month we worked:
Senior 32 hours, Designer 28 hours, Junior 45 hours. Calculate total billable
amount, create invoice, and recognize revenue. Also show our cost (assume
loaded labor costs are 55% of bill rates) and gross margin.
```

### Prompt 4: WIP Reconciliation
```
Reconcile our work-in-progress for all active projects as at 31 October 2024.
For each project show: (1) contract value, (2) costs incurred to date,
(3) revenue recognized to date, (4) amounts invoiced to date, (5) WIP asset
balance, (6) deferred revenue liability. Show total WIP for the balance sheet
and flag any projects with concerning metrics (costs exceed expected margins).
```

### Prompt 5: Revenue Recognition Catch-Up Journal
```
We completed Project "Office Fitout" last month (September) but forgot to
recognize the final 20% revenue ($45,000). We invoiced the customer in full
already ($225,000 total). Post the catch-up revenue recognition journal for
September to correctly reflect earned revenue in that period. Adjust WIP and
deferred revenue accounts accordingly.
```

## Tips and Best Practices

### Revenue Recognition Methods

**1. Percentage of Completion (POC)**
Recognize revenue proportional to work completed
- Best for: Long-term contracts with measurable progress
- Measure by: Hours worked, costs incurred, milestones achieved
- Formula: Revenue = Contract Value × % Complete

**2. Milestone Method**
Recognize revenue when specific milestones achieved
- Best for: Projects with distinct deliverables
- Recognize: Lump sum at each milestone
- Example: Design 30%, Build 50%, Deploy 20%

**3. Completed Contract**
Recognize all revenue when project fully complete
- Best for: Short-duration projects
- Simplest method
- Risk: Revenue lumpy, doesn't match P&L to work periods

**4. Time and Materials**
Recognize revenue as work is performed
- Best for: Hourly billing arrangements
- Revenue = Hours × Rate
- Recognize monthly based on timesheets

### Accounting Entries Explained

**When costs are incurred:**
```
DR Work in Progress (Asset) $10,000
CR Cash/Accounts Payable $10,000
(Record project costs as WIP asset)
```

**When revenue is earned (POC):**
```
DR Cost of Sales $10,000
CR Work in Progress $10,000
(Relieve WIP to cost of sales)

DR WIP $15,000
CR Revenue $15,000
(Recognize revenue earned)
Net effect: WIP increases by $5,000 (gross profit on work done)
```

**When customer is invoiced:**
```
DR Accounts Receivable $18,000
CR WIP $18,000
(Invoice customer for progress payment)
```

**When payment is received:**
```
DR Cash $18,000
CR Accounts Receivable $18,000
(Receive payment from customer)
```

### Measuring Percentage of Completion

**Cost-to-Cost Method:**
% Complete = Costs Incurred to Date / Total Expected Costs
- Reliable if cost estimates are accurate
- Common in construction and manufacturing

**Labor Hours Method:**
% Complete = Hours Worked to Date / Total Estimated Hours
- Good for service/consulting businesses
- Requires tracking time by project

**Units Delivered Method:**
% Complete = Units Delivered / Total Units in Contract
- Best for manufacturing or repetitive work
- Clear and objective measure

**Milestone Weights:**
Assign % complete to each milestone
- Useful when milestones represent clear progress
- Example: Design 25%, Build 60%, Deploy 15%

### WIP Balance Sheet Account

**WIP is an asset representing:**
- Costs incurred on incomplete projects
- Revenue earned but not yet invoiced

**Healthy WIP Characteristics:**
- Positive balance (costs + profit not yet invoiced)
- Regular turnover (projects complete and WIP clears)
- Matches expected project timelines

**Concerning WIP Issues:**
- Negative WIP (over-billing - creates deferred revenue liability)
- Growing WIP (projects not completing or not being invoiced)
- WIP with low gross margin (project in trouble)

### Progress Billing Best Practices

**Invoice Regularly:**
- Monthly progress invoicing maintains cash flow
- Don't wait until project complete

**Clear Documentation:**
```
Progress Invoice #3
Project: Office Fitout - Level 12
Period: 1-31 October 2024
Completion Status: 60% (Milestone: Electrical and Plumbing Complete)
Contract Value: $280,000
Amount Invoiced to Date: $168,000 (60%)
This Invoice: $56,000 (20% - October progress)
Remaining: $56,000 (20% - Final payment on completion)
```

**Align Billing with Recognition:**
Try to invoice close to when revenue is recognized
- Reduces WIP/deferred revenue balances
- Simpler accounting
- Better cash flow

**Customer Communication:**
Keep customer informed of progress
- Supports invoice with progress report
- Reduces payment disputes
- Builds trust

## Common Questions

**Q: What's the difference between WIP and deferred revenue?**
A: WIP is an asset (you've done work not yet invoiced). Deferred revenue is a liability (you've invoiced but not yet earned the revenue).

**Q: Do I need to use percentage of completion?**
A: Depends on contract length and materiality. Contracts spanning multiple reporting periods generally require POC for accurate financial reporting.

**Q: What if actual costs exceed estimated costs?**
A: You have an onerous contract. Recognize the full expected loss immediately, not gradually. This may require a provision on the balance sheet.

**Q: Can I recognize revenue faster than I invoice?**
A: Yes, creates a WIP asset. You've earned revenue but haven't invoiced yet. Common in POC method.

**Q: Can I invoice faster than I recognize revenue?**
A: Yes, creates deferred revenue liability. You've invoiced but haven't earned it yet. Common when customers pay deposits or upfront.

## Related Workflows

- **Workflow 12**: Automated Quote-to-Invoice Conversion (initiate billing process)
- **Workflow 8**: Month-End Procedures (WIP reconciliation as part of close)
- **Workflow 11**: Customer Profitability Analysis (project profitability)
- **Workflow 3**: Cash Flow Forecasting (include progress billing schedule)

## Advanced Usage

### Project Profitability Forecast
```
We're 40% through the "Factory Automation" project. Based on costs incurred
to date versus planned costs, forecast the final project profitability. Show
me: (1) original budget and margin, (2) current actual costs vs. budget,
(3) forecast costs to complete, (4) revised estimated final margin. If we're
tracking over budget, show the expected profit impact.
```

### Multi-Project WIP Dashboard
```
Create a WIP dashboard for all 12 active projects. For each project show:
contract value, costs to date, revenue recognized, revenue invoiced, WIP
balance, gross margin %, estimated completion date, project status (on track,
at risk, over budget). Total the WIP balance and highlight projects needing
attention.
```

### Revenue Forecast Based on Project Pipeline
```
Based on our current project pipeline and average completion rates, forecast
revenue for the next 6 months. We have: (1) 8 active projects at various
stages, (2) 5 signed contracts starting next month, (3) 3 quoted projects
likely to convert. Model revenue recognition timing based on typical project
duration and billing patterns.
```

### Earned Value Analysis
```
For the "ERP Implementation" project, perform earned value analysis. Compare:
(1) planned value (what we should have accomplished by now per schedule),
(2) earned value (what we've actually accomplished), (3) actual cost (what
we've spent). Calculate schedule variance, cost variance, and performance
indices. Are we ahead or behind schedule? Over or under budget?
```

### Retainer vs. Project Revenue Mix
```
We have revenue from: (1) monthly retainers (recognized evenly each month),
(2) time-and-materials projects (recognized as work performed), (3) fixed-price
projects (recognized via POC). Show me the revenue mix by type for the past
quarter. Which revenue streams are growing? Which are more profitable?
```

### Contract Revenue Waterfall
```
Create a revenue waterfall for the $500,000 "Digital Transformation" contract
spanning 12 months. Show month-by-month: (1) planned revenue recognition,
(2) planned billing schedule, (3) actual revenue recognized to date, (4) actual
billing to date, (5) variance analysis. Forecast remaining months based on
current progress rate.
```

## AASB 15 / IFRS 15 Compliance

Australian accounting standard AASB 15 (equivalent to IFRS 15) requires:

**Five-Step Model:**
1. **Identify the contract** with customer
2. **Identify performance obligations** (distinct goods/services)
3. **Determine transaction price** (total consideration)
4. **Allocate price** to performance obligations
5. **Recognize revenue** when/as obligation is satisfied

**For Project-Based Businesses:**
- Revenue recognized **over time** if customer controls asset as it's created OR customer receives/consumes benefit as work performed
- Otherwise, recognize **at point in time** when control transfers
- Progress billing aligns with over-time recognition

**Documentation Requirements:**
- Contract terms and pricing
- Performance obligations identified
- Method for measuring progress
- Judgment and estimates used

LedgerBot can help maintain compliant documentation and revenue recognition.

## Technical Notes

This workflow uses LedgerBot's project accounting capabilities with integration to Xero Projects (if available). The system performs complex WIP calculations and revenue recognition journal posting.

For technical implementation details, developers can refer to:
- `lib/ai/tools/xero-tools.ts` - Xero project and invoice tools
- `app/agents/analytics/` - Analytics agent for project profitability
- Revenue recognition logic based on accounting standards
- WIP calculations use double-entry accounting principles
