# Workflow 21: Intelligent Financial Statement Preparation

## Overview

LedgerBot's intelligent financial statement preparation workflow automatically generates draft financial statements with appropriate note disclosures, applies accounting standards (AASB for Australian entities), identifies items requiring special treatment (related party transactions, contingent liabilities), suggests appropriate classification adjustments, and produces audit-ready working paper trails showing all adjustments and their rationale.

This workflow reduces financial statement preparation time from days to hours, ensures consistent application of accounting standards, minimizes disclosure omissions, and allows accountants to focus on technical review and client advisory rather than data compilation.

## How It Works

1. **Data Extraction**: LedgerBot retrieves complete trial balance and transaction details from Xero
2. **Standard Application**: Applies relevant AASB standards based on entity type and reporting framework
3. **Disclosure Identification**: Flags transactions and balances requiring note disclosures
4. **Classification Review**: Suggests reclassifications for proper financial statement presentation
5. **Working Paper Generation**: Produces complete audit trail with supporting schedules and rationale

## Prerequisites

- Active Xero connection established for client entity
- Entity type and reporting framework identified (SPFS, GPFS, Tier 1, Tier 2)
- Prior period comparatives available
- Knowledge of client-specific accounting policies

## Step-by-Step Guide

### 1. Define Reporting Parameters

Specify for the engagement:
- Reporting framework (SPFS vs GPFS, Tier 1 vs Tier 2)
- Financial year end date
- Entity type (company, trust, partnership, sole trader)
- Applicable standards and RDR concessions

### 2. Extract and Review Trial Balance

LedgerBot retrieves and validates:
- Final adjusted trial balance
- Account classifications and mappings
- Prior period comparatives
- Post-balance date transactions

### 3. Generate Draft Statements

Review AI-generated draft:
- Statement of Profit or Loss and OCI
- Statement of Financial Position
- Statement of Changes in Equity
- Statement of Cash Flows (if required)
- Notes to the Financial Statements

### 4. Review Disclosure Requirements

Evaluate suggested disclosures for:
- Accounting policies (AASB 101)
- Key estimates and judgments
- Related party transactions (AASB 124)
- Commitments and contingencies
- Subsequent events (AASB 110)
- Entity-specific requirements

### 5. Apply Adjustments

Review and post suggested adjustments:
- Reclassification entries
- AASB compliance adjustments
- Disclosure enhancements
- Presentation improvements

### 6. Finalize and Document

Complete the engagement:
- Final review and sign-off
- Working paper file compilation
- Disclosure checklist completion
- Archive for audit or review

## Example Prompts

### Prompt 1: Generate Draft Special Purpose Financial Statements
```
Generate draft special purpose financial statements for XYZ Pty Ltd for year
ended 30 June 2024. Apply AASB simplified disclosure requirements for Tier 2
entities. The company is a non-reporting entity preparing SPFS for members.
Include: P&L, balance sheet, equity statement, and minimum required note
disclosures. Flag any related party transactions, contingent liabilities, or
unusual items requiring specific disclosure.
```

### Prompt 2: GPFS with Full AASB Compliance
```
Prepare general purpose financial statements for ABC Limited (public company,
Tier 1 reporting entity) for year ended 31 December 2024. Apply full AASB
requirements including AASB 15 (Revenue), AASB 16 (Leases), AASB 9 (Financial
Instruments). Generate complete note disclosures including critical accounting
estimates, fair value measurements, and segment reporting. Ensure compliance
with Corporations Act 2001 requirements.
```

### Prompt 3: Trust Financial Statements
```
Generate financial statements for Smith Family Trust for year ended 30 June
2024. This is a discretionary trust (non-reporting entity, SPFS). Include
trustee's statement of profit or loss, statement of financial position, and
notes covering: trust deed compliance, beneficiary distributions, related
party transactions with corporate trustee and beneficiaries, and tax provisions.
Flag any Division 7A implications.
```

