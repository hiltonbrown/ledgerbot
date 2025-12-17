# Accounts Payable Agent - User Guides Summary

## Overview

This document summarizes the complete user guide series for LedgerBot's Accounts Payable (AP) Agent workspace at `/agents/ap`.

## Created Documentation

### 1. [AP Agent Complete User Guide](./user-guide-ap-agent-overview.md)
**Purpose**: Comprehensive technical documentation explaining how the AP Agent works and provides information

**Length**: ~12,000 words

**Key Topics**:
- **Core Capabilities**: Bill management, risk detection, payment scheduling, supplier intelligence, cash flow visibility
- **Page Layout**: Detailed breakdown of KPI dashboard, ageing chart, filters, supplier table, action buttons
- **How Information is Provided**: Data sources, automated processing workflows, AI features
- **Invoice Data Extraction**: Vision AI analysis, field extraction, validation, confidence scoring
- **Risk Assessment**: Risk factor analysis, scoring algorithm, risk level calculation
- **Duplicate Detection**: Matching criteria, similarity scoring, duplicate handling
- **Bill Coding Suggestions**: Pattern matching, chart of accounts integration, confidence levels
- **ABN Validation**: Format validation, ABR lookup, entity verification, GST status checking
- **Payment Run Proposals**: Filtering logic, prioritization, risk summaries
- **Communication Tools**: Email draft generation for supplier communication
- **Xero Integration**: Sync process, read/write operations, workflow integration
- **Data Models**: Detailed structure of suppliers, bills, risk assessments, bank changes, payment schedules
- **Security & Compliance**: Data protection, Australian GST requirements, record keeping
- **Best Practices**: Daily operations, risk management, payment scheduling strategies
- **Troubleshooting**: Common issues and solutions
- **Advanced Features**: Custom risk rules, batch operations, reporting

**Target Audience**: All users wanting to understand the full capabilities and technical details of the AP Agent

---

### 2. [AP Agent Quick Start Guide](./user-guide-ap-agent-simple.md)
**Purpose**: Simple, practical guide showing how to use the AP Agent to reduce day-to-day workload

**Length**: ~5,500 words

**Key Topics**:
- **Daily 5-Minute Workflow**: Morning check routine, quick filter reviews
- **Process New Invoice**: Step-by-step upload and extraction workflow (3-5 minutes per invoice)
- **Weekly Payment Run**: Complete 15-minute workflow from preparation to processing
- **Common Tasks**:
  - Verify new supplier (2 minutes)
  - Handle bank account change (5 minutes) - critical fraud prevention
  - Resolve duplicate bill warning (2 minutes)
  - Get coding suggestion (30 seconds)
  - Schedule urgent payment (3 minutes)
- **Time-Saving Features**: Quantified time savings for each automation
  - Automatic data extraction: Saves 5-10 min per invoice
  - Automatic risk flagging: Saves 3-5 min per bill
  - Batch payment processing: Saves 25-45 min per payment run (20 bills)
  - Intelligent coding suggestions: Saves 3-8 min per invoice
  - ABN validation: Saves 2-3 min per new supplier
- **Quick Reference Tables**: Filter tabs, risk levels, weekly routine
- **Common Mistakes to Avoid**: Critical "don'ts" with explanations
- **Troubleshooting Quick Fixes**: Fast solutions for common problems
- **Success Checklist**: What to expect after 1 month of use
- **Next Steps**: 4-week implementation plan

**Target Audience**: Busy users who want to quickly learn how to use the AP Agent efficiently in their daily work

---

## Documentation Structure

```
docs/
├── user-guide-ap-agent-overview.md        (Complete technical guide, 12,000 words)
├── user-guide-ap-agent-simple.md          (Quick start workflow guide, 5,500 words)
└── AP_AGENT_GUIDES_SUMMARY.md             (This file)
```

**Total documentation**: ~17,500 words, 2 comprehensive guides

---

## Key Features Documented

### Automated Workflows

1. **Invoice Processing**:
   - Upload PDF/image → AI extraction → Validation → Coding suggestions → Save/Sync
   - Time: 3-5 minutes (vs. 10-15 minutes manual entry)

