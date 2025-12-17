# Workflow 13: Supplier Performance Tracking

## Overview

LedgerBot's supplier performance tracking workflow tracks supplier payment terms versus actual payment dates, identifies suppliers offering early payment discounts, calculates the true cost of various payment timing strategies, and recommends optimal payment scheduling to maximise working capital while maintaining relationships.

This workflow helps you optimize cash flow, take advantage of early payment discounts when financially beneficial, identify unreliable suppliers, and make data-driven decisions about supplier relationships.

## How It Works

1. **Payment Pattern Analysis**: LedgerBot tracks when bills are due versus when you actually pay them
2. **Discount Identification**: Identifies suppliers offering early payment discounts and calculates the ROI
3. **Cost-Benefit Calculation**: Compares the cost of early payment (opportunity cost of cash) versus discount savings
4. **Reliability Scoring**: Tracks supplier delivery performance, invoice accuracy, and responsiveness
5. **Optimization Recommendations**: Suggests which suppliers to pay early, on-time, or strategically delay

## Prerequisites

- Active Xero connection established
- Supplier bills entered in Xero with due dates
- Payment history (at least 3-6 months for meaningful analysis)
- Optional: Early payment discount terms documented

## Step-by-Step Guide

### 1. Review Supplier Payment History

Request analysis of payment patterns for all suppliers or specific key suppliers.

### 2. Identify Discount Opportunities

LedgerBot flags suppliers offering early payment discounts (e.g., "2/10 net 30" meaning 2% discount if paid within 10 days).

### 3. Calculate True Cost/Benefit

For each discount opportunity, LedgerBot calculates:
- Dollar savings from taking discount
- Opportunity cost of paying early (using your cost of capital)
- Net benefit or cost

### 4. Review Supplier Performance Metrics

Evaluate suppliers on:
- Pricing competitiveness
- Delivery reliability
- Invoice accuracy
- Responsiveness to queries
- Payment terms offered

### 5. Optimize Payment Strategy

Based on analysis, LedgerBot recommends:
- Which suppliers to pay early (valuable discounts)
- Which to pay exactly on due date (preserve cash)
- Which might accept later payment (manage cash flow)
- Which to renegotiate terms with

## Example Prompts

### Prompt 1: Comprehensive Supplier Performance Review
```
Analyse all suppliers we've paid in the past 12 months. For each major supplier
(>$10,000 annual spend), show me: (1) total spend, (2) number of invoices,
(3) average payment terms, (4) actual average days to pay, (5) whether we
pay early, on-time, or late, (6) any early payment discounts offered.
Rank suppliers by total spend.
```

### Prompt 2: Early Payment Discount Analysis
```
Identify all suppliers offering early payment discounts. For each, calculate:
(1) the discount terms (e.g., 2% if paid in 10 days), (2) annualized return
rate of taking the discount, (3) whether we should pay early based on our
cost of capital of 12%, (4) total annual savings if we took all beneficial
discounts. Show me which discounts we should prioritize.
```

### Prompt 3: Cash Flow Optimization Strategy
```
We have $85,000 of bills due in the next 14 days. Our current cash balance
is $62,000 with $45,000 expected to come in from customers this week. Analyze
which bills to pay and when: (1) prioritize any with beneficial early payment
discounts, (2) flag any that absolutely must be paid on time, (3) identify
any we could delay 7-10 days without damaging relationships. Create an
optimized payment schedule.
```

### Prompt 4: Supplier Relationship Scorecard
```
Create a supplier scorecard for our top 15 suppliers. Rate each supplier on:
(1) price competitiveness (vs market or alternatives), (2) payment terms
offered, (3) delivery reliability, (4) invoice accuracy, (5) responsiveness
to queries, (6) overall value for money. Use a 1-5 scale for each criterion
and calculate overall scores. Identify suppliers we should nurture and those
we might replace.
```

### Prompt 5: Payment Terms Benchmarking
```
Compare the payment terms our suppliers offer us versus industry standards.
Show me: (1) our average payment terms across all suppliers, (2) breakdown
by category (30 days, 60 days, COD, etc.), (3) whether we're getting favorable
or unfavorable terms compared to typical trade credit, (4) which suppliers
we should approach to negotiate better terms based on our payment history
and spend volume.
```

