# Workflow 7: Payroll Exception Monitoring

## Overview

LedgerBot's payroll exception monitoring workflow reviews timesheets against employment contracts, flags unusual hours or leave patterns, identifies missing superannuation payments, verifies award compliance for allowances and penalties, and alerts when payroll data requires review before processing.

This workflow reduces payroll errors, ensures compliance with Australian workplace laws, and provides peace of mind that your employees are being paid correctly and legally.

## How It Works

1. **Data Review**: LedgerBot accesses timesheet data, employment contracts, and pay run information from Xero or integrated systems
2. **Contract Verification**: Compares actual hours, rates, and entitlements against employment agreements
3. **Pattern Detection**: Identifies unusual hours, overtime, leave patterns, or data anomalies
4. **Compliance Checking**: Verifies superannuation calculations, award compliance, and legislative requirements
5. **Exception Flagging**: Alerts you to items requiring review before finalising the pay run

## Prerequisites

- Active Xero connection (ideally with Xero Payroll)
- Employment contract details or award information
- Timesheet data (from integrated time tracking or manual entry)
- Superannuation fund details

## Step-by-Step Guide

### 1. Pre-Payroll Review

Before processing your pay run, request a payroll exception review from LedgerBot.

### 2. Review Flagged Items

LedgerBot presents exceptions in categories:
- **Critical**: Must be fixed before processing (e.g., missing super, award breaches)
- **Warning**: Should be reviewed (e.g., unusual overtime, leave anomalies)
- **Informational**: For awareness (e.g., approaching leave accrual caps)

### 3. Investigate Exceptions

For each flagged item:
- Review the specific employee and issue
- Check source documents (timesheets, leave requests, contracts)
- Determine if correction needed or exception is valid

### 4. Make Corrections

Correct any errors:
- Adjust timesheet hours
- Update pay rates or allowances
- Process missed entitlements
- Correct superannuation calculations

### 5. Final Verification

Once corrections made, request a final review before approving the pay run.

## Example Prompts

### Prompt 1: Pre-Payroll Exception Check
```
I'm about to process this week's payroll. Review all employee timesheets
and flag any exceptions: unusual overtime, missing super, incorrect rates,
or award compliance issues. Show me anything I should check before approving
the pay run.
```

### Prompt 2: Superannuation Compliance
```
Review superannuation for all employees for the quarter ending 31 December
2024. Verify: (1) super calculated at correct rate (11.5%), (2) all employees
earning over $450/month have super calculated, (3) no missed super payments,
and (4) all payments made by the 28th day deadline.
```

### Prompt 3: Award Compliance Check
```
We have 3 employees covered by the Fast Food Industry Award. Review their
pay for this fortnight and verify: (1) minimum hourly rates are correct,
(2) weekend and public holiday penalty rates applied correctly, (3) junior
rates applied correctly based on age, and (4) all required allowances included.
```

### Prompt 4: Leave Accrual Verification
```
Review leave accruals for all full-time employees. Check: (1) annual leave
accruing at 4 weeks per year, (2) sick leave accruing at 10 days per year,
(3) long service leave accruing correctly for employees with 7+ years service,
and (4) flag any employees approaching maximum leave accrual caps.
```

### Prompt 5: Unusual Hours Pattern
```
Sarah Johnson has submitted a timesheet showing 65 hours for this week,
including 25 hours of overtime. This is unusual for her - she normally works
38 hours. Review her timesheets for the past month and flag if this appears
to be a data entry error or a genuine busy period.
```

## Tips and Best Practices

### Set Up Baseline Data

Provide LedgerBot with key employment information:
```
Employee baseline data:
- John Smith: Full-time, 38 hrs/week, $75,000 salary, no overtime applicable
- Sarah Chen: Part-time, 24 hrs/week, $32/hour, overtime at 1.5x after 38 hrs/week
- Mike Jones: Casual, $28/hour + 25% loading, no leave entitlements
- Emma Brown: Full-time, Fast Food Award Level 3, weekend penalties apply
```

### Common Exception Types

**Hours Anomalies:**
- Employee worked significantly more/fewer hours than normal
- Overtime not pre-approved or exceeding limits
- Timesheet missing or incomplete
- Hours don't match shift roster

**Rate Issues:**
- Incorrect base rate applied
- Missing penalty rates (weekend, public holiday, night shift)
- Allowances not included (travel, meal, tools)
- Junior/apprentice rates incorrect

**Leave Problems:**
- Leave taken but not deducted from accrual
- Leave payment at incorrect rate
- Public holiday not paid for eligible employees
- Leave loading missing from annual leave payout

**Super Issues:**
- Super calculated at wrong rate
- Employee below $450/month threshold incorrectly included/excluded
- Super not calculated on ordinary time earnings
- Payment missed or late

**Award/Contract Breaches:**
- Employee paid below award minimum
- Required allowances not paid
- Break requirements not met
- Minimum shift length not honoured

### Regular Review Schedule

**Weekly (before each pay run):**
- Exception check on current timesheet data
- Verification of any unusual hours or leave

