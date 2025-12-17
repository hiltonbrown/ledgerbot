# Workflow 6: Variance Analysis and Commentary

## Overview

LedgerBot's variance analysis workflow automatically compares actual results against budget, identifies significant variances, analyses underlying transaction patterns to determine root causes, and generates plain-English commentary explaining material movements for management reports.

This workflow transforms raw financial data into actionable insights, saving hours of manual analysis and ensuring management receives clear, comprehensive explanations of financial performance.

## How It Works

1. **Data Comparison**: LedgerBot retrieves actual results from Xero and compares against budget/forecast data
2. **Variance Identification**: Calculates variances in both dollar and percentage terms, flagging material differences
3. **Pattern Analysis**: Drills into transaction details to understand why variances occurred
4. **Root Cause Determination**: Identifies specific invoices, timing differences, or business events causing variances
5. **Commentary Generation**: Produces clear, professional explanations suitable for board reports or management reviews

## Prerequisites

- Active Xero connection established
- Budget data entered in Xero or provided to LedgerBot
- At least one month of actual transaction data to compare

## Step-by-Step Guide

### 1. Define Comparison Parameters

Specify what you want to compare:
- Actual vs Budget for a specific period
- Current period vs previous period (month, quarter, year)
- Current year to date vs previous year to date
- Actual vs forecast/projection

### 2. Request Variance Analysis

Use one of the example prompts to initiate the analysis. Be specific about the period and what you want to focus on.

### 3. Review Variance Report

LedgerBot presents:
- Summary of major variances (revenue, expenses, profit)
- Detailed breakdown by account category
- Material variances with explanations
- Transaction-level details for significant movements

### 4. Request Deeper Analysis

For variances that need more explanation:
- Ask for specific transaction listings
- Request comparison to industry benchmarks
- Explore trends over multiple periods
- Investigate customer or supplier-specific impacts

### 5. Generate Management Commentary

Approve the final commentary for inclusion in your management reports, board papers, or stakeholder communications.

## Example Prompts

### Prompt 1: Monthly Budget Variance
```
Compare our actual results for October 2024 against budget. Focus on revenue
and expense variances greater than $5,000 or 10%. For each material variance,
explain what caused it and whether it's a timing issue, volume issue, or
pricing issue.
```

### Prompt 2: Year-on-Year Comparison
```
Compare our profit and loss for the 6 months ended 31 December 2024 against
the same period last year. Show me revenue growth by category, major expense
increases, and explain the key drivers of our improved profit margin.
```

### Prompt 3: Quarter-End Board Report
```
Prepare variance commentary for our Q2 FY2025 board report. Compare actual
results to budget and explain: (1) why revenue is 8% below budget, (2) why
staff costs are 12% over budget, and (3) why our net profit margin improved
despite revenue shortfall. Keep explanations concise and business-focused.
```

### Prompt 4: Customer Revenue Analysis
```
Analyse revenue for November 2024 versus November 2023. Break down the
variance by customer: which customers bought more, which bought less, which
are new customers, and which customers did we lose? Quantify the impact of
each category on total revenue variance.
```

### Prompt 5: Expense Category Deep Dive
```
Our marketing expenses for Q1 were $45,000 against a budget of $30,000.
Analyse all transactions in the marketing account category. Show me what
we spent money on, which expenses were planned vs unplanned, and provide
a detailed breakdown I can present to the CFO.
```

## Tips and Best Practices

### Setting Materiality Thresholds
Define what's "material" for your business:
- **Dollar threshold**: "Flag variances over $2,000"
- **Percentage threshold**: "Flag variances over 15%"
- **Combined**: "Flag variances over $1,000 AND 10%"

Scale thresholds to your business size. A $5,000 variance might be immaterial for a $10M business but critical for a $500K business.

### Variance Categories

LedgerBot identifies different types of variances:

**Volume Variance**: Selling more/fewer units
- "Revenue variance due to selling 150 units vs budgeted 120 units"

**Price Variance**: Price changes vs budget
- "Revenue variance due to average price of $85 vs budgeted $80"

**Timing Variance**: Period recognition differences
- "Large invoice raised in October vs budgeted for November"

**Mix Variance**: Product/service mix changes
- "Higher proportion of premium service sales vs standard"

**Efficiency Variance**: Cost per unit differences
- "Materials cost per unit increased from $12 to $14"

**One-Off Events**: Non-recurring items
- "Included $15,000 redundancy payment not in budget"

### Structuring Commentary

**Executive Summary Format:**
```
Revenue was $485K against budget of $520K, a negative variance of $35K (6.7%).
This was primarily due to: (1) delayed project commencement for Client ABC
($25K), expected to reverse in November, and (2) lower than expected new
customer acquisition ($10K). Expenses were on budget at $380K. Net profit
of $105K was 25% below budget due to revenue shortfall.
```

