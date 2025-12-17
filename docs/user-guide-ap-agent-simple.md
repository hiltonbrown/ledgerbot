# Accounts Payable Agent - Quick Start Guide

## Overview

This guide shows you how to use the AP Agent (`/agents/ap`) to reduce your daily workload managing supplier bills and payments.

**Time savings**: 10-30 minutes per day on bill processing and payment scheduling.

---

## Daily 5-Minute Workflow

### Morning Check (2 minutes)

1. **Open AP Agent**: Navigate to Agents → Accounts Payable
2. **Scan Dashboard**: Check three KPI cards at top
   - Total Outstanding → Know your obligations
   - Active Creditors → How many suppliers to manage
   - Days Payable Outstanding → Are you paying too slow/fast?

3. **Quick Filter Review**:
   - Click **"High Risk"** tab → Review any flagged suppliers
   - Click **"Bank Changes"** tab → Verify any new bank details
   - Click **"Overdue"** tab → See what needs urgent payment

**What to do**: If any High Risk or Bank Changes appear, investigate before processing payments.

---

### Process New Invoice (3-5 minutes per invoice)

**Option 1: Upload Invoice (Fastest)**

1. Click **Upload Invoice** button (or drag & drop PDF/image)
2. Wait for AI extraction (10-20 seconds)
3. **Review extracted data**:
   - ✓ Supplier name correct?
   - ✓ Invoice number and date correct?
   - ✓ Amounts match invoice?
   - ✓ ABN present and valid?
4. **Review warnings**:
   - Fix any red/yellow warnings
   - Add missing information
5. **Review coding suggestions**:
   - Check suggested account codes
   - Override if incorrect
   - Verify GST treatment
6. Click **Save** or **Sync to Xero**

**Time saved**: Manual data entry eliminated (5-10 minutes per invoice)

---

**Option 2: Sync from Xero**

If you've already entered bills in Xero:

1. Click **"Sync from Xero"** button (top right)
2. Wait for sync (5-30 seconds depending on volume)
3. Review sync summary
4. Bills automatically imported with risk assessment

**Time saved**: Automatic risk analysis and flagging (2-3 minutes per bill)

---

## Weekly Payment Run (15 minutes)

### Step 1: Prepare (5 minutes)

1. **Sync from Xero**: Click "Sync from Xero" to get latest data
2. **Review Overdue**: Click "Overdue" tab
   - Note suppliers that need priority payment
   - Check if any are critical/high risk
3. **Check Cash Position**: Ensure sufficient funds for payment run

---

### Step 2: Create Payment Schedule (5 minutes)

1. Click **"Payment Schedule"** button (top right)
2. **Select Payment Date**: Choose when payments will be processed
3. **Review Proposed Bills**:
   - System auto-selects bills due by payment date
   - Review total amount
   - Check risk summary (how many high-risk items)
4. **Adjust Selection**:
   - Remove bills not ready to pay
   - Add urgent bills manually
   - Exclude disputed items
5. **Review Recommendations**: Read AI suggestions
6. Click **"Generate Payment File"**

**Time saved**: Manual payment list creation eliminated (10-15 minutes)

---

### Step 3: Process Payment (5 minutes)

1. **Export Payment File**: Download ABA file or CSV
2. **Upload to Bank**: Use your bank's payment upload
3. **Record in Xero** (if not using direct integration):
   - Mark bills as paid
   - Enter payment date and reference
4. **Sync Back**: Click "Sync from Xero" to update LedgerBot

**Time saved**: Batch payment processing vs. individual payments (30+ minutes for 10+ bills)

---

## Common Tasks

### Task 1: Verify New Supplier

**When**: First invoice from new supplier
**Time**: 2 minutes

1. **Check ABN**: Look at ABN field in bill details
2. **Validate**: System automatically validates via ABR
3. **Review Result**:
   ```
   ✓ Valid ABN: 53 004 085 616
     Entity: Example Pty Ltd
     GST Registered: Yes
   ```
4. **If Invalid**: Contact supplier for correct ABN
5. **Check Risk Level**: Should be "Low" for valid suppliers

**Why important**: Ensures GST compliance and prevents fraud

---

### Task 2: Handle Bank Account Change

**When**: Supplier requests payment to different account
**Time**: 5 minutes

1. **Check "Bank Changes" Filter**: New change will appear
2. **Review Details**:
   - Old account information
   - New account information
   - When change was detected
3. **Verify Change** (CRITICAL):
   - Call supplier on **known phone number** (not from email)
   - Confirm bank account change is legitimate
   - Get verbal or written confirmation
4. **Mark as Verified**:
   - Click "Verify" button
   - Select verification method (phone, email, written)
   - Add notes
5. **Approve for Payment**: Once verified, proceed normally

**⚠️ WARNING**: Bank account changes are a common fraud tactic. Always verify via phone call.

---

### Task 3: Resolve Duplicate Bill Warning

**When**: System flags potential duplicate
**Time**: 2 minutes

1. **Review Warning**: Click on bill with duplicate flag
2. **Compare Bills Side-by-Side**:
   - Invoice numbers
   - Dates
   - Amounts
   - Line items