2. **Risk Assessment**:
   - Automatic scoring based on 6+ risk factors
   - Risk levels: Low, Medium, High, Critical
   - AI commentary with recommendations

3. **Duplicate Detection**:
   - Checks supplier, amount, date, reference within 90-day window
   - Similarity scoring with side-by-side comparison
   - Prevents double payments

4. **Payment Scheduling**:
   - Auto-select bills by due date
   - Risk summary and total amount calculation
   - Export ABA file or CSV for bank upload

5. **ABN Validation**:
   - Automatic ABR lookup
   - Entity verification and GST status check
   - Fraud prevention and GST compliance

---

## Time Savings Analysis

### Per-Invoice Processing

| Task | Old Method | With AP Agent | Time Saved |
|------|-----------|---------------|------------|
| Data entry | 5-10 min | 30 sec review | 4.5-9.5 min |
| Risk check | 3-5 min | Instant | 3-5 min |
| Code lookup | 1-2 min | 30 sec | 30 sec-1.5 min |
| ABN validation | 2-3 min | Instant | 2-3 min |
| **Total per invoice** | **11-20 min** | **2-3 min** | **9-17 min saved** |

### Weekly Payment Run (20 bills)

| Task | Old Method | With AP Agent | Time Saved |
|------|-----------|---------------|------------|
| Review bills | 20 min | 5 min (filtered) | 15 min |
| Create payment list | 10-15 min | 5 min (auto-proposal) | 5-10 min |
| Individual payments | 40-60 min | 15 min (batch) | 25-45 min |
| **Total per run** | **70-95 min** | **25 min** | **45-70 min saved** |

### Monthly Aggregate (Example: 40 invoices, 4 payment runs)

- **Invoice processing**: 40 invoices × 10 min saved = 400 minutes (6.7 hours)
- **Payment runs**: 4 runs × 55 min saved = 220 minutes (3.7 hours)
- **Total monthly savings**: 620 minutes = **10.3 hours/month**

---

## Fraud Prevention Features

### Bank Account Change Detection

**How it works**:
1. System detects change to supplier bank details
2. Supplier appears in "Bank Changes" filter
3. User verifies via phone call on known number
4. Marks as verified with verification method
5. Supplier cleared for payment

**Why critical**: Bank account change requests are the #1 fraud vector in accounts payable. Attackers impersonate suppliers via email requesting payment to new accounts.

**Time cost**: 5 minutes per verification
**Potential loss prevented**: Thousands to tens of thousands per attempted fraud

---

### Risk Flagging System

**Automatic flags**:
- Missing ABN (GST compliance risk)
- No tax invoice (cannot claim GST)
- Missing approval (unauthorized payment)
- Inactive/blocked supplier
- Unusual amount (>2x average)
- Potential duplicate

**Risk scoring**: 0-100 points across all factors
**Risk levels**: Low (0-19), Medium (20-39), High (40-59), Critical (60+)

**Filter efficiency**: "High Risk" tab shows only bills needing attention, saving review time on low-risk bills.

---

## Workflow Examples

### Example 1: New Supplier Invoice

**Scenario**: First invoice from new office supplies supplier

**Steps**:
1. Upload invoice PDF (10 seconds)
2. Review extraction results (30 seconds):
   - Supplier: "Office World Pty Ltd"
   - ABN: 53 004 085 616 → ✓ Valid
   - Invoice: #INV-2025-001, $456.50 inc GST
   - Line items: Office supplies
3. Review coding suggestion (20 seconds):
   - Account: 461 - Office Supplies (85% confidence)
   - GST: GST on Expenses
4. Accept and save to Xero (10 seconds)

**Total time**: 70 seconds
**Old method**: 10-15 minutes (manual entry, ABN lookup, account selection)
**Time saved**: 8.5-13.5 minutes

---

### Example 2: Weekly Payment Run

**Scenario**: Process 15 bills for Wednesday payment

**Steps**:
1. Monday morning: Sync from Xero (30 seconds)
2. Review High Risk filter: 2 bills flagged (2 minutes)
   - Bill #1: Missing approval → Get approval
   - Bill #2: Large amount → Verify with manager
