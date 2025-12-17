# Workflow 11: Customer Profitability Analysis Dashboard

## Overview

LedgerBot's customer profitability analysis workflow analyses revenue, cost of sales, and time spent per customer over rolling periods, calculates true customer profitability including hidden costs like payment delays and support requirements, and generates visual dashboards showing which clients are most valuable and which may need pricing adjustments.

This workflow helps you identify your most profitable customers, understand the true cost to serve different client segments, and make data-driven decisions about pricing, resource allocation, and customer relationships.

## How It Works

1. **Data Aggregation**: LedgerBot retrieves all revenue and cost data per customer from Xero
2. **Cost Allocation**: Assigns direct costs (materials, subcontractors) and allocates indirect costs (time, support, payment delays)
3. **Profitability Calculation**: Calculates gross profit, contribution margin, and net profitability per customer
4. **Hidden Cost Analysis**: Identifies costs like payment delays (working capital cost), excess support time, and administrative burden
5. **Dashboard Generation**: Creates visual reports showing customer rankings, profitability trends, and actionable insights

## Prerequisites

- Active Xero connection established
- Customer sales data with tracking categories or job codes (if available)
- Cost of sales data linked to customers or projects
- Optional: Time tracking data for service-based businesses

## Step-by-Step Guide

### 1. Define Analysis Parameters

Specify the time period and what costs to include in profitability analysis.

### 2. Request Customer Profitability Report

Use one of the example prompts to generate your customer profitability analysis.

### 3. Review the Dashboard

LedgerBot presents:
- Customer ranking by revenue, profit, and margin percentage
- Identification of hidden costs (payment delays, support burden)
- Trend analysis showing improving/deteriorating customer relationships
- Segmentation of customers into categories (A/B/C customers)

### 4. Drill into Specific Customers

For customers of interest, request detailed analysis:
- Full transaction history
- Cost breakdown by category
- Comparison to company average metrics
- Pricing analysis and recommendations

### 5. Take Action

Based on insights:
- Adjust pricing for unprofitable customers
- Improve payment terms for slow payers
- Focus business development on high-profit customer types
- Consider discontinuing relationships with persistently unprofitable customers

## Example Prompts

### Prompt 1: Comprehensive Customer Profitability Analysis
```
Analyse customer profitability for all customers in the past 12 months. For
each customer, calculate: (1) total revenue, (2) direct costs (cost of sales),
(3) gross profit and margin %, (4) hidden costs from payment delays (using our
15% cost of capital), (5) administrative burden based on invoice frequency.
Rank customers by net profitability and show me the top 20 and bottom 10.
```

### Prompt 2: 80/20 Rule Analysis
```
Apply the Pareto principle to our customer base. Show me: (1) which customers
make up 80% of revenue, (2) which customers make up 80% of profit, (3) are
these the same customers? Identify any customers generating high revenue but
low profit, and explain why the profit doesn't match the revenue level.
```

### Prompt 3: Customer Segment Comparison
```
We have three customer segments: Retail, Wholesale, and Government. Compare
profitability across these segments. Show me average revenue per customer,
average profit margin %, payment terms and actual payment days, and cost to
serve for each segment. Which segment is most profitable and why?
```

### Prompt 4: Payment Delay Impact Analysis
```
Calculate the working capital cost of customer payment delays. For each
customer, show: (1) average payment terms, (2) actual average days to pay,
(3) delay in days, (4) average outstanding at any time, (5) cost of capital
tied up (use 15% annual rate). Show me the total annual cost of slow payer
customers and identify the worst offenders.
```

### Prompt 5: Customer Lifetime Value Projection
```
For our top 10 customers by revenue, calculate customer lifetime value (CLV).
Project: (1) expected annual revenue based on historical average, (2) expected
duration of relationship, (3) average profit margin, (4) discount rate for
future cash flows, (5) estimated CLV. Compare to our customer acquisition cost
to determine which customer relationships have best ROI.
```

