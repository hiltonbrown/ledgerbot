# Workflow 18: Pricing Strategy Analysis

## Overview

LedgerBot's pricing strategy analysis workflow reviews sales data across products and services, identifies pricing inconsistencies, analyses win/loss rates at different price points, calculates price elasticity based on historical data, and recommends optimal pricing adjustments to maximise revenue and margin.

This workflow helps you set prices based on data not guesswork, identify underpriced products leaving money on the table, optimize pricing to maximize profitability, and maintain competitive positioning while protecting margins.

## How It Works

1. **Price Analysis**: LedgerBot reviews current pricing across all products/services and historical price changes
2. **Margin Calculation**: Calculates gross margin % for each item at current pricing
3. **Elasticity Detection**: Analyses how demand changes in response to price changes
4. **Competitive Positioning**: Compares your pricing to market benchmarks and competitor intelligence
5. **Optimization Recommendations**: Suggests specific price adjustments to improve profitability

## Prerequisites

- Active Xero connection established
- Sales transaction history (minimum 6-12 months)
- Cost data for gross margin calculations
- Optional: Competitor pricing data or market research
- Optional: Historical price change data to calculate elasticity

## Step-by-Step Guide

### 1. Analyse Current Pricing

Request comprehensive pricing review showing:
- Current prices across all SKUs/services
- Gross margin % by item
- Sales volume by price point
- Pricing consistency across customers

### 2. Identify Pricing Opportunities

LedgerBot flags:
- Underpriced items (low margin, high demand)
- Overpriced items (high margin, low sales)
- Inconsistent pricing (same item different prices)
- Outdated pricing (not reviewed in 12+ months)

### 3. Calculate Price Elasticity

For items with price change history:
- How much did demand change when price changed?
- Is demand elastic (sensitive to price) or inelastic?
- What's the revenue-maximizing price point?

### 4. Model Price Change Scenarios

Test different pricing strategies:
- Across-the-board increase (e.g., +5%)
- Selective increases (underpriced items only)
- Value-based pricing tiers
- Bundle pricing optimization

### 5. Implement Price Changes

Based on analysis:
- Update prices in Xero
- Communicate changes to customers (if required)
- Monitor impact on sales volume and revenue
- Refine further based on results

## Example Prompts

### Prompt 1: Comprehensive Pricing Analysis
```
Analyse pricing across all our products and services. For each item, show:
(1) current price, (2) cost and gross margin %, (3) sales volume past 6 months,
(4) revenue contribution, (5) comparison to industry/competitor pricing if
available. Identify: items priced too low (high volume, low margin), items
priced too high (low volume, high margin), and items with optimal pricing
(good volume and margin).
```

### Prompt 2: Margin Optimization Recommendations
```
Our target gross margin is 40% but company-wide we're achieving 33%. Identify
which products are pulling down our average margin. For each low-margin item
(<30%), show: (1) current margin %, (2) price increase needed to reach 40%
margin, (3) estimated demand impact of price increase, (4) net profit impact.
Recommend which products to increase prices on to lift overall margin with
minimal volume loss.
```

### Prompt 3: Price Elasticity Analysis
```
We increased prices on 5 products by 8-12% three months ago. Analyse the impact:
(1) sales volume before vs. after price increase, (2) revenue before vs. after,
(3) gross profit before vs. after, (4) calculated price elasticity for each
product. Were the increases successful? Should we increase further, hold steady,
or reduce prices? Calculate revenue-maximizing price point for each product.
```

### Prompt 4: Customer Pricing Consistency Review
```
Review pricing consistency across our customer base. Show me: (1) products where
different customers are charged different prices, (2) price variance by customer
(high/low/average), (3) whether variances are justified (volume discounts,
contract terms) or inconsistent, (4) revenue lost from underpricing to certain
customers. Recommend standardized pricing or tiered pricing structure.
```

### Prompt 5: Competitive Pricing Positioning
```
Compare our pricing to industry benchmarks for similar products/services. Show
me where we're: (1) premium priced (>15% above market), (2) market priced
(±15% of market), (3) discount priced (<15% below market). For each category,
assess whether our position is intentional and sustainable or requires
adjustment. Identify products where we can increase price toward market rates.
```

## Tips and Best Practices

### Pricing Strategy Fundamentals

**Cost-Plus Pricing:**
```
Price = Cost × (1 + Markup %)

Example:
- Unit cost: $50
- Desired margin: 40%
- Price = $50 / (1 - 0.40) = $83.33

Pros: Simple, ensures margin
Cons: Ignores customer value perception
```