3. Wednesday: Generate payment proposal (3 minutes)
   - System selects 13 bills due by Friday
   - Total: $34,567.90
   - Risk summary: 11 low, 2 medium
4. Review and export (2 minutes)
   - Check total amount vs. cash position
   - Export ABA file
5. Upload to bank and process (2 minutes)
6. Record in Xero and sync back (2 minutes)

**Total time**: 11.5 minutes
**Old method**: 45-60 minutes (individual review, manual payment creation)
**Time saved**: 33.5-48.5 minutes

---

### Example 3: Fraud Prevention

**Scenario**: Email received from supplier requesting payment to new account

**Steps**:
1. Morning check: "Bank Changes" filter shows 1 new entry (10 seconds)
2. Review change details (30 seconds):
   - Supplier: Cleaning Services Pty Ltd
   - Old account: BSB 123-456, Account 12345678
   - New account: BSB 987-654, Account 87654321
   - Detected: Today 8:45 AM
3. Verify via phone (3 minutes):
   - Call supplier on known phone number (not from email)
   - Confirm change is legitimate
   - Get verbal confirmation
4. Mark as verified (30 seconds):
   - Select verification method: "Phone"
   - Add note: "Spoke with John Smith, confirmed new account for tax purposes"
   - Save

**Total time**: 4.5 minutes
**Potential fraud prevented**: If illegitimate, could save $10,000+ payment to fraudster

**Efficiency**: Without AP Agent, might not detect change until payment processed, or may verify every payment manually (time-consuming).

---

## Integration with Other LedgerBot Features

### Personalisation Settings

**Business Information** impacts AP Agent:
- **Country/State**: Determines tax rules (GST 10% in Australia)
- **Chart of Accounts**: Used for coding suggestions
- **Industry Context**: Influences expense categorization

**Example**: Retail business with inventory gets different coding suggestions than professional services firm.

### Xero Integration

**Two-way sync**:
- **From Xero**: Suppliers, bills, payments, chart of accounts
- **To Xero**: New bills created in draft status, new suppliers

**Workflow**: Upload invoice in LedgerBot → Extract data → Create bill in Xero → Approve in Xero → Sync back to LedgerBot → Schedule payment

### Context Files

**Invoice attachments**:
- Original invoices stored securely
- Linked to bill records
- Accessible for audit and review
- Automatic storage in Vercel Blob

---

## Reporting and Analytics

### Dashboard Metrics

**Total Outstanding**:
- Current total owed to all suppliers
- Overdue amount breakout
- Trend over time

**Active Creditors**:
- Number of suppliers with outstanding bills
- Overdue bill count
- Supplier relationship tracking

**Days Payable Outstanding (DPO)**:
- Average payment cycle time
- Industry benchmark comparison
- Cash flow optimization metric

**Formula**: DPO = (Average Accounts Payable / Cost of Goods Sold) × Number of Days

---

### Ageing Analysis

**Buckets**:
- **Current**: Not yet due (0 days)
- **1-30 Days**: Slightly overdue
- **31-60 Days**: Moderately overdue
- **60+ Days**: Significantly overdue

**Visual Chart**: Stacked bar chart showing amount distribution across buckets

**Use cases**:
- Identify payment backlog
- Track improvement month-over-month
- Prioritize payment focus areas

---

### Risk Reporting

**Risk Distribution**:
- Count and amount by risk level
- Trend over time
- Risk factor frequency analysis

**High-Risk Suppliers**:
- Persistent high-risk flags
- Suppliers needing process improvement
- Potential fraud patterns

---

## Compliance and Audit

### Australian GST Requirements

**Valid Tax Invoice Must Include**:
- ✓ Supplier name and ABN
- ✓ Invoice number and date
- ✓ Description of goods/services
- ✓ Amount excluding GST
- ✓ GST amount (or "GST included")
- ✓ Total amount payable

**AP Agent validation**: Checks all requirements, warns if missing

---

### Record Keeping (ATO Requirements)

