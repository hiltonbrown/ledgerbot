# Workflow 22: Tax Planning and Optimisation Analysis

## Overview

LedgerBot's tax planning and optimisation workflow continuously monitors client financial positions throughout the year, identifies tax planning opportunities (prepayment strategies, asset write-offs, Division 7A issues, trust distribution scenarios), models different tax outcomes based on various strategies, and generates recommendations with projected tax savings for client discussion well before year-end.

This workflow shifts tax advice from reactive (year-end rush) to proactive (year-round planning), maximizes legitimate tax minimization opportunities, identifies risks before they crystallize, and provides clients with actionable strategies backed by quantified tax impact analysis.

## How It Works

1. **Continuous Monitoring**: LedgerBot tracks client financial position throughout the year
2. **Opportunity Identification**: Flags tax planning opportunities based on entity structure and transactions
3. **Strategy Modeling**: Calculates tax outcomes for different planning scenarios
4. **Risk Detection**: Identifies potential tax risks (Division 7A, FBT, CGT events)
5. **Recommendation Generation**: Produces client-ready tax planning advice with quantified savings

## Prerequisites

- Active Xero connection for client entity
- Entity structure understood (company, trust, individual, group)
- Current and prior year tax returns
- Knowledge of client's circumstances (other income, investments, plans)

## Step-by-Step Guide

### 1. Establish Tax Planning Profile

Document for each client:
- Entity structure and ownership
- Tax rates applicable (corporate, individual marginal rates)
- Business structure objectives
- Related entities and shareholders/beneficiaries
- Planned major transactions or events

### 2. Monitor Year-Round

Regular checkpoints (quarterly or mid-year):
- Review profit trajectory vs budget
- Identify emerging tax planning opportunities
- Flag compliance risks early
- Model scenarios before year-end

### 3. Generate Tax Planning Report

Before year-end (typically September for June balancers):
- Projected taxable income
- Effective tax rate forecast
- Identified planning opportunities with quantified savings
- Risk areas requiring action
- Recommended strategies with implementation steps

### 4. Client Discussion

Present recommendations:
- Explain strategies in plain language
- Quantify tax savings for each option
- Discuss cash flow and commercial implications
- Obtain instructions on which strategies to implement

### 5. Implementation and Documentation

Execute approved strategies:
- Process required transactions before year-end
- Document commercial rationale
- Ensure contemporaneous evidence
- Update tax planning file

## Example Prompts

### Prompt 1: Comprehensive Year-End Tax Planning
```
Generate year-end tax planning report for ABC Pty Ltd (June 2025 year-end, currently
September 2024). Based on YTD results, project taxable income for the year. Identify
planning opportunities including: (1) prepayment of deductible expenses (repairs,
insurance, subscriptions), (2) accelerated asset write-offs (small business instant
asset write-off, general depreciation pool), (3) bad debt write-offs, (4) timing of
revenue recognition if defensible, (5) provision accruals (employee bonuses, warranty
costs). Model tax impact of each strategy and recommend optimal combination to minimize
tax while maintaining commercial substance.
```

### Prompt 2: Trust Distribution Planning
```
The Smith Family Trust has projected net income of $385,000 for year ending 30 June
2025. Beneficiaries include: Father (marginal rate 47%), Mother (marginal rate 37%),
Adult Child 1 (marginal rate 32.5%), Adult Child 2 (marginal rate 19%), Smith Holdings
Pty Ltd (corporate beneficiary, 25% rate). Model optimal distribution strategy to
minimize overall tax paid by the group. Consider: (1) franking credits if corporate
distributions later, (2) beneficiary personal tax positions, (3) leaving income in
trust (taxed at top rate), (4) Division 7A implications if beneficiaries are
shareholders of Smith Holdings. Recommend distribution resolution wording.
```