**Value-Based Pricing:**
```
Price = Customer Value Perception

Example:
- Customer saves $1,000/month using your service
- They'd pay up to $300/month (30% of savings)
- Your cost to deliver: $80/month
- Value-based price: $250/month (margin: 68%)

Pros: Maximizes profit, aligns with customer value
Cons: Requires customer research
```

**Competitive Pricing:**
```
Price = Competitor Price ± Strategic Differential

Example:
- Competitor price: $100
- You offer superior service: Price at $115 (premium)
- You're building market share: Price at $85 (penetration)

Pros: Market-aware, competitive positioning
Cons: May leave money on table or squeeze margins
```

**Dynamic Pricing:**
```
Price varies based on:
- Demand (surge pricing)
- Customer segment
- Time/season
- Inventory levels

Example: Hospitality, airlines, ride-sharing
```

### Price Elasticity of Demand

**Formula:**
```
Price Elasticity = % Change in Quantity / % Change in Price

Example:
- Price increase: 10% (from $100 to $110)
- Volume decrease: 5% (from 1,000 to 950 units)
- Elasticity = -5% / 10% = -0.5

Interpretation:
- Elasticity = -0.5 (inelastic): Price increase is good!
- Revenue before: $100 × 1,000 = $100,000
- Revenue after: $110 × 950 = $104,500 (↑4.5%)
```

**Elasticity Interpretation:**
- **Inelastic (|E| < 1)**: Demand not very price sensitive
  - Increase price → Revenue increases
  - Essential goods, unique products, loyal customers

- **Elastic (|E| > 1)**: Demand highly price sensitive
  - Increase price → Revenue decreases
  - Commodity products, many alternatives, discretionary purchases

- **Unit Elastic (|E| = 1)**: At revenue-maximizing price
  - Any price change decreases revenue

### Pricing Psychology

**Charm Pricing:**
$99.99 vs. $100.00
- Appears significantly cheaper (left-digit effect)
- Common in B2C, less effective in B2B

**Prestige Pricing:**
$1,000 vs. $999
- Round numbers signal quality
- Effective for luxury/premium products

**Price Anchoring:**
Show higher-priced option first
- Makes mid-tier option seem reasonable
- Common in three-tier pricing (Basic/Standard/Premium)

**Bundle Pricing:**
Package multiple items at discount vs. individual pricing
- Increases average transaction value
- Moves slower-selling products
- Perceived value for customer

### Pricing Tiers and Segmentation

**Good-Better-Best Pricing:**
```
Basic:    $49/month  (Entry level)
Standard: $99/month  (Most popular - anchor point)
Premium:  $199/month (Full features)

Psychology:
- Basic: Makes Standard seem affordable
- Premium: Makes Standard seem like good value
- Most customers choose middle option
```

**Volume Discounts:**
```
1-10 units:    $100 each
11-50 units:   $90 each (10% discount)
51+ units:     $80 each (20% discount)

Encourages larger orders
Benefits: Higher volume, customer loyalty
Risks: Margin erosion on large orders
```

**Customer Segment Pricing:**
```
Retail:      Standard price
Wholesale:   30% discount (high volume)
Trade:       20% discount (regular customers)
Government:  Contract pricing (tender process)

Reflect different value perception and buying power
Must be defensible and non-discriminatory
```

### Pricing Review Cadence

**Annual Review:**
- Comprehensive pricing strategy review
- Major price adjustments
- Cost changes, market shifts

**Quarterly Review:**
- Monitor margin performance
- Competitive intelligence updates
- Tactical price adjustments

**Monthly Review:**
- New product pricing
- Promotional pricing
- Quick fixes on problem SKUs

**Continuous Monitoring:**
- Track competitor price changes
- Monitor margin erosion
- Flag pricing anomalies

## Common Questions

**Q: How much can I increase prices without losing customers?**
A: Depends on price elasticity. Test small increases (3-5%) first. B2B customers more accepting of annual price reviews (CPI + 2-3%).

**Q: Should I charge all customers the same price?**
A: Volume discounts and customer segments are acceptable. Ensure pricing structure is consistent, defensible, and transparent.

**Q: What if competitors undercut my prices?**
A: Don't automatically match. Consider: Is your product/service superior? Can you justify premium pricing? Is competitor pricing sustainable? Focus on value not just price.

**Q: How do I communicate price increases?**
A: Advance notice (30-60 days), explain rationale (cost increases, value improvements), offer alternatives (annual contract at old price, downgrade options).

**Q: Should I discount to win business?**
A: Occasionally for strategic reasons (new customer, large volume). Avoid habitual discounting which erodes margins and sets wrong expectations.

## Related Workflows

