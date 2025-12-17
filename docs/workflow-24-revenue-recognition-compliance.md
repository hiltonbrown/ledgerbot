# Workflow 24: Advanced Revenue Recognition Compliance

## Overview

LedgerBot's advanced revenue recognition workflow monitors complex revenue arrangements per AASB 15, calculates compliant revenue recognition schedules for construction contracts, subscription models, and multi-element arrangements, maintains contract asset/liability balances, and generates detailed reconciliation working papers.

This workflow ensures AASB 15 compliance for complex revenue streams, eliminates manual tracking spreadsheets, maintains accurate contract balances, and provides audit-ready documentation of revenue recognition judgments and calculations.

## How It Works

1. **Contract Analysis**: Identifies performance obligations and transaction price allocation
2. **Schedule Calculation**: Computes revenue recognition timing based on contract terms
3. **Journal Generation**: Posts monthly revenue recognition and contract balance adjustments
4. **Reconciliation**: Maintains contract asset/liability schedules
5. **Disclosure Support**: Generates AASB 15 disclosure schedules for financial statements

## Prerequisites

- Active Xero connection
- Complex revenue contracts documented
- Performance obligation definitions
- Progress/milestone tracking data
- Accounting policy for revenue recognition

## Example Prompts

### Prompt 1: Construction Contract Revenue Recognition
```
We have a $2.4M construction contract (Project Skyline) spanning 18 months from
July 2024 to December 2025. Contract includes: (1) design phase $400k, (2) construction
$1.8M, (3) commissioning $200k. Design completed September 2024, construction 45%
complete at 31 December 2024, commissioning not yet started. Calculate revenue to
recognize for 6 months ended 31 December 2024 using percentage of completion method
based on costs incurred ($650k to date out of estimated total $1.95M). Post revenue
recognition journal and show contract asset/liability position.
```

### Prompt 2: SaaS Subscription Revenue
```
Our SaaS company has 450 customers on annual subscriptions ranging from $2,400 to
$36,000 per year, invoiced upfront. Analyze all active subscriptions as at 31 October
2024 and calculate: (1) revenue earned to date (pro-rata based on months elapsed),
(2) deferred revenue liability (unearned portion), (3) monthly revenue recognition
schedule for next 12 months. Post month-end revenue recognition journal for October
2024 and reconcile contract liability balance. Flag any contracts with unusual terms
requiring special treatment.
```

### Prompt 3: Multi-Element Arrangement
```
We sold a bundled package to ABC Corp for $180,000 including: (1) software license
(perpetual), (2) implementation services, (3) 12 months support and maintenance.
Standalone selling prices: software $100k, implementation $60k, support $30k per year.
Allocate transaction price to performance obligations using relative standalone selling
price method. Recognize revenue for software (point in time on delivery), implementation
(over time as services performed - currently 70% complete), and support (straight-line
over 12 months, 3 months elapsed). Calculate revenue recognized to date and remaining
contract liability.
```

### Prompt 4: Variable Consideration
```
We have a contract worth $500,000 base fee plus potential performance bonus of $100,000
if quality targets met. Based on historical experience and current project performance,
estimate 75% probability of earning the full bonus. Calculate transaction price
including variable consideration using expected value method. Apply constraint
(recognize only to extent highly probable). Determine revenue recognition pattern
(over time based on milestone completion: Milestone 1 complete, Milestone 2 80%
complete, Milestone 3 not started). Post appropriate revenue and contract asset/liability
entries.
```

### Prompt 5: AASB 15 Disclosure Schedule
```
Generate AASB 15 disclosure schedules for year ended 30 June 2025 showing: (1) revenue
disaggregation by type (construction, subscriptions, services), timing (point in time
vs over time), and customer sector, (2) contract balances (opening, movements, closing)
for contract assets and contract liabilities, (3) performance obligations (description,
when typically satisfied, significant payment terms), (4) transaction price allocated
to remaining performance obligations (unsatisfied/partially satisfied at year-end with
expected timing of recognition). Format for inclusion in financial statement notes.
```

## Tips and Best Practices

### AASB 15 Five-Step Model

**Step 1: Identify the Contract**
- Written, oral, or implied agreement
- Commercial substance
- Rights and payment terms identifiable
- Probable collection of consideration

**Step 2: Identify Performance Obligations**
- Promises to transfer goods/services that are distinct
- Distinct = customer can benefit + separately identifiable
- Series of distinct goods/services treated as single performance obligation if same pattern

**Step 3: Determine Transaction Price**
- Amount expected to receive (fixed + variable)
- Adjust for time value of money if significant financing component
- Consideration payable to customer reduces transaction price
- Non-cash consideration measured at fair value

**Step 4: Allocate Transaction Price**
- To each performance obligation based on relative standalone selling prices
- Observable prices preferred
- Estimate using adjusted market assessment, expected cost plus margin, or residual approach

**Step 5: Recognize Revenue**
- When (or as) performance obligation satisfied
- Over time if: customer receives/consumes benefit as performed, customer controls asset as created, or no alternative use + right to payment
- Point in time if not over time (control transfer indicators: legal title, physical possession, payment, risks/rewards)

### Common Revenue Models

**Construction Contracts:**
- Recognize over time (cost-to-cost or physical completion method)
- Contract assets when revenue > billings
- Contract liabilities when billings > revenue

**Subscription/SaaS:**
- Recognize straight-line over subscription period
- Upfront payments create contract liability
- Services delivered evenly over term

**Licensing:**
- Right to access (functional IP): over time
- Right to use (symbolic IP): point in time
- Evaluate nature of license granted

**Professional Services:**
- Time and materials: as services performed
- Fixed fee: over time as work completed (input or output method)

## Related Workflows

- **Workflow 14**: Revenue Recognition and Progress Billing (related to this workflow)
- **Workflow 21**: Financial Statement Preparation (AASB 15 disclosures)
- **Workflow 28**: Tax Provision (revenue timing differences)

## Technical Notes

This workflow integrates AASB 15 revenue recognition engine with contract tracking. The system monitors performance obligations and calculates appropriate revenue timing based on contract terms and progress data.