### Prompt 3: Division 7A Compliance Review
```
Review all transactions for Johnson Enterprises Pty Ltd for FY2024. Identify potential
Division 7A issues: (1) loans to shareholders or associates, (2) payments or benefits
to shareholders (private use of assets, expense reimbursements, forgiven debts),
(3) trust distributions to corporate beneficiary not paid (UPE). For each issue,
calculate deemed dividend consequences and suggest remediation: complying loan agreements,
Division 7A payments before lodgment day, UPE sub-trust arrangements. Quantify tax
cost if not rectified versus compliance cost.
```

### Prompt 4: Capital Gains Tax Planning
```
Client is planning to sell commercial property (purchased 15 years ago for $850k,
current market value $2.4M). Held in personal name, used in business operated through
company. Analyze CGT implications and planning opportunities: (1) calculate capital
gain and tax (50% discount, marginal rate 47%), (2) model impact of selling in current
year vs next year (income levels different), (3) consider small business CGT concessions
(15-year exemption, 50% active asset reduction, retirement exemption, rollover),
(4) structure considerations (should business assets move to  personal name first?).
Recommend optimal strategy with tax cost comparison.
```

### Prompt 5: Small Business Entity Concessions Eligibility
```
Analyze whether Tech Startup Pty Ltd qualifies as a small business entity (SBE) for
FY2025. Check: (1) aggregated turnover test (<$10M from 2024, <$50M for some concessions),
(2) identify connected entities and affiliates requiring aggregation, (3) calculate
aggregated turnover including all required entities. If eligible, identify available
concessions: instant asset write-off, simplified depreciation pool, prepayment
deductions, FBT exemptions (car parking, portable devices), CGT concessions. Quantify
value of eligibility and flag any transactions that could jeopardize SBE status.
```

## Tips and Best Practices

### Tax Planning Calendar

**July-September (Q1):**
- Review prior year tax return and outcomes
- Establish profit forecast for current year
- Identify early planning opportunities
- Check compliance issues from prior year are resolved

**October-December (Q2):**
- Mid-year tax position review
- Preliminary distribution planning (trusts)
- Major transaction advisory (if planned)
- Superannuation contribution planning

**January-March (Q3):**
- Updated profit forecast
- CGT event planning (if applicable)
- Final quarter planning opportunities
- Trust distribution draft resolutions

**April-June (Q4):**
- Final year-end tax planning
- Execute prepayments and write-offs
- Finalize trust distributions (before 30 June)
- Document all tax planning strategies

### Common Tax Planning Strategies

**Prepayment of Deductible Expenses:**
```
Client projected profit: $450,000
Corporate tax rate: 25%
Available prepayments: Insurance $18,000, software subscriptions $12,000, rent $25,000
Total prepayment opportunity: $55,000
Tax saved by prepaying before year-end: $55,000 × 25% = $13,750

Commercial consideration: Cash flow impact, already planned expenses?
Risk: "Prepayment rules" - must be < 12 months benefit and paid, not just accrued
```

**Instant Asset Write-Off:**
```
Small business entity (turnover <$10M) purchasing equipment:
Asset cost: $85,000 (eligible for instant write-off if <threshold)
Current threshold: Check ATO website for current year
Tax saving if deductible: $85,000 × 25% = $21,250

Timing: Must be installed ready for use before 30 June
Consider: Defer purchase to next year if already profitable? Or bring forward if loss year?
```

**Bad Debt Write-Off:**
```
Aged receivables >12 months overdue: $45,000
Previously included in income (accrual basis)
Write-off criteria: genuinely unrecoverable, debt recovery actions taken
Tax benefit: $45,000 × 25% = $11,250

Documentation required: evidence of recovery attempts, decision to write-off before year-end
```

**Bonus Accrual (Employee Bonuses):**
```
Accrue $80,000 in employee bonuses for performance year ended 30 June 2025
Deductible if: paid within 14 days of year-end for company, or included in PAYG payment summary
Tax saving: $80,000 × 25% = $20,000

Requirements: genuine liability at year-end, based on measurable performance criteria
Risk: ATO may challenge if not paid promptly or lacks commercial basis
```