- **Workflow 11**: Customer Profitability Analysis (customer-specific pricing insights)
- **Workflow 17**: Inventory Management (price to move slow stock)
- **Workflow 16**: Business Benchmarking (compare pricing to industry)
- **Workflow 6**: Variance Analysis (track margin performance)

## Advanced Usage

### Revenue Optimization Model
```
Model different pricing scenarios for our top 10 products representing 70% of
revenue. For each product, test price changes from -10% to +20% in 5% increments.
For each scenario, estimate volume impact based on calculated elasticity and
show: (1) projected revenue, (2) gross profit, (3) contribution margin. Identify
the pricing mix that maximizes total profit across the portfolio.
```

### Price-Volume-Mix Analysis
```
Our revenue increased 15% this quarter versus last year, but gross profit only
increased 8%. Decompose the variance into: (1) volume effect (more units sold),
(2) price effect (price changes), (3) mix effect (shift toward lower/higher
margin products), (4) cost effect (cost changes). Explain why profit didn't
grow as fast as revenue and recommend actions.
```

### Customer Lifetime Value Pricing
```
Calculate customer lifetime value (CLV) for different customer segments. Show
me: (1) average customer annual spend, (2) average customer tenure, (3) gross
margin per customer, (4) estimated CLV. Compare to our customer acquisition
cost (CAC). Based on CLV, can we afford to price more aggressively to win new
customers, knowing we'll recover cost over the relationship lifetime?
```

### Promotional Pricing Effectiveness
```
We ran a 20% off promotion on selected products last month. Analyse the results:
(1) incremental volume during promotion, (2) revenue and margin impact during
promotion, (3) pull-forward effect (sales collapse after promotion), (4) net
profitability of promotion versus normal pricing. Were the promotions profitable?
Which products should we promote in future and which should we avoid discounting?
```

### Product Portfolio Optimization
```
Analyse profitability across our full product range of 150 SKUs. Categorize
products: (1) Stars - high volume, high margin (protect pricing), (2) Cash
Cows - high volume, low margin (increase prices), (3) Dogs - low volume, low
margin (discontinue or reprice dramatically), (4) Question Marks - low volume,
high margin (invest in marketing or rationalize). Recommend portfolio optimization
strategy.
```

### Subscription Pricing Optimization
```
We offer monthly ($99) and annual ($999 = 15% discount) subscription options.
Analyse customer preference: (1) % choosing monthly vs. annual, (2) cash flow
impact of mix, (3) retention rates by plan type, (4) customer lifetime value
by plan. Model different pricing: (1) increase annual discount to 20% to drive
upfront cash, (2) reduce annual discount to 10% to improve margin, (3) introduce
quarterly option. Recommend optimal pricing structure.
```

## Pricing Communication

### Price Increase Letter Template

```
Dear [Customer],

We wanted to inform you that effective [Date], we will be adjusting our pricing
to reflect increases in our operating costs and continued investment in service
quality.

Current pricing: $XXX
New pricing: $YYY (Z% increase)

This is our first price adjustment in [X] years. The increase allows us to
continue delivering the high standard of service you expect while covering
rising costs in [labor/materials/compliance/etc.].

If you have any questions or would like to discuss options including [annual
contracts, volume commitments, etc.], please contact us before [Date].

We value your business and appreciate your understanding.
```

### Discount Policy

Create clear discount guidelines:
- Volume discounts (automated tiers)
- Prompt payment discounts (e.g., 2% for payment within 7 days)
- Contract discounts (annual commitment = 10% off)
- First-time customer discounts (one-time promotion)

**Require approval for:**
- Discounts > 15%
- Below-cost pricing
- Custom pricing outside policy

## Pricing Mistakes to Avoid

**1. Cost-Plus Without Market Check**
Just because you need 40% margin doesn't mean market will pay it

**2. Leaving Money on Table**
Not increasing prices when you could (inelastic demand)

**3. Race to Bottom**
Competing only on price versus value/differentiation

**4. Inconsistent Pricing**
Different customers getting different deals without clear rationale

**5. Set and Forget**
Not reviewing prices regularly (at least annually)

**6. Ignoring Costs**
Failing to increase prices when costs increase

**7. Over-Discounting**
Training customers to wait for sales/discounts

**8. No Value Communication**
Increasing price without explaining value improvement

## Technical Notes

This workflow uses LedgerBot's Analytics agent with pricing optimization and elasticity calculation capabilities. The system analyses sales patterns and statistical models to recommend pricing strategies.

For technical implementation details, developers can refer to:
- `app/agents/analytics/` - Analytics agent architecture
- `lib/ai/tools/xero-tools.ts` - Sales and pricing data retrieval
- Price elasticity calculations use regression analysis on historical data
- Revenue optimization uses constrained optimization algorithms
