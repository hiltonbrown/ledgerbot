# Workflow 25: Client Portfolio Risk Assessment

## Overview

LedgerBot's client portfolio risk assessment workflow analyses financial health indicators across your entire client base (liquidity ratios, solvency metrics, cash burn rates, trading patterns), identifies clients showing signs of financial stress, flags potential going concern issues early, and generates risk-rated client lists enabling proactive conversations and appropriate engagement letter adjustments.

This workflow enables proactive client management, reduces practice risk from client failures, supports appropriate fee protection strategies, and facilitates early intervention conversations that can save client relationships.

## How It Works

1. **Portfolio Scanning**: Analyzes financial metrics across all clients
2. **Risk Scoring**: Calculates risk ratings based on multiple indicators
3. **Trend Analysis**: Identifies deteriorating financial positions
4. **Alert Generation**: Flags high-risk clients for immediate attention
5. **Recommendation Engine**: Suggests engagement adjustments and interventions

## Prerequisites

- Xero connections for client portfolio
- Access to client financial statements
- Historical data (minimum 12 months preferred)
- Understanding of each client's industry and circumstances

## Example Prompts

### Prompt 1: Portfolio-Wide Risk Assessment
```
Analyze financial health across our entire client portfolio (87 clients with Xero
connections). For each client calculate: (1) current ratio and quick ratio (liquidity),
(2) debt-to-equity ratio (leverage), (3) working capital position and trend, (4) cash
burn rate (if loss-making), (5) debtor days and creditor days trends. Generate risk
score (1-10, where 10=highest risk) based on these metrics. Produce risk-rated client
list showing: High Risk (score 8-10), Medium Risk (score 5-7), Low Risk (score 1-4).
Flag clients requiring immediate attention.
```

### Prompt 2: Going Concern Assessment
```
Identify clients in our portfolio showing potential going concern indicators. Check
for: (1) negative working capital, (2) operating losses for consecutive periods,
(3) inability to pay debts as they fall due (high creditor days, overdue payables),
(4) breaching loan covenants or financing difficulties, (5) loss of key customers/
suppliers, (6) rapid cash depletion. For each client flagged, quantify the severity
(e.g., "12 months cash at current burn rate") and recommend action (engagement letter
amendment, client conversation, withdrawal consideration).
```

### Prompt 3: Industry-Specific Risk Factors
```
Segment our retail/hospitality clients (24 clients) and analyze sector-specific risk
indicators: (1) sales trends (declining revenue red flag), (2) gross margin erosion
(input cost pressures), (3) inventory turnover (slow-moving stock), (4) rent as %
of revenue (occupancy cost sustainability), (5) cash conversion cycle. Compare each
client to industry benchmarks. Identify clients underperforming sector norms and
facing elevated risk due to industry challenges.
```

### Prompt 4: Payment Behavior Analysis
```
Analyze our clients' payment behavior over past 12 months as risk indicator. For each
client track: (1) invoice payment timeliness (average days to pay our fees), (2)  
payment pattern changes (getting slower?), (3) payment disputes or queries, (4)
outstanding fees >90 days. Clients with deteriorating payment behavior often reflect
underlying financial stress. Generate report showing clients where payment behavior
suggests financial difficulty, ranked by total fees outstanding and behavioral
deterioration.
```

### Prompt 5: Quarterly Portfolio Review Report
```
Generate quarterly portfolio health report for partners showing: (1) overall portfolio
risk distribution (how many clients in each risk category), (2) movement analysis
(clients that moved up/down in risk rating this quarter), (3) top 10 highest risk
clients with specific concerns, (4) industry trends affecting client groups, (5)
aggregate exposure (total WIP and debtors for high-risk clients), (6) recommended
actions (engagement adjustments, fee protection, client conversations). Format for
partner meeting discussion.
```

## Tips and Best Practices

### Risk Indicators by Category

**Liquidity Indicators:**
- Current ratio <1.0 (can't cover short-term obligations)
- Quick ratio <0.5 (excluding inventory, severe liquidity stress)
- Negative working capital
- Declining cash balances month-over-month

**Solvency Indicators:**
- Debt-to-equity >3.0 (highly leveraged)
- Negative equity (liabilities exceed assets)
- Consecutive operating losses
- Inability to service debt (interest cover <1.5)

**Operational Indicators:**
- Declining revenue trend (>20% year-on-year)
- Gross margin compression
- Increasing debtor days (cash collection slowing)
- Increasing creditor days (delaying supplier payments)

**Cash Flow Indicators:**
- Negative operating cash flow
- High cash burn rate relative to reserves
- Months of cash runway <6 months
- Inability to pay statutory obligations (super, tax)

### Risk Score Methodology

**Risk Score Calculation (1-10 scale):**

Base score: 5 (neutral)

Add points for risk factors:
- Current ratio <1.0: +2 points
- Negative equity: +3 points  
- Consecutive losses (2+ periods): +2 points
- Cash runway <6 months: +2 points
- Declining revenue >20%: +1 point
- Payment behavior deteriorating: +1 point

Subtract points for strength factors:
- Current ratio >2.0: -1 point
- Strong profitability (net margin >15%): -2 points
- Positive cash generation: -1 point
- Growing revenue: -1 point

Final score capped at 1 (minimum) and 10 (maximum)

**Risk Rating Categories:**
- **Low Risk (1-4)**: Financially sound, normal monitoring
- **Medium Risk (5-7)**: Some concerns, enhanced monitoring
- **High Risk (8-10)**: Serious concerns, immediate action

### Early Warning Conversations

**Medium Risk Clients:**
- Proactive check-in: "How's business tracking? Any challenges we should discuss?"
- Offer value-add: "Would cash flow forecasting or scenario planning help?"
- Fee protection: Consider requesting deposits for significant work

**High Risk Clients:**
- Direct conversation: "We've noticed some concerning financial trends..."
- Assess viability: Is the business salvageable with intervention?
- Engagement terms: "We need to discuss payment arrangements and our ongoing role"
- Document advice: Ensure file notes of concerns raised and advice given

**Critical Risk Clients:**
- Formal notification: Letter outlining concerns and required actions
- Fee protection: Work only for payment in advance, clear outstanding fees
- Withdrawal consideration: Assess whether continuing engagement appropriate
- Professional obligations: Consider APES 110 independence implications if audit client

### Engagement Letter Adjustments

**Standard Terms (Low Risk):**
- Normal payment terms (14-30 days)
- Monthly billing
- No deposit required

**Enhanced Terms (Medium Risk):**
- Shorter payment terms (7-14 days)
- Payment in advance for project work
- Regular WIP review and interim billing

**Protected Terms (High Risk):**
- Payment in advance mandatory
- Clear outstanding before new work
- Reduced credit limit
- Consider withdrawal if terms not acceptable

## Related Workflows

- **Workflow 23**: Automated Management Reporting (client financial monitoring)
- **Workflow 21**: Financial Statement Preparation (annual health check)
- **Workflow 30**: Scenario Modeling (turnaround planning for stressed clients)

## Technical Notes

This workflow uses portfolio-wide analysis across multiple Xero connections with risk scoring algorithms based on financial ratios and trend analysis. The system can track client risk scores over time to identify deterioration patterns.

For technical implementation details, developers can refer to:
- Multi-entity data aggregation across client portfolio
- Risk scoring engine with configurable weightings
- Trend detection algorithms for deterioration identification
- Automated alerting for threshold breaches