3. **Determine**:
   - **Same Bill**: Reject new one, note duplicate
   - **Different Bill**: Add distinguishing reference, override flag
4. **Document Decision**: Add note explaining why not duplicate (if applicable)

**Common Scenario**: Monthly recurring bills (e.g., rent, subscriptions) - add month reference to distinguish.

---

### Task 4: Get Coding Suggestion

**When**: Unsure which expense account to use
**Time**: 30 seconds

1. **Upload Invoice** or **Select Bill**
2. **View Coding Suggestions**: Displayed automatically
3. **Review Suggestion**:
   ```
   Line: "Microsoft 365 Subscription"
   Suggested Account: 404 - Software & Subscriptions
   GST Treatment: GST on Expenses (INPUT2)
   Confidence: 85%
   Reasoning: Software/SaaS subscription with GST
   ```
4. **Accept or Override**: Click to accept or select different account

**Time saved**: No need to search chart of accounts or ask accountant for routine items.

---

### Task 5: Schedule Urgent Payment

**When**: Supplier needs payment before next payment run
**Time**: 3 minutes

1. **Find Bill**: Search or filter for supplier
2. **Click Bill**: Open details panel
3. **Check Status**:
   - Approved? → Proceed
   - Not approved? → Get approval first
4. **Create Ad-Hoc Payment**:
   - Click "Schedule Payment"
   - Select today or next business day
   - Generate payment file
   - Process immediately

**Time saved**: No need to wait for weekly payment run or process outside system.

---

## Time-Saving Features

### 1. Automatic Data Extraction

**Old way**: Manually type all invoice details (5-10 min per invoice)
**New way**: Upload PDF, AI extracts everything (30 sec review)

**Accuracy**: 85-95% depending on image quality
**Handles**:
- ✓ Supplier details (name, ABN, contact)
- ✓ Invoice metadata (number, dates, PO)
- ✓ All line items
- ✓ Amounts and GST calculations
- ✓ Bank account details

---

### 2. Automatic Risk Flagging

**Old way**: Manually check each bill for issues (3-5 min per bill)
**New way**: Instant risk assessment on every bill

**Flags automatically**:
- ✓ Missing ABN or approval
- ✓ Unusual amounts
- ✓ Inactive or blocked suppliers
- ✓ Invalid GST calculations
- ✓ Potential duplicates

---

### 3. Batch Payment Processing

**Old way**: Create individual payments in bank (2-3 min per payment)
**New way**: Bulk payment file (15 min for 20 payments)

**For 20 payments**:
- Old way: 40-60 minutes
- New way: 15 minutes
- **Time saved: 25-45 minutes per payment run**

---

### 4. Intelligent Coding Suggestions

**Old way**: Look up chart of accounts, decide category (1-2 min per line item)
**New way**: AI suggests based on description (instant)

**For 5 line items**:
- Old way: 5-10 minutes
- New way: 1-2 minutes (review only)
- **Time saved: 3-8 minutes per invoice**

---

### 5. ABN Validation

**Old way**: Go to ABR website, search, copy details (2-3 min per supplier)
**New way**: Automatic validation when bill uploaded

**Benefits**:
- Ensures GST compliance
- Verifies supplier legitimacy
- Checks GST registration
- **Time saved: 2-3 minutes per new supplier**

---

## Quick Reference: Filter Tabs

Use these filters to focus your work:

| Filter | When to Use | What It Shows | Action Required |
|--------|-------------|---------------|-----------------|
| **All** | General review | Every supplier with outstanding bills | Review as needed |
| **High Risk** | Before payment run | Suppliers with risk flags | Investigate before paying |
| **Bank Changes** | Daily morning check | Suppliers with new bank details | Verify via phone call |
| **Overdue** | Payment prioritization | Bills past due date | Schedule payment ASAP |

---

## Quick Reference: Risk Levels

| Level | Color | Meaning | Action |
|-------|-------|---------|--------|
| **Low** | Green | No issues detected | Pay normally |
| **Medium** | Yellow | Minor concerns | Quick review |
| **High** | Orange | Significant issues | Manual review required |
| **Critical** | Red | Major problems | Do not pay until resolved |

**Common Critical Flags**:
- Missing approval + large amount
- Blocked supplier
- Failed ABN validation
- Suspected duplicate

---

## Weekly Routine (30 minutes total)

### Monday (10 minutes)
- Sync from Xero
- Review new bills from previous week
- Check High Risk filter
- Verify any Bank Changes

### Wednesday (15 minutes)
- Generate payment run proposal
- Review and adjust bill selection
- Check total amount vs. cash position
- Export payment file

### Thursday (5 minutes)
- Process payments in bank
- Record payments in Xero
- Sync back to LedgerBot
- Confirm payment schedule completed

**Result**: Organized weekly payment cycle with minimal daily effort.

---

## Monthly Reconciliation (20 minutes)

### First Monday of Month

1. **Full Sync**: Sync from Xero to get all month-end data
2. **Review Metrics**:
   - Total Outstanding → Compare to last month
   - DPO → Is it increasing? Decreasing?
   - Ageing Chart → Review overdue buildup