**Detailed Format:**
Include specific numbers, transaction references, and business context.

### Period-End Analysis Checklist
- [ ] Review all revenue accounts vs budget
- [ ] Review all major expense categories vs budget
- [ ] Identify and explain variances >10% or >$X
- [ ] Check for timing differences (accruals, prepayments)
- [ ] Verify one-off items are correctly classified
- [ ] Compare key ratios (gross margin, net margin, etc.)
- [ ] Prepare forward-looking commentary on trends

### Common Scenarios

**Timing Variances**: "This variance is timing-related. We budgeted $50K revenue in March but the invoice was raised in April. Year-to-date impact is nil."

**Seasonal Patterns**: "December revenue is always 30% higher than other months due to pre-Christmas orders. This variance against budget is consistent with historical patterns."

**Cost Increases**: "Employee costs are 8% over budget due to: (1) wage increase of 4% granted in July not in original budget, and (2) hiring of additional support staff in September."

**Customer-Specific**: "The revenue shortfall is entirely attributable to Project XYZ with MegaCorp being placed on hold in August. Excluding this project, revenue is 2% ahead of budget."

## Common Questions

**Q: Can LedgerBot compare to last year if we don't have a formal budget?**
A: Yes, prior period comparison is often just as valuable as budget comparison. LedgerBot can compare against any prior period.

**Q: What if budget data is in a spreadsheet, not in Xero?**
A: Upload your budget spreadsheet as a context file and LedgerBot can use it for comparison.

**Q: Can it handle multiple cost centres or departments?**
A: Yes, if you use tracking categories in Xero, LedgerBot can analyse variances by department, location, or project.

**Q: How technical should the commentary be?**
A: Tell LedgerBot your audience: "Write this for the board" (strategic, high-level) vs "Write this for the CFO" (detailed, technical) vs "Write this for operational managers" (actionable, department-specific).

**Q: Can it identify trends over multiple periods?**
A: Yes, LedgerBot can analyse trends over any timeframe and identify patterns: improving, deteriorating, seasonal, volatile, etc.

## Related Workflows

- **Workflow 3**: Cash Flow Forecasting (use variance insights to improve forecasts)
- **Workflow 8**: Month-End Procedures (variance analysis as part of close)
- **Workflow 4**: Debtor Follow-Up (analyse customer revenue patterns)
- **Workflow 1**: Invoice Processing (understand expense variance drivers)

## Advanced Usage

### Multi-Period Trend Analysis
```
Analyse our gross profit margin for each month from January to December 2024.
Show me the trend line, identify which months were above/below average, and
explain the factors driving margin fluctuations. Include comparison to our
budgeted margin of 42%.
```

### Ratio Analysis
```
Calculate and compare these financial ratios for Q3 2024 vs Q3 2023:
(1) gross profit margin, (2) net profit margin, (3) operating expense ratio,
(4) return on sales. Explain what drove any significant changes in these ratios.
```

### Customer Profitability Variance
```
Compare customer profitability between this year and last year. Show me which
customers became more profitable, which became less profitable, and what drove
those changes (revenue growth, pricing changes, cost to serve changes, etc.).
```

### Department/Cost Centre Comparison
```
We have 4 cost centres: Sales, Operations, Administration, and IT. Compare
each cost centre's actual expenses against budget for the year to date.
Rank them by budget compliance and explain the major variances in each.
```

### Bridge Analysis
```
Our net profit increased from $85K last year to $125K this year. Create a
"bridge" or waterfall analysis showing how we got from $85K to $125K. Break
down the contributions from: revenue growth, gross margin improvement, expense
reduction, and one-off items.
```

### Forecast vs Actual
```
In July we forecast Q3 revenue would be $420K. Actual Q3 revenue was $385K.
Analyse the variance between our forecast and actual results. Show me which
assumptions in the forecast proved incorrect and what we can learn for future
forecasting.
```

## Report Templates

LedgerBot can format variance commentary in various styles:

### Board Report Format
High-level, strategic, focuses on key decisions and trends

### Management Report Format
Detailed, operational, includes action items and accountability

### Investor Report Format
Performance-focused, includes comparisons to projections and market context

### Internal Department Format
Specific to department leaders, focuses on controllable variances

Specify your preferred format: "Generate this variance analysis in board report format"

## Technical Notes

This workflow uses LedgerBot's Analytics agent with comparative analysis capabilities. The system can perform complex SQL-like queries on Xero data to drill into transaction details.

For technical implementation details, developers can refer to:
- `app/agents/analytics/` - Analytics agent architecture
- `lib/ai/tools/xero-tools.ts` - Xero financial data retrieval
- Variance analysis algorithms use statistical methods for trend identification