**Monthly:**
- Superannuation calculation verification
- Leave accrual reconciliation
- Year-to-date earnings check against contracts

**Quarterly:**
- Comprehensive super compliance review
- Award rate updates check
- Leave liability review

**Annually:**
- Annual leave accrual verification
- Long service leave eligibility check
- Payroll tax threshold monitoring
- FBT implications review

### Award Compliance

For award-covered employees, provide award details:
```
Fast Food Industry Award requirements:
- Level 1: $22.45/hour base rate
- Level 2: $23.10/hour base rate
- Saturday: 125% of base rate
- Sunday: 150% of base rate
- Public holidays: 250% of base rate
- Evening (after 7pm): +15% loading
- Minimum shift: 3 hours
```

### Documentation

For each flagged exception, LedgerBot can help document:
- What the issue is
- Which employee is affected
- What the correct treatment should be
- Whether correction is needed
- Approval trail for unusual items

## Common Questions

**Q: Does LedgerBot integrate directly with Xero Payroll?**
A: LedgerBot can read payroll data from Xero Payroll API. Check-in with specific payroll features as this area is under development.

**Q: Can it handle different award classifications?**
A: Yes, provide the award details and LedgerBot will check compliance against those specific rates and conditions.

**Q: What if employees use external time tracking (like Deputy or Tanda)?**
A: You can upload timesheet exports as context files for LedgerBot to review.

**Q: Does it understand salary sacrifice and other deductions?**
A: LedgerBot can verify that deductions match employment agreements and are within legal limits.

**Q: Can it check Single Touch Payroll (STP) compliance?**
A: LedgerBot can verify that data matches STP requirements before you submit your STP report.

## Related Workflows

- **Workflow 8**: Month-End Procedures (payroll accruals and provisions)
- **Workflow 9**: GST/BAS Preparation (PAYG withholding reporting)
- **Workflow 6**: Variance Analysis (payroll cost variance analysis)

## Advanced Usage

### Payroll Cost Analysis
```
Compare our total payroll cost for this month against budget and against
last month. Break down the variance into: (1) headcount changes, (2) overtime
increases, (3) rate changes, and (4) other factors. Show me which departments
are over/under budget.
```

### Leave Liability Report
```
Calculate our total leave liability as at 31 December 2024. Show me:
(1) annual leave days and dollar value by employee, (2) sick leave accrual,
(3) long service leave for eligible employees, and (4) total provision
required for balance sheet.
```

### Super Guarantee Charge (SGC) Risk
```
Review all super payments for the September quarter 2024. Identify any
employees where super was not paid by 28 October deadline. Calculate the
SGC penalty we would face including nominal interest and admin fee.
```

### Award Rate Update Impact
```
The Fast Food Award rates increased 5.75% from 1 July 2024. Review all
award-covered employees and verify their rates were updated correctly.
Calculate the budget impact of the award increase.
```

### Termination Payment Verification
```
We're terminating Emma Brown's employment effective 31 January 2025. Calculate
her final pay entitlements: (1) outstanding annual leave (18 days), (2) pro-rata
long service leave (she has 9 years service), (3) notice period payment
(4 weeks), and (4) verify all super is up to date.
```

### Compliance Checklist
```
Generate a payroll compliance checklist covering: (1) all employees have
signed contracts, (2) all employees have complying super funds, (3) TFN
declarations on file, (4) Fair Work Information Statement provided,
(5) award/agreement details documented, (6) all super payments made on time
for the past year.
```

## Key Australian Payroll Rules

### Superannuation
- **Rate**: 11.5% from 1 July 2024 (increasing to 12% by 2025)
- **Threshold**: $450/month minimum (before super is required)
- **Payment deadline**: 28 days after quarter end
- **Base**: Ordinary time earnings (not overtime for most awards)

### Annual Leave
- **Full-time accrual**: 4 weeks (152 hours) per year
- **Leave loading**: 17.5% on leave taken (if applicable)
- **Cashing out**: Limited to specific circumstances under Fair Work Act

### Sick/Carer's Leave
- **Accrual**: 10 days per year for full-time
- **Unpaid carer's leave**: 2 days per occasion

### Long Service Leave
- **Eligibility**: Varies by state (typically 7-10 years)
- **Accrual**: Approximately 8.67 weeks after 10 years (varies by state)

### Fair Work Minimums
- **National Minimum Wage**: $24.10/hour (from 1 July 2024)
- **Casual loading**: Typically 25% (varies by award)
- **Maximum weekly hours**: 38 hours for full-time

## Technical Notes

This workflow uses LedgerBot's compliance verification capabilities combined with Xero Payroll data access. The system applies Australian workplace law rules and award interpretations.

For technical implementation details, developers can refer to:
- `lib/ai/tools/xero-tools.ts` - Xero Payroll API access
- `app/agents/compliance/` - Compliance assistant agent
- Award compliance rules are maintained in the AI system prompt
- Regulatory document references in `lib/db/schema.ts` (RegulatoryDocument table)