3. **Supplier Review**:
   - Check all High Risk suppliers
   - Update supplier status if needed
   - Block inactive suppliers
4. **Payment Analysis**:
   - Review payment history
   - Check average payment time
   - Identify late payment patterns
5. **Documentation**:
   - Export reports for month-end
   - Save payment run records
   - File for BAS/tax preparation

---

## Keyboard Shortcuts & Tips

### Fast Navigation
- **Tab key**: Move between form fields
- **Enter**: Accept suggestion / Submit form
- **Esc**: Close detail panels

### Quick Actions
- **Double-click supplier**: Open detail panel
- **Click column header**: Sort table
- **Drag & drop**: Upload invoice

### Bulk Selection
- **Shift + Click**: Select range of bills
- **Ctrl/Cmd + Click**: Select multiple individual bills
- **Select All checkbox**: Select all visible bills

---

## Common Mistakes to Avoid

### ❌ Don't: Skip ABN Validation
**Why**: Required for GST compliance, prevents fraud
**Do**: Always check ABN is valid before first payment

### ❌ Don't: Ignore Bank Change Warnings
**Why**: #1 fraud vector in accounts payable
**Do**: Always verify via phone call on known number

### ❌ Don't: Pay High-Risk Bills Without Review
**Why**: May have missing information or approval
**Do**: Review risk flags and resolve before payment

### ❌ Don't: Forget to Sync Before Payment Run
**Why**: May miss recent Xero updates
**Do**: Always sync immediately before generating payment schedule

### ❌ Don't: Approve Bills Without Tax Invoice
**Why**: Cannot claim GST without valid tax invoice
**Do**: Request proper tax invoice before approval

### ❌ Don't: Override Duplicate Warnings Hastily
**Why**: May result in double payment
**Do**: Thoroughly compare before confirming not duplicate

---

## Troubleshooting Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| **Invoice won't upload** | Check file size <10MB, format is PDF/JPG/PNG |
| **Extraction inaccurate** | Re-scan at higher quality, manual entry |
| **ABN not validating** | Check format (11 digits), verify at abr.business.gov.au |
| **Coding suggestion wrong** | Override with correct account, system learns |
| **Xero sync failing** | Reconnect Xero in Settings → Integrations |
| **Risk level seems wrong** | Review risk factors, add missing info to reduce score |
| **Payment schedule empty** | Check date range, ensure bills are approved |
| **Can't find supplier** | Use search box, check "All" filter active |

---

## Getting Help

### In-App Help
- **Hover tooltips**: Hover over fields for explanations
- **Warning messages**: Click for detailed recommendations
- **Risk flags**: Click to see why item flagged

### Documentation
- [Detailed AP Agent Guide](./user-guide-ap-agent-overview.md) - Complete feature reference
- [Xero Integration Setup](./user-guide-xero-integration.md) - Connect Xero account
- [Risk Management Guide](./user-guide-ap-risk-management.md) - Fraud prevention

### Support
- **Email**: support@ledgerbot.com.au
- **Chat**: Available in-app (bottom right corner)
- **Documentation**: docs.ledgerbot.com.au

---

## Success Checklist

After using the AP Agent for 1 month, you should see:

- ✅ **Time savings**: 30-60 minutes per week
- ✅ **Fewer errors**: Automatic validation catches mistakes
- ✅ **Better relationships**: On-time payments to suppliers
- ✅ **Fraud prevention**: Bank changes verified before payment
- ✅ **GST compliance**: All bills have valid ABN and tax invoice
- ✅ **Cash flow visibility**: Know exactly what's owed and when
- ✅ **Payment efficiency**: Batch processing vs. individual payments
- ✅ **Audit trail**: Complete history of bills, approvals, payments

---

## Next Steps

### Week 1: Setup
- Connect Xero (if not already)
- Sync existing bills
- Review and categorize suppliers
- Set up approval thresholds

### Week 2: Daily Use
- Process new invoices as received
- Upload or sync daily
- Review High Risk filter daily
- Get comfortable with interface

### Week 3: Payment Runs
- Schedule first payment run
- Generate payment file
- Process in bank
- Sync back and reconcile

### Week 4: Optimization
- Review time savings
- Adjust workflows
- Set up reporting
- Train team members

**Goal**: By week 4, AP processing should be 50% faster with fewer errors.

---

**Quick Start Checklist**:
1. ✅ Read this guide (15 minutes)
2. ✅ Open AP Agent and explore (10 minutes)
3. ✅ Sync from Xero or upload first invoice (5 minutes)
4. ✅ Review dashboard and filters (5 minutes)
5. ✅ Schedule weekly payment run (15 minutes)
6. ✅ Process payment and sync back (5 minutes)

**Total time to productive use**: ~1 hour

---

**Related Guides**:
- [Detailed AP Agent Guide](./user-guide-ap-agent-overview.md)
- [Personalisation Settings](./user-guide-personalisation-overview.md)
- [Xero Integration](./user-guide-xero-integration.md)

**Last Updated**: December 2025