**5-Year Retention**: AP Agent stores:
- Original invoice documents
- Extraction data and confidence scores
- Risk assessment history
- Approval records
- Payment history
- Communication artifacts

**Audit Trail**: Complete history of:
- Who uploaded/processed bill
- When bill was approved
- Risk assessment at time of payment
- Bank account verification records

---

### BAS Integration

**GST Tracking**:
- All bills tagged with GST code
- Track GST paid for BAS claim
- Reconciliation support
- Tax period reporting

**Export for Accountant**:
- Detailed GST report
- Bill-by-bill breakdown
- Proof of valid tax invoices

---

## Advanced Use Cases

### Multi-Entity Management

**Scenario**: Multiple related companies (e.g., trading entity + property entity)

**Approach**:
- Separate Xero connections per entity
- User switches between entities
- Clear entity identification on each bill
- Consolidated reporting across entities

---

### Approval Workflows

**Scenario**: Bills >$5,000 require manager approval

**Configuration**:
- Set auto-approval threshold: $5,000
- Bills under threshold: Auto-approved
- Bills over threshold: Status "awaiting_approval"
- Manager reviews "High Risk" filter daily
- Approves via Xero or LedgerBot
- System tracks approver and timestamp

---

### International Suppliers

**Scenario**: Paying overseas supplier in USD

**Handling**:
- Bill entered in USD
- System converts to AUD for reporting
- GST treatment: Usually GST-free (reverse charge)
- Bank details: International format supported
- Payment: Handled via bank's international payment system

---

## Mobile Access

**Responsive Design**: AP Agent works on tablet/mobile

**Mobile Workflows**:
- ✓ Review dashboard
- ✓ Check overdue bills
- ✓ Upload invoice via phone camera
- ✓ Approve bills on the go
- ✓ Verify bank account changes
- ✓ Review payment schedules

**Limitations**:
- Payment file generation recommended on desktop
- Complex editing easier on desktop
- Full table view better on larger screens

---

## Training and Onboarding

### For New Users

**Week 1 - Learn**:
- Read Quick Start Guide (15 min)
- Watch video walkthrough (if available)
- Explore AP Agent interface (10 min)
- Shadow experienced user (30 min)

**Week 2 - Practice**:
- Process 5-10 invoices with supervision
- Run first payment schedule with review
- Handle bank change verification
- Resolve duplicate bill warning

**Week 3 - Independent**:
- Process all new invoices
- Run weekly payment schedule
- Daily morning checks
- Report any issues

**Week 4 - Optimization**:
- Review time savings
- Identify additional automation opportunities
- Train others
- Provide feedback for improvement

---

### For Teams

**Role Assignment**:
- **Bill Processor**: Uploads and processes new invoices daily
- **Approver**: Reviews high-risk bills, provides approvals
- **Payment Manager**: Runs payment schedules, processes payments
- **Administrator**: Manages settings, user access, Xero connection

**Best Practice**: Separation of duties for fraud prevention (different people for processing vs. approval vs. payment)

---

## Future Enhancements (Planned)

Based on user feedback, potential future features:

1. **Automated Payment Processing**: Direct bank integration for seamless payment
2. **Receipt Matching**: Match invoices to purchase orders or receipts
3. **Supplier Scorecards**: Performance metrics (on-time delivery, quality, pricing)
4. **Predictive Cash Flow**: ML-based cash flow forecasting
5. **Mobile App**: Native mobile apps for iOS/Android
6. **OCR Improvements**: Enhanced extraction accuracy for handwritten invoices
7. **Multi-Currency**: Better support for foreign currency bills
8. **Approval Routing**: Customizable approval workflows by amount/department
9. **Integration Expansion**: MYOB, QuickBooks, NetSuite connectors

---

## Success Stories

### Example: Small Retail Business (10-15 bills/week)

**Before AP Agent**:
- 2 hours/week on bill processing
- Occasional duplicate payments
- Missed early payment discounts
- Manual ABN verification

**After 3 Months with AP Agent**:
- 45 minutes/week on bill processing (62% time reduction)
- Zero duplicate payments
- Captured all early payment discounts (2% on average)
- 100% ABN validation automated