### Prompt 4: Comparative Reclassification Analysis
```
Review the trial balance for Johnson Industries Pty Ltd at 30 June 2024.
Compare account classifications to prior year financial statements and
identify: (1) items that should be reclassified for proper presentation
(current vs non-current, functional expense allocation), (2) accounts that
require separate disclosure per AASB 101, (3) related party balances requiring
AASB 124 disclosure, (4) any unusual or material items requiring explanation
in the notes.
```

### Prompt 5: Post-Balance Date Events Review
```
Review transactions and correspondence from 1 July 2024 to today for DEF Pty
Ltd (year-end 30 June 2024, statements due 31 October). Identify any events
requiring disclosure under AASB 110 (Events After Reporting Period). Check for:
(1) adjusting events (dividends declared, legal settlements, major bad debts),
(2) non-adjusting events requiring disclosure (major contracts, restructures,
acquisitions), (3) going concern implications. Draft appropriate note disclosure.
```

## Tips and Best Practices

### Understanding Reporting Frameworks

**Special Purpose Financial Statements (SPFS):**
- For non-reporting entities
- Apply relevant standards per trust deed/constitution/legislation
- Reduced disclosure framework (RDR) available
- Common for private companies, trusts, small entities

**General Purpose Financial Statements (GPFS):**
- For reporting entities (public accountability or economic significance)
- Full AASB compliance required
- Tier 1: Full standards including all disclosures
- Tier 2: Full recognition and measurement, reduced disclosures (RDR)

**Key Decision:**
Is the entity a reporting entity? Assess based on:
- Ownership structure (widespread vs concentrated)
- Economic significance
- Public accountability
- Users' ability to command information

### Critical AASB Standards for Year-End

**AASB 101 - Presentation of Financial Statements:**
- Classification: Current vs non-current
- Materiality and aggregation
- Offsetting rules
- Comparative information requirements
- Fair presentation and compliance statement

**AASB 108 - Accounting Policies, Changes and Errors:**
- Consistency in application
- Change in accounting estimate vs policy
- Prior period error corrections
- Retrospective vs prospective application

**AASB 110 - Events After Reporting Period:**
- Adjusting events (evidence of conditions at year-end)
- Non-adjusting events (arising after year-end)
- Dividends declared after reporting date
- Going concern assessment

**AASB 124 - Related Party Disclosures:**
- Key management personnel compensation
- Transactions with related parties
- Outstanding balances and commitments
- Terms and conditions, guarantees

**AASB 137 - Provisions, Contingent Liabilities and Assets:**
- Recognition criteria for provisions
- Contingent liability disclosure
- Onerous contract assessment
- Restructuring provisions

### Common Financial Statement Adjustments

**Reclassification of Expenses:**
```
Trial balance shows functional expense accounts mixed with nature-based:
- Separate "Cost of Sales" from operating expenses
- Reclassify "Depreciation" from admin to appropriate function
- Ensure consistent presentation with prior year

DR Cost of Sales
CR Administrative Expenses
(Reclassify depreciation to cost of sales for manufacturing equipment)
```

**Current vs Non-Current Split:**
```
Loan account not split by maturity:
- Analyze loan agreement
- Principal due within 12 months → Current liabilities
- Principal due after 12 months → Non-current liabilities

DR Loan Payable (Non-current)
CR Loan Payable (Current)
(Reclassify $45,000 principal due within 12 months)
```

**Revenue Recognition Adjustment (AASB 15):**
```
Upfront payment for 24-month service contract:
- Recognize revenue over contract period
- Create contract liability for deferred portion

DR Revenue
CR Contract Liability (Current)
CR Contract Liability (Non-current)
(Defer $180k revenue for services not yet performed: $90k current, $90k non-current)
```

**Related Party Disclosure:**
```
Loan from director not separately disclosed:
- Extract from general creditors
- Disclose in related party note with terms

Note 14: Related Party Transactions
The company has an outstanding loan from Director John Smith of $125,000
(2023: $100,000). The loan is unsecured, interest-free, and repayable on demand.
```

### Disclosure Checklist Essentials