## Tips and Best Practices

### Understanding True Profitability

**Revenue is vanity, profit is sanity, cash is reality**

A high-revenue customer isn't necessarily profitable when you account for:
- **Direct costs**: Materials, subcontractors, shipping
- **Labor costs**: Time spent servicing the customer
- **Payment delays**: Working capital cost when customers pay late
- **Support burden**: Extra phone calls, changes, complaints
- **Administrative overhead**: Complex billing, special requirements
- **Discount levels**: Heavy discounting erodes margin

### Cost Allocation Methods

**Direct Cost Assignment:**
Easy to track - invoice each cost directly to customer/job

**Time-Based Allocation:**
For service businesses, allocate costs based on hours spent per customer

**Activity-Based Costing (ABC):**
Allocate overhead based on activities consumed by each customer
- Number of invoices processed
- Number of deliveries made
- Number of support tickets
- Custom product requirements

### Customer Segmentation

**A Customers (Top 20%):**
- High profit, high margin
- Pay on time
- Low administrative burden
- Strategic focus: Retain and grow

**B Customers (Middle 30%):**
- Moderate profit and margin
- Acceptable payment behavior
- Standard service requirements
- Strategic focus: Improve efficiency, consider price increases

**C Customers (Bottom 50%):**
- Low profit or unprofitable
- Often pay late
- High support requirements
- Strategic focus: Improve pricing, reduce costs, or exit relationship

### Hidden Cost Identification

**Payment Delay Cost:**
```
Example: Customer with $50,000 average outstanding, pays 60 days vs 30 day terms
Extra 30 days = $50,000 × 15% annual cost of capital × 30/365
= $616 per year in working capital cost
```

**Support Burden Cost:**
```
Example: Customer requires 10 hours/month extra support vs average of 2 hours
Extra 8 hours × $75/hour loaded labor cost × 12 months = $7,200/year
```

**Discount Impact:**
```
Example: Customer gets 15% discount vs standard 5%
Extra 10% discount on $100,000 annual sales = $10,000 profit erosion
```

### Pricing Strategy Insights

If customer is unprofitable, you have three options:

**1. Increase Prices**
- Justify with value, service quality, or market rates
- Risk: Customer may leave (but saving you money if they're unprofitable!)

**2. Reduce Costs**
- Streamline processes
- Reduce service level
- Automate administrative tasks
- Enforce stricter payment terms

**3. Exit Relationship**
- Politely decline future work
- Recommend alternative suppliers
- Focus resources on profitable customers

### Regular Review Cadence

- **Monthly**: Quick review of largest customers and any new concerning patterns
- **Quarterly**: Comprehensive profitability analysis and customer ranking
- **Annually**: Strategic review of customer mix and portfolio optimization

## Common Questions

**Q: What if we don't track time against customers?**
A: You can still analyse revenue vs direct costs for gross profit. Allocate overhead as percentage of revenue or as equal amount per customer.

**Q: How do I assign costs that benefit multiple customers?**
A: Use allocation keys: revenue-based (cost allocated by % of revenue), time-based (% of hours), or activity-based (% of transactions).

**Q: Should I fire unprofitable customers?**
A: Not necessarily. First, try to improve pricing or reduce costs. Some customers may be unprofitable now but have strategic value or growth potential.

**Q: What's a "good" profit margin per customer?**
A: Varies by industry. Service businesses might target 30-50% gross margin, product businesses 20-40%. Know your industry benchmarks.

**Q: Can LedgerBot track customer profitability over time?**
A: Yes, you can analyze trends to see which customers are becoming more or less profitable quarter over quarter.

## Related Workflows

- **Workflow 4**: Automated Debtor Follow-Up (address payment delay costs)
- **Workflow 6**: Variance Analysis (understand customer revenue changes)
- **Workflow 14**: Pricing Strategy Analysis (optimize pricing based on profitability insights)
- **Workflow 16**: Business Performance Benchmarking (compare customer metrics to industry standards)

## Advanced Usage

### Customer Cohort Analysis
```
Group customers by acquisition date into cohorts (Q1 2023, Q2 2023, etc.).
For each cohort, track: (1) initial revenue, (2) revenue retention rate over
time, (3) profitability evolution, (4) customer lifetime value. Show me which
acquisition periods brought the most valuable long-term customers.
```

### Product-Customer Profitability Matrix
```
Create a matrix showing profitability by product line AND customer. Show me:
(1) which products are most profitable with which customer types, (2) identify
product-customer combinations that are unprofitable, (3) highlight opportunities
to cross-sell profitable products to existing customers.
```

### Customer Churn Risk Analysis
```
Analyse our customer base for churn risk indicators: (1) declining order
frequency, (2) reducing order values, (3) increasing payment delays,
(4) fewer purchases compared to prior year. Flag customers at risk of churning
and calculate the profit impact if they leave.
```

### Price Sensitivity Analysis
```
For customers where we've changed pricing over time, analyse the impact on
order volume and total profit. Calculate price elasticity: when we increased
prices by X%, did volume change by Y%? Use this to model optimal pricing
that maximizes total profit not just margin.
```

### Geographic Profitability Analysis
```
Break down customer profitability by location. Show me: (1) average customer
profitability by state/region, (2) include delivery costs where relevant,
(3) identify geographic areas with high concentration of profitable customers,
(4) recommend where to focus business development efforts.
```

### Customer Service Level Analysis
```
We offer three service levels: Basic, Standard, Premium. For each level,
calculate: (1) average revenue per customer, (2) average cost to serve,
(3) profit margin %, (4) whether pricing correctly reflects the cost to
deliver each service level. Recommend any pricing adjustments needed.
```

## Metrics to Track

### Revenue Metrics
- **Total revenue per customer** (annual, quarterly, monthly)
- **Average transaction value**
- **Transaction frequency**
- **Revenue growth/decline trend**

### Profitability Metrics
- **Gross profit** (revenue minus direct costs)
- **Gross margin %**
- **Contribution margin** (after variable costs)
- **Net profit** (after cost allocations)
- **Net margin %**

### Efficiency Metrics
- **Revenue per hour** (for service businesses)
- **Cost to serve**
- **Invoice count per customer** (administrative burden)
- **Support tickets per customer**

### Cash Flow Metrics
- **Average days to pay**
- **Payment term compliance**
- **Working capital cost** (from payment delays)
- **Bad debt history**

### Strategic Metrics
- **Customer acquisition cost (CAC)**
- **Customer lifetime value (CLV)**
- **CLV to CAC ratio** (should be >3:1)
- **Customer retention rate**

## Visualization Ideas

Ask LedgerBot to create:

**Customer Profitability Matrix:**
Plot customers on X/Y axis (Revenue vs Profit Margin %)
- Top right: Stars (high revenue, high margin) - grow these
- Top left: Cash cows (high revenue, low margin) - fix pricing
- Bottom right: Diamonds (low revenue, high margin) - grow these
- Bottom left: Dogs (low revenue, low margin) - exit these

**Payment Behavior Ranking:**
Bar chart showing average days to pay per customer

**Profit Trend:**
Line graph showing quarterly profit per customer over past 2 years

**ABC Customer Segmentation:**
Pie chart showing revenue and profit contribution by segment

## Technical Notes

This workflow uses LedgerBot's Analytics agent with customer segmentation and profitability calculation capabilities. The system performs complex aggregations across invoices, bills, and tracking categories.

For technical implementation details, developers can refer to:
- `app/agents/analytics/` - Analytics agent architecture
- `lib/ai/tools/xero-tools.ts` - Customer and transaction data retrieval
- `lib/db/schema/ar.ts` - AR-specific schema for customer analytics
- Customer profitability algorithms use activity-based costing principles