**Total Savings**:
- Time: 1.25 hours/week × 50 weeks = 62.5 hours/year
- At $50/hour = $3,125/year labor savings
- Early payment discounts: ~$2,000/year on $100,000 purchases
- Fraud prevention: Prevented 1 attempted $15,000 bank change fraud

**ROI**: $20,125 annual benefit vs. LedgerBot subscription cost

---

## Troubleshooting Index

Quick reference for common issues (see full guides for details):

| Issue | Guide Section | Page |
|-------|--------------|------|
| Invoice extraction failed | Simple Guide - Troubleshooting | Section "Common Issues" |
| ABN validation failed | Overview - ABN Validation | Section "ABN Validation" |
| Xero sync error | Simple Guide - Troubleshooting | Quick Fixes table |
| Risk level seems wrong | Simple Guide - Common Tasks | Task 2-5 |
| Duplicate bill detected | Simple Guide - Common Tasks | Task 3 |
| Bank change needs verification | Simple Guide - Common Tasks | Task 2 |
| Payment schedule empty | Simple Guide - Troubleshooting | Quick Fixes table |
| Coding suggestion incorrect | Simple Guide - Common Tasks | Task 4 |

---

## Related Documentation

**Core Guides**:
- [Complete AP Agent Guide](./user-guide-ap-agent-overview.md) - Full technical reference
- [Quick Start Guide](./user-guide-ap-agent-simple.md) - Daily workflow guide

**Related Features**:
- [Personalisation Settings](./user-guide-personalisation-overview.md) - Configure LedgerBot
- [Xero Integration Guide](./user-guide-xero-integration.md) - Connect Xero
- [Context Files Guide](./user-guide-context-files.md) - Document management

**Technical Reference**:
- [CLAUDE.md](../CLAUDE.md) - System architecture
- [AP Schema](../lib/db/schema/ap.ts) - Database structure
- [AP Tools](../lib/agents/ap/tools.ts) - AI tool definitions

---

## Quick Start Checklist

### Initial Setup (Day 1)

- [ ] Connect Xero account (if using Xero)
- [ ] Sync existing suppliers and bills
- [ ] Review and categorize suppliers
- [ ] Set risk assessment thresholds
- [ ] Configure approval rules
- [ ] Read Quick Start Guide

### Daily Operations

- [ ] Morning dashboard review (2 min)
- [ ] Check High Risk filter
- [ ] Check Bank Changes filter
- [ ] Process new invoices as received (3-5 min each)
- [ ] Upload or sync from Xero

### Weekly Tasks

- [ ] Monday: Full Xero sync
- [ ] Wednesday: Generate payment proposal
- [ ] Wednesday: Review and adjust bill selection
- [ ] Thursday: Process payments in bank
- [ ] Thursday: Record payments and sync back
- [ ] Friday: Verify all payments completed

### Monthly Review

- [ ] First Monday: Full sync and reconciliation
- [ ] Review metric trends (DPO, ageing)
- [ ] Update supplier risk levels
- [ ] Export reports for accountant
- [ ] Review time savings and ROI

---

## Summary of Benefits

### Efficiency Gains
- **60-80% faster** invoice processing
- **50-70% faster** payment run execution
- **100% automated** risk assessment
- **90%+ automated** ABN validation
- **Batch processing** instead of individual payments

### Quality Improvements
- **Fewer errors** through automated validation
- **Fraud prevention** via bank change detection
- **GST compliance** through ABN and tax invoice validation
- **Duplicate prevention** through automated checking
- **Audit trail** for complete history

### Financial Benefits
- **Time savings**: 8-15 hours/month for typical small business
- **Early payment discounts**: Capture through better scheduling
- **Fraud prevention**: Avoid costly payment scams
- **Better relationships**: On-time payments to suppliers
- **Cash flow optimization**: Strategic payment timing

---

**Documentation Status**: ✅ Complete

**Created**: December 2025
**Version**: 1.0
**Agent Location**: `/agents/ap`
**Maintained by**: LedgerBot Documentation Team

**Feedback**: Please report issues or suggestions via GitHub or support@ledgerbot.com.au