**Mandatory Disclosures (all entities):**
- [ ] Accounting policies (material)
- [ ] Critical estimates and judgments
- [ ] Revenue recognition policy and breakdown
- [ ] Employee benefits
- [ ] Income tax expense and reconciliation
- [ ] Related party transactions
- [ ] Subsequent events

**Additional GPFS Disclosures:**
- [ ] Segment information (if applicable)
- [ ] Earnings per share (listed companies)
- [ ] Fair value measurements (AASB 13)
- [ ] Financial risk management (AASB 7)
- [ ] Operating lease commitments (AASB 16 pre-transition)
- [ ] Auditor's remuneration
- [ ] Dividends paid and proposed

**Complex Items Requiring Special Treatment:**
- Business combinations (AASB 3)
- Impairment testing (AASB 136)
- Share-based payments (AASB 2)
- Foreign currency translation (AASB 121)
- Discontinued operations (AASB 5)

### Working Paper Documentation Standards

**Lead Schedules:**
Create for each financial statement line item:
- Account description and GL code
- Current year balance
- Prior year comparative
- Movement analysis
- Cross-reference to supporting schedules
- Review notes and tick marks

**Supporting Schedules:**
- Fixed asset register with additions/disposals/depreciation
- Aged receivables with bad debt assessment
- Inventory valuation with NRV testing
- Loan schedules with future payment analysis
- Tax provision calculation and reconciliation
- Related party transaction register

**Audit Trail Requirements:**
- Source of all adjustments clearly documented
- Rationale for accounting treatment
- Reference to applicable accounting standard
- Review notes and resolution of queries
- Sign-off and date of completion

## Common Questions

**Q: How do I determine if an entity is a reporting entity?**
A: Apply SAC 1 criteria: Does the entity have users dependent on GPFS who cannot command preparation of reports tailored to their needs? Consider ownership spread, economic significance, and public accountability.

**Q: Can SPFS still use RDR (reduced disclosure regime)?**
A: Yes, under AASB 1053, RDR applies to both GPFS (Tier 2) and SPFS where entities choose to apply it. Many SPFS preparers adopt RDR to reduce disclosure burden while maintaining standard compliance.

**Q: What's the difference between a change in accounting policy and accounting estimate?**
A: Policy change affects recognition, measurement, presentation or disclosure (retrospective application). Estimate change affects judgment based on new information (prospective application). Examples: depreciation method change = policy, useful life change = estimate.

**Q: How do I handle prior period errors discovered during year-end?**
A: Material errors require retrospective restatement per AASB 108. Adjust opening retained earnings, restate comparatives, and disclose nature of error, amount of correction, and impact. Immaterial errors can be corrected in current period.

**Q: When can I offset assets and liabilities?**
A: Only when you have a legally enforceable right to set-off AND intend to settle net or realize asset and settle liability simultaneously (AASB 132). Bank overdrafts can offset cash when part of cash management arrangements.

## Related Workflows

- **Workflow 28**: Tax Provision Calculation (tax disclosures in financial statements)
- **Workflow 26**: Consolidation and Group Reporting (group financial statements)
- **Workflow 27**: Audit Preparation (audit-ready working papers)
- **Workflow 24**: Advanced Revenue Recognition (AASB 15 compliance)

## Advanced Usage

### Multi-Entity Comparative Analysis
```
We prepare financial statements for 8 related private companies. Generate a
comparative analysis showing key metrics across all entities: revenue, EBITDA,
net assets, debt-to-equity, ROE. Identify which entities are outperforming/
underperforming the group average. Flag any intercompany transactions requiring
consolidated disclosure if we later prepare group accounts.
```

### AASB Standard Transition Analysis
```
Client is transitioning from SPFS (historical cost, limited standards) to Tier 2
GPFS with RDR for first time. Analyze the impact of adopting: (1) AASB 16 Leases
(operating leases to balance sheet), (2) AASB 9 Financial Instruments (impairment
on ECL basis), (3) AASB 15 Revenue (identify performance obligations). Quantify
adjustments required on transition and draft note disclosure explaining changes.
```