### Trust Distribution Planning

**Tax Rate Arbitrage:**
```
Trust net income: $300,000

Scenario 1: Distribute all to individual beneficiary at 47% rate
Tax payable: $300,000 × 47% = $141,000

Scenario 2: Distribute $180k to individual (stays within 37% bracket), $120k to corporate beneficiary
Individual tax: Approximately $60,000
Corporate tax: $120,000 × 25% = $30,000
Total: $90,000
Tax saved: $51,000

Consideration: corporate distributions create franking credits for later distribution
```

**Corporate Beneficiary Strategy:**
```
Distribute to private company beneficiary to:
- Cap tax rate at 25% (vs individual top rate 47%)
- Retain funds in corporate structure for business use
- Build franking credit balance
- Create future flexibility

Risks to manage:
- Division 7A if shareholders later access funds
- UPE (unpaid present entitlement) issues
- "Reimbursement agreement" rules (ITAA 1936 s100A)
```

### Division 7A Compliance

**Common Division 7A Triggers:**

**Shareholder Loans:**
```
Company lends $150,000 to shareholder during year
Options:
1. Repay before lodgment day (avoid deemed dividend)
2. Convert to complying loan (benchmark interest, 7-year term)
3. Accept deemed dividend ($150,000 assessable to shareholder)

Complying loan requirements:
- Written loan agreement before lodgment day
- Benchmark interest rate (RBA + margin, check ATO)
- Maximum term: 7 years unsecured, 25 years secured by real property
- Minimum annual repayments required
```

**Private Use of Company Assets:**
```
Shareholder uses company car (not under novated lease/FBT arrangement)
Market value of benefit: $15,000
Deemed dividend unless:
- Market rate charged and paid
- Declaration and payment made before lodgment day

Better structure: Provide under FBT arrangement or don't provide benefit
```

**Unpaid Present Entitlement (UPE):**
```
Trust distributes $200,000 to corporate beneficiary but doesn't pay by year-end
UPE creates deemed loan under Division 7A
Options:
- Pay before lodgment day (81 days after year-end)
- Sub-trust arrangement (UPE sub-trust must meet requirements)
- Convert to complying loan
- Accept deemed dividend treatment
```

### Capital Gains Tax Planning

**50% CGT Discount Eligibility:**
- Asset held >12 months
- Available to individuals and trusts (not companies)
- Applied after capital losses and discount method calculation

**Small Business CGT Concessions:**

**15-Year Exemption:**
- Asset owned continuously ≥15 years
- Owner is ≥55 years and retiring, or permanently incapacitated
- Maximum net asset value test: $6M
- Result: Entire capital gain disregarded

**50% Active Asset Reduction:**
- Asset owned ≥12 months
- Active asset test met (used in business)
- Can combine with 50% discount (effective 75% reduction)

**Retirement Exemption:**
- Contribute up to $500,000 (lifetime cap) to super
- Must meet age/contribution rules
- Gain exempt to extent contributed

**Rollover Relief:**
- Defer gain when replacing business asset
- Replacement asset acquired within timeframe
- Careful structuring required

### Franking Credits Strategy

**Building Franking Account:**
```
Company pays tax: $50,000
Franking credits generated: $50,000 ÷ 0.25 × 0.30 = $60,000
(Tax paid ÷ company rate × franking rate)

These credits attach to franked dividends:
Dividend $70,000 franked to 100% carries $30,000 franking credits
Shareholder receives: $70,000 cash + $30,000 credit = $100,000 assessable
Tax on $100,000 depends on marginal rate:
- At 19%: tax $19,000, credit $30,000 = $11,000 refund
- At 47%: tax $47,000, credit $30,000 = $17,000 to pay
```

**Franking Credit Timing:**
- Credits generated when tax paid (including PAYG installments)
- Attach to dividends when paid
- Strategy: pay dividends after company tax paid to frank them
- Lost if company becomes tax loss and debits exceed credits