## Tips and Best Practices

### Understanding Early Payment Discounts

**Standard Notation: "2/10 net 30"**
- 2% discount if paid within 10 days
- Otherwise, full amount due in 30 days

**Calculate Annualized Return:**
```
Example: 2/10 net 30
- Discount: 2%
- Days saved by paying early: 20 days (30 - 10)
- Annualized return: (2% / 98%) × (365 / 20) = 37.2% annual return

If your cost of capital is 12%, taking this discount saves you 25.2% annually.
This is a no-brainer - pay early!
```

**When to Take Early Payment Discounts:**
- Take if annualized return > your cost of capital
- Typical cost of capital for small business: 10-15%
- Most "2/10 net 30" discounts (~37% return) are worth taking
- Most "1/10 net 30" discounts (~18% return) are worth taking
- Marginal discounts like "0.5/7 net 30" (~8% return) may not be worth it

### Supplier Segmentation

**Strategic Suppliers (Critical):**
- Unique products/services
- Difficult to replace
- High impact on your business
- Strategy: Always pay on time, consider paying early to strengthen relationship

**Preferred Suppliers (Important):**
- Competitive pricing and terms
- Reliable delivery
- Good relationship
- Strategy: Pay according to terms, take discounts when offered

**Transactional Suppliers (Commodity):**
- Easy to replace
- Competitive market
- No unique value
- Strategy: Optimize for cash flow, negotiate best terms, consider alternatives

**Problem Suppliers (Review):**
- Poor service or reliability
- Higher prices than alternatives
- Difficult to work with
- Strategy: Find replacements or renegotiate terms

### Payment Timing Strategies

**Aggressive (Pay Early):**
- Take all valuable early payment discounts
- Strengthen relationships with strategic suppliers
- Risk: Reduces cash buffer

**Balanced (Pay On Terms):**
- Pay exactly on due date
- Maintain good relationships
- Optimize working capital
- Most common approach

**Conservative (Extend Payment):**
- Pay few days after due date
- Preserve maximum cash
- Risk: Damages relationships, may incur late fees

**Choose strategy based on:**
- Current cash position
- Upcoming cash needs
- Supplier relationship importance
- Industry norms

### Supplier Performance Metrics

**Price Competitiveness:**
Compare supplier pricing to market rates or alternatives
- Are we getting fair pricing for volume?
- Should we get volume discounts we're not getting?

**Delivery Reliability:**
Track on-time delivery percentage
- Calculate cost of late deliveries (lost sales, production delays)

**Invoice Accuracy:**
Count errors per 100 invoices
- Pricing errors
- Quantity discrepancies
- Incorrect GST treatment

**Responsiveness:**
Average time to respond to queries
- Order confirmations
- Query resolution
- Return/credit processing

**Overall Value:**
Total cost of relationship, not just price
- Factor in delivery reliability
- Consider administrative burden
- Include quality issues/returns

## Common Questions

**Q: Should I always take early payment discounts?**
A: Not always. Calculate the annualized return and compare to your cost of capital. But most standard discounts (2/10 net 30) are financially beneficial.

**Q: What if I don't have cash to pay suppliers early?**
A: Prioritize the discounts with highest return rates and largest dollar savings. Use working capital loans if the discount return exceeds loan interest.

**Q: Is it okay to pay suppliers late?**
A: Avoid it if possible. Late payment damages relationships and may incur fees. If necessary due to cash flow, communicate proactively with supplier.

**Q: How do I know if payment terms are fair?**
A: Compare to industry standards. Most trade suppliers offer 30-day terms. 60+ days is favorable to you. COD or prepayment is unfavorable.

**Q: Can I negotiate better terms?**
A: Yes, especially if you: (1) have strong payment history, (2) spend significant volume, (3) can commit to larger or regular orders.

## Related Workflows

