# Workflow 3: Real-Time Cash Flow Forecasting

## Overview

LedgerBot's cash flow forecasting workflow continuously monitors your accounts receivable, accounts payable, and historical payment patterns to generate rolling 13-week cash flow forecasts. The forecasts automatically update as new invoices are raised or payments received in Xero, giving you real-time visibility into your future cash position.

This workflow helps you make informed decisions about spending, hiring, and investments by showing you exactly when cash will be tight and when you'll have surplus funds.

## How It Works

1. **Data Collection**: LedgerBot retrieves current cash balances, outstanding invoices, unpaid bills, and historical payment patterns from Xero
2. **Pattern Analysis**: Analyses how quickly customers typically pay and when you usually pay suppliers
3. **Forecast Generation**: Projects weekly cash in/out for the next 13 weeks based on due dates and payment probabilities
4. **Scenario Modeling**: Allows you to test "what-if" scenarios (new expenses, delayed payments, etc.)
5. **Ongoing Updates**: Automatically refreshes forecasts as your Xero data changes

## Prerequisites

- Active Xero connection established
- At least 3 months of historical transaction data for accurate pattern analysis
- Current outstanding invoices and bills in Xero

## Step-by-Step Guide

### 1. Request Initial Forecast

Use one of the example prompts to generate your first 13-week cash flow forecast. LedgerBot will analyse your current position and project forward.

### 2. Review the Forecast

LedgerBot presents:
- Week-by-week projected opening balance, receipts, payments, and closing balance
- Identification of any weeks where cash may be negative
- Confidence intervals based on historical payment variability
- Key assumptions used in the forecast

### 3. Explore Scenarios

Test different scenarios:
- "What if that major customer pays 30 days late?"
- "Can I afford to purchase new equipment for $25,000 next month?"
- "What if I hire an additional employee at $75,000 per year?"

### 4. Set Up Alerts

Ask LedgerBot to monitor your forecast and alert you when:
- Projected cash falls below a certain threshold
- A major invoice becomes overdue
- Unexpected payments impact your forecast

### 5. Regular Updates

Schedule regular forecast updates (weekly or fortnightly) to stay on top of your cash position.

## Example Prompts

### Prompt 1: Basic 13-Week Forecast
```
Generate a 13-week cash flow forecast starting from today. Include all
outstanding invoices, unpaid bills, and use our historical payment patterns
to predict when customers will actually pay versus when invoices are due.
```

### Prompt 2: Scenario Planning - Major Purchase
```
Show me our current 13-week cash flow forecast. Then show me how it would
change if we purchase new machinery for $85,000 in week 3. Will we have
sufficient cash, or should we consider financing?
```

### Prompt 3: Customer Payment Delay Impact
```
Our largest customer (Acme Corp) has invoices totalling $45,000 due in the
next two weeks, but they've told us payment will be 30 days late. Update
my cash flow forecast to reflect this delay and show me the impact on our
cash position.
```

### Prompt 4: Weekly Forecast with Alerts
```
Prepare a cash flow forecast for the next 13 weeks and alert me to any
weeks where our closing cash balance falls below $50,000. For those weeks,
show me which payments are due so I can consider deferring them.
```

### Prompt 5: Comparative Forecast
```
Generate our 13-week cash flow forecast and compare it to the forecast you
created last month. Show me what has changed and explain the key factors
affecting our cash position (new sales, delayed payments, unexpected
expenses, etc.).
```

## Tips and Best Practices

### Improve Forecast Accuracy
- Keep invoice due dates realistic in Xero
- Record bills as soon as received, even if not yet approved
- Update payment terms for customers who consistently pay late or early
- Include recurring expenses (subscriptions, payroll, loan repayments)

### Understand Payment Patterns
- LedgerBot analyses Days Sales Outstanding (DSO) by customer
- Review the average payment delay: "Which customers consistently pay late?"
- Identify seasonal patterns: "Do customers pay slower in December/January?"

### Use for Decision Making
- **Hiring decisions**: "Can we afford a new employee at $X per year?"
- **Capital purchases**: "When is the best time to buy that equipment?"
- **Payment timing**: "Should I delay this supplier payment by a week?"
- **Credit management**: "Can I extend credit to this new customer?"

### Regular Review Cadence
- **Weekly**: Quick forecast refresh during your admin time
- **Monthly**: Detailed review as part of month-end procedures
- **Quarterly**: Strategic review for longer-term planning

### Handle Common Scenarios

**Seasonal Businesses**: "Our sales are 70% higher in Q4. Adjust the forecast to reflect this seasonal pattern based on last year's data"

**New Customers**: "We've signed a new customer worth $30,000/month starting next month. Add this to the forecast assuming 30-day payment terms"

**One-Off Events**: "We're receiving a tax refund of $18,000 in week 5. Add this to the forecast"

**Loan Repayments**: "Include our business loan repayment of $2,500/month in the cash outflows"

## Common Questions

**Q: How accurate are the forecasts?**
A: Accuracy improves with more historical data. Forecasts include confidence intervals showing best-case and worst-case scenarios based on your payment pattern variability.

**Q: Does it account for GST/BAS payments?**
A: Yes, LedgerBot can include projected BAS payments based on your activity cycle and typical tax position.

**Q: Can I export the forecast to Excel?**
A: Yes, you can request the forecast in spreadsheet format and download it for further analysis or sharing with stakeholders.

**Q: What if my business is new with limited history?**
A: LedgerBot will use industry benchmarks and explicitly stated payment terms. As you build history, forecasts will become more personalised and accurate.

**Q: Does it update automatically?**
A: The forecast data comes from Xero in real-time, but you need to request a fresh forecast to see updates. You can schedule regular updates.

## Related Workflows

- **Workflow 4**: Automated Debtor Follow-Up (improve cash receipts timing)
- **Workflow 6**: Variance Analysis (compare actual vs forecast)
- **Workflow 9**: GST/BAS Preparation (include tax payments in forecast)
- **Workflow 8**: Month-End Procedures (review forecast as part of monthly close)

## Advanced Usage

### Multi-Scenario Comparison
```
Create three cash flow forecasts: (1) base case using current assumptions,
(2) pessimistic case where customers pay 15 days later on average, and
(3) optimistic case where we win the tender for $120,000 starting next month.
```

### Cash Flow KPIs
```
Based on my 13-week forecast, calculate: (1) minimum cash balance and when
it occurs, (2) maximum cash balance and when it occurs, (3) average weekly
cash burn rate, and (4) number of weeks until we need additional funding.
```

### Debtor Age Analysis Impact
```
Show me how much cash is tied up in overdue invoices. If we collected all
invoices over 60 days old, how would that improve our cash position over
the next 13 weeks?
```

### Sensitivity Analysis
```
I'm concerned about customer payment timing. Show me how sensitive our cash
flow forecast is to a 10-day delay in average customer payment times.
```

## Technical Notes

This workflow uses LedgerBot's Forecasting agent with statistical analysis of payment patterns. The system calculates probability-weighted cash flows based on your historical data.

For technical implementation details, developers can refer to:
- `app/agents/forecasting/` - Forecasting agent architecture
- `lib/ai/tools/xero-tools.ts` - Xero invoice and bill data retrieval
- Cash flow modeling algorithms in the forecasting agent
- `docs/risk-algorithm.md` - Related risk scoring methodology