### Superannuation Contribution Planning

**Concessional Contributions Cap:**
- Current cap: $27,500 per year
- Includes employer SG, salary sacrifice, personal deductible
- Excess taxed at marginal rates plus interest

**Non-Concessional Contributions Cap:**
- Current cap: $110,000 per year
- Can bring forward 3 years ($330,000) if aged <75
- Excess: penalizing excess tax

**Division 296 Tax (High Balance Tax):**
- 15% extra tax on earnings where TSB >$3M
- Applies from 2025-26 year
- Factor in for high-net-worth individuals

## Common Questions

**Q: How early should tax planning conversations start?**
A: Ideally quarterly check-ins, with serious planning conversations by March for June balancers. Last-minute (May/June) limits options and can appear contrived.

**Q: What documentation is needed for tax planning strategies?**
A: Commercial rationale (board minutes, emails evidencing decision), contemporaneous evidence (quotes, agreements), transaction evidence (invoices, payments), tax advice file notes.

**Q: Are prepayments always deductible?**
A: No. "Prepayment rules" limit deductions for services beyond income year. Generally, prepayment must be ≤12 months, paid (not just accrued), and business must be eligible (SBE or otherwise meet tests).

**Q: Can losses be carried back?**
A: Loss carry-back was temporarily available for companies (2020-22). Check current legislation. Generally, losses carried forward indefinitely (subject to continuity/business tests).

**Q: How do I know if a transaction triggers Division 7A?**
A: Any benefit from company to shareholder/associate: loans, payments, forgiveness of debts, use of assets below market value. Creates deemed dividend unless exempt or complying arrangements made.

## Related Workflows

- **Workflow 21**: Financial Statement Preparation (tax provisions in accounts)
- **Workflow 28**: Tax Provision Calculation (accounting for planned tax strategies)
- **Workflow 29**: SMSF Compliance (super contribution planning)
- **Workflow 30**: Scenario Modeling (modeling tax outcomes)

## Advanced Usage

### Multi-Entity Group Tax Planning
```
Client has 5 related entities: 2 operating companies, 1 holding company, 2 family trusts.
Analyze group tax position and identify planning opportunities: (1) profit/loss in each
entity, (2) ability to frank dividends, (3) trust distribution optimization, (4) group
restructure opportunities, (5) related party transactions for income/expense allocation.
Model scenarios showing overall group tax minimization while maintaining commercial
substance and ATO compliance.
```

### R&D Tax Incentive Eligibility
```
Client (software company, $8M turnover) incurred $450,000 in product development costs.
Assess R&D tax incentive eligibility: (1) activities meet "experimental activities"
criteria, (2) proper documentation maintained, (3) calculate refundable tax offset
(43.5% for <$20M turnover), (4) compare R&D claim versus immediate write-off as business
expense. Quantify benefit: $450k × 43.5% = $195,750 refundable offset versus $450k ×
25% = $112,500 tax saving if just deducted. Recommend R&D claim if eligible.
```

### Succession and Exit Tax Planning
```
Business owner (age 62) planning to sell business and retire within 3 years. Structure:
business held by Pty Ltd (owned by owner and family trust). Property held personally.
Plan tax-effective exit: (1) can small business CGT concessions apply (15-year exemption,
retirement exemption)?, (2) structure sale (shares vs assets), (3) timing considerations,
(4) use of retirement exemption to boost super, (5) family succession vs external sale
tax implications. Model tax cost under different scenarios and recommend strategy.
```

## Technical Notes

This workflow uses LedgerBot's tax knowledge base with current Australian taxation legislation, ATO guidance, and case law. The system maintains current tax rates, thresholds, and concession requirements.

For technical implementation details, developers can refer to:
- Tax law database updated for current income year
- Division 7A compliance logic based on ITAA 1936 and determinations
- CGT calculation engines applying relevant exemptions and concessions
- Entity aggregation algorithms for small business tests