- **Workflow 15**: Automated Creditor Payment Scheduling (implement payment strategy)
- **Workflow 1**: Automated Invoice Processing (ensure bills entered correctly)
- **Workflow 2**: Bank Reconciliation (track actual payment dates)
- **Workflow 3**: Cash Flow Forecasting (plan for supplier payments)

## Advanced Usage

### Discount Opportunity Cost Analysis
```
We have 5 suppliers offering early payment discounts totaling $120,000 in
potential bills over the next month. Calculate: (1) total discount value if
we paid all bills early ($2,400 at 2% average), (2) cash required to pay early,
(3) opportunity cost if we have alternate uses for cash (e.g., we have a
business investment opportunity returning 25%), (4) net optimization: which
discounts to take and which to skip.
```

### Supplier Concentration Risk
```
Analyse our supplier concentration risk. Show me: (1) what percentage of
purchases come from our top supplier, top 3, and top 5, (2) identify any
single points of failure (suppliers with >25% of our purchases), (3) categories
where we have only one supplier, (4) recommend where we should develop
alternative suppliers to reduce risk.
```

### Payment Terms Negotiation Targets
```
Based on our payment history and spend volume, identify which suppliers we
have leverage to negotiate better payment terms with. Show me suppliers where:
(1) we spend >$50,000 annually, (2) we always pay on time or early, (3) we've
increased spend over past year, (4) current terms are 30 days or less. Draft
talking points for negotiating extended terms (e.g., 45 or 60 days).
```

### Supplier Price Trend Analysis
```
Track pricing trends for our top 20 suppliers over the past 12 months. Show
me: (1) which suppliers have increased prices and by how much, (2) which have
held prices steady, (3) whether price increases align with inflation/cost
changes, (4) any suppliers with unusually high increases that we should
question or get competitive quotes for.
```

### Working Capital Impact Analysis
```
Calculate the working capital impact of our supplier payment patterns. Show
me: (1) average days to pay suppliers, (2) total accounts payable at any time,
(3) if we paid everything 10 days faster, how much extra working capital
needed, (4) if we negotiated 15 extra days terms, how much cash freed up,
(5) model the cash flow impact of different payment strategies.
```

### Supplier Dependency Mapping
```
Create a dependency map showing: (1) which suppliers provide critical inputs
we can't easily replace, (2) which suppliers we could switch from with minimal
disruption, (3) lead time to onboard alternative suppliers for each category,
(4) cost differential between current and alternative suppliers. Identify
our most vulnerable supplier relationships.
```

## Supplier Performance Dashboard

Ask LedgerBot to create a dashboard showing:

**Top Suppliers by Spend:**
Ranked list of suppliers with annual spend

**Payment Pattern Chart:**
Visual showing on-time payment % by supplier

**Discount Opportunity Tracker:**
Real-time view of available discounts and ROI

**Supplier Scorecard:**
Multi-factor ratings of key suppliers

**Cash Flow Impact:**
How payment timing affects your working capital

## Negotiation Strategies

### Negotiating Extended Terms

**Leverage Points:**
- "We spend $X annually and always pay on time"
- "We're looking to consolidate suppliers - better terms would help"
- "We can commit to minimum monthly spend for better terms"

**Typical Improvements:**
- 30 days → 45 days (15 days extra working capital)
- COD → 14 days (significant improvement)
- 60 days for large customers (rare but possible)

### Negotiating Early Payment Discounts

**When You Have Cash:**
"We can pay within 7 days if you offer 1.5-2% discount"

**Pilot Program:**
"Let's trial early payment for next quarter and review the arrangement"

**Win-Win Frame:**
"This helps your cash flow and saves us money - can we structure a discount?"

## Technical Notes

This workflow uses LedgerBot's Analytics agent with supplier analysis capabilities. The system performs time-series analysis of payment patterns and financial modeling of discount scenarios.

For technical implementation details, developers can refer to:
- `lib/ai/tools/xero-tools.ts` - Supplier and bill data retrieval
- `app/agents/analytics/` - Analytics agent architecture
- `lib/db/schema/ap.ts` - Accounts payable schema for supplier analytics
- Early payment discount calculations use present value formulas