### Integrated Financial Statement Package
```
Generate a complete financial statement package for board presentation including:
(1) statutory financial statements with all required notes, (2) director's
declaration, (3) management commentary explaining key results and movements,
(4) KPI dashboard comparing actuals to budget and prior year, (5) graphical
representation of revenue, profit, and cash flow trends. Format for professional
presentation to board and shareholders.
```

### Interim Financial Statements (AASB 134)
```
Prepare condensed interim financial statements for 6 months ended 31 December
2024 per AASB 134 requirements. Include: condensed P&L, condensed balance sheet,
condensed cash flow, condensed equity statement, and selected explanatory notes.
Focus disclosures on events and transactions material to understanding changes
since last annual reporting date. Ensure compliance with Listing Rules if
applicable.
```

### Disclosure Effectiveness Review
```
Review our draft financial statements for XYZ Pty Ltd against better practice
disclosure principles. Assess: (1) are notes clearly linked to face of statements?,
(2) is materiality appropriately applied (avoid boilerplate)?, (3) are accounting
policies relevant (not generic templates)?, (4) is plain English used where
possible?, (5) are only significant items disclosed in detail? Suggest improvements
to enhance usefulness while maintaining compliance.
```

## Financial Statement Templates by Entity Type

### Private Company (Pty Ltd) - SPFS with RDR
Typical structure:
- Director's declaration
- Statement of profit or loss and other comprehensive income
- Statement of financial position
- Statement of changes in equity
- Statement of cash flows (optional for SPFS)
- Notes: basis of preparation, revenue, expenses, income tax, related parties, subsequent events

### Trust - SPFS
Trustee's reports including:
- Statement of comprehensive income (or profit or loss)
- Statement of financial position
- Statement of changes in equity (if applicable)
- Notes: trust deed compliance, distributions, related parties, tax
- Often exclude cash flow statement

### Partnership - SPFS
Partner's reports including:
- Statement of profit or loss (with partner appropriations)
- Statement of financial position
- Statement of partners' capital accounts
- Notes: partnership agreement terms, partner capital movements, distributions

### Listed Public Company - Tier 1 GPFS
Full Corporations Act + Listing Rules requirements:
- All primary statements including OCI
- Comprehensive note disclosures (no RDR concessions)
- Segment reporting, EPS, operating and financial review
- Remuneration report (if consolidated entity)
- Director's declaration, auditor's independence declaration

## AASB Update Considerations

Stay current with new and amended standards:

**Recent/Upcoming Changes:**
- AASB 2020-X amendments (check AASB website for current year)
- COVID-19 related rent concessions (AASB 2021-5)
- Definition of accounting estimates (AASB 2021-2)
- Disclosure of accounting policies (AASB 2021-7)

**Effective Date Monitoring:**
- Standards effective for current period (mandatory)
- Standards available for early adoption (consider client needs)
- Standards not yet effective (disclosure of expected impact if material)

## Professional Responsibilities

**Due Care and Diligence:**
- Comply with APES 205 (Conformity with Accounting Standards)
- Maintain professional competence in current standards
- Document professional judgments and rationale
- Ensure adequate review processes

**Independence Considerations:**
- If providing audit/review services to same entity
- Self-review threat if preparing and auditing
- Consider engagement letter scope and safeguards

**Quality Control:**
- EQCR (engagement quality control review) for listed/PIE clients
- File review before issuance
- Compliance with firm's quality management system

## Technical Notes

This workflow uses LedgerBot's Analytics and Compliance agents with comprehensive knowledge of Australian Accounting Standards. The system maintains an AASB requirements database updated for current standards and interpretations.

For technical implementation details, developers can refer to:
- `app/agents/compliance/` - Compliance assistant with AASB knowledge
- `lib/ai/tools/xero-tools.ts` - Financial data extraction and classification
- AASB disclosure checklists maintained in AI knowledge base
- Working paper generation templates based on professional standards
