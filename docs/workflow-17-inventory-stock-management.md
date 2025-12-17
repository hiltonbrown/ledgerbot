# Workflow 17: Inventory and Stock Management Alerts

## Overview

LedgerBot's inventory and stock management workflow monitors stock levels in Xero, analyses sales velocity patterns, predicts stockouts before they occur, suggests optimal reorder quantities and timing, and can automatically generate purchase orders to preferred suppliers when reorder points are reached.

This workflow prevents stockouts that lose sales, minimizes excess inventory that ties up cash, optimizes reorder timing and quantities, and reduces manual stock monitoring effort.

## How It Works

1. **Stock Monitoring**: LedgerBot tracks current inventory levels for all tracked items in Xero
2. **Sales Pattern Analysis**: Analyses historical sales data to identify trends, seasonality, and velocity
3. **Demand Forecasting**: Predicts future demand based on historical patterns and trends
4. **Reorder Point Alerts**: Flags items approaching reorder points before stockouts occur
5. **Purchase Order Generation**: Creates draft POs for optimal reorder quantities to preferred suppliers

## Prerequisites

- Active Xero connection established
- Inventory tracking enabled in Xero
- Stock items with quantities on hand
- Preferred suppliers defined
- Sales history for demand forecasting (minimum 3-6 months)

## Step-by-Step Guide

### 1. Review Current Stock Position

Request inventory status report showing current quantities, sales velocity, and days of stock remaining.

### 2. Identify Reorder Requirements

LedgerBot flags items:
- Below reorder point (immediate action needed)
- Approaching reorder point (order soon)
- Predicted stockout within forecast period

### 3. Calculate Optimal Order Quantities

For each item requiring reorder, LedgerBot calculates:
- Economic Order Quantity (EOQ) based on demand and costs
- Safety stock requirements
- Lead time coverage
- Supplier minimum order quantities

### 4. Generate Purchase Orders

Create draft POs to preferred suppliers:
- Group items by supplier
- Apply volume discounts if applicable
- Include lead time in delivery expectations

### 5. Monitor and Adjust

Track stock levels and adjust reorder parameters:
- Update reorder points based on actual demand
- Adjust lead times based on supplier performance
- Refine forecasts as patterns change

## Example Prompts

### Prompt 1: Comprehensive Stock Status Report
```
Generate a complete inventory status report showing: (1) current quantity on
hand for all tracked items, (2) average daily sales velocity over past 90 days,
(3) days of stock remaining at current velocity, (4) items below reorder point
requiring immediate ordering, (5) items approaching reorder point in next 14 days.
Flag any stockout risks and generate recommended purchase orders.
```

### Prompt 2: Stockout Risk Prediction
```
Analyse our current inventory and sales patterns to predict stockouts in the
next 30 days. For each item at risk, show: (1) current stock level, (2) average
daily sales, (3) predicted stockout date, (4) recommended reorder quantity,
(5) preferred supplier and lead time. Prioritize by revenue impact (which
stockouts would hurt sales most).
```

### Prompt 3: Seasonal Demand Planning
```
We're approaching the Christmas season when our sales typically increase 2.5x
normal levels. Analyse stock levels for our top 30 SKUs and recommend: (1) how
much additional stock to order for seasonal peak, (2) when to place orders
given supplier lead times, (3) total investment required, (4) risk of excess
stock if season underperforms. Create seasonal purchasing plan.
```

### Prompt 4: Excess Stock Identification
```
Identify slow-moving and excess inventory. Show me items where: (1) days of
stock on hand >90 days, (2) zero sales in past 60 days, (3) inventory value
>$1,000 per item. Calculate total value tied up in slow-moving stock and
recommend actions: clearance sale, return to supplier, or write-off. Quantify
working capital that could be freed up.
```

### Prompt 5: Economic Order Quantity Optimization
```
Calculate optimal reorder quantities for our top 20 inventory items using
Economic Order Quantity (EOQ) formula. Consider: (1) annual demand based on
sales history, (2) ordering cost ($85 per PO including freight), (3) carrying
cost (20% annual holding cost), (4) supplier minimum order quantities. Show me
current order quantities versus optimized EOQ and potential cost savings.
```

## Tips and Best Practices

### Inventory Management Fundamentals

**Reorder Point Formula:**
```
Reorder Point = (Average Daily Sales × Lead Time Days) + Safety Stock

Example:
- Average daily sales: 8 units
- Supplier lead time: 14 days
- Safety stock: 30 units (buffer)
- Reorder Point = (8 × 14) + 30 = 142 units

When stock hits 142 units, place order.
```

**Economic Order Quantity (EOQ):**
```
EOQ = √(2 × Annual Demand × Order Cost / Holding Cost per Unit)

Example:
- Annual demand: 2,400 units
- Order cost: $100 per order
- Unit cost: $50
- Holding cost: 20% of unit cost = $10/unit/year
- EOQ = √(2 × 2,400 × 100 / 10) = 219 units

Optimal order quantity: 219 units per order
```

**Safety Stock Calculation:**
```
Safety Stock = (Max Daily Sales - Avg Daily Sales) × Lead Time

Or use service level approach:
Safety Stock = Z-score × Std Dev of Demand × √Lead Time

Where Z-score represents desired service level:
- 95% service level: Z = 1.65
- 99% service level: Z = 2.33
```

### ABC Analysis for Inventory

Classify inventory by value to prioritize management effort:

**A Items (Top 20% of SKUs, 80% of value):**
- Tight control
- Frequent monitoring
- Accurate forecasting
- Low stockout tolerance

**B Items (Middle 30% of SKUs, 15% of value):**
- Moderate control
- Regular monitoring
- Standard reorder points

**C Items (Bottom 50% of SKUs, 5% of value):**
- Basic control
- Periodic review
- Higher stock levels acceptable (low carrying cost)

### Stock Velocity Categories

**Fast Movers:**
- High daily sales volume
- Short lead time inventory
- Frequent reorders
- Stockout risk = lost sales

**Medium Movers:**
- Moderate sales volume
- Standard reorder points
- Balance cost vs. availability

**Slow Movers:**
- Low sales volume
- Consider: Make to order vs. stock
- Review: Still needed in range?

**Dead Stock:**
- Zero sales for 90+ days
- Clearance or write-off
- Don't reorder

### Lead Time Management

**Supplier Lead Time:**
Time from placing order to goods received
- Track actual vs. quoted lead times
- Factor in delivery reliability
- Consider: Local vs. overseas suppliers

**Reorder Frequency:**
Balance order frequency vs. EOQ:
- More frequent orders: Lower inventory, higher admin
- Less frequent orders: Higher inventory, lower admin

**Buffer for Uncertainty:**
Add safety margin for:
- Supplier delays
- Shipping disruptions
- Demand spikes
- Quality issues/returns

### Inventory Turnover Optimization

**Inventory Turnover = Cost of Goods Sold / Average Inventory**

**Target Turnover Rates:**
- Perishable goods: 15-25 times/year
- Fashion/seasonal: 4-8 times/year
- Electronics: 6-12 times/year
- Furniture: 3-6 times/year
- Industrial supplies: 4-8 times/year

**Improving Turnover:**
- Reduce slow-moving SKUs
- Improve demand forecasting
- Negotiate shorter lead times
- Increase sales velocity (marketing/pricing)
- Implement just-in-time practices

### Cash Flow Impact

**Cash Tied Up in Inventory:**
```
Inventory Value = Units × Unit Cost
Days of Stock = Inventory / Daily COGS
Cash Cycle Impact = Days of Stock - Days Payable

Example:
- Inventory: $250,000
- Daily COGS: $2,500
- Days of Stock: 100 days
- Supplier terms: 30 days
- Net cash tied up: 70 days of COGS = $175,000

Reducing stock from 100 to 60 days frees up $100,000 cash!
```

## Common Questions

**Q: Can LedgerBot automatically place purchase orders?**
A: LedgerBot generates draft purchase orders for your review and approval. You maintain control over all supplier orders.

**Q: What if sales patterns are erratic?**
A: Higher safety stock compensates for demand variability. LedgerBot can identify items with volatile demand requiring larger buffers.

**Q: How does it handle seasonal items?**
A: LedgerBot analyses historical seasonal patterns and adjusts forecasts accordingly. You can also provide seasonal multipliers.

**Q: What about items we're discontinuing?**
A: Mark items as discontinued and LedgerBot will recommend selling remaining stock without reordering, avoiding excess inventory.

**Q: Can it manage multiple warehouses?**
A: If you track inventory by location in Xero, LedgerBot can analyse and recommend by location, including inter-location transfers.

## Related Workflows

- **Workflow 1**: Automated Invoice Processing (supplier orders become bills)
- **Workflow 13**: Supplier Performance Tracking (supplier reliability affects lead times)
- **Workflow 15**: Automated Payment Scheduling (pay for stock orders)
- **Workflow 18**: Pricing Strategy Analysis (price optimization for stock movement)

## Advanced Usage

### Just-In-Time Inventory Analysis
```
Evaluate feasibility of moving to just-in-time inventory for our top 10 products.
Show me: (1) current average stock levels and carrying costs, (2) supplier lead
time reliability, (3) demand variability, (4) potential working capital savings
from lower stock levels, (5) risks of stockouts. Recommend which products are
candidates for JIT and which need buffer stock.
```

### Multi-Location Stock Optimization
```
We have stock across 3 locations: Warehouse (main), Store A, Store B. Analyse
stock distribution and recommend optimization: (1) which items are overstocked
at one location and understocked at another, (2) recommend inter-location
transfers, (3) optimal stock allocation by location based on local demand
patterns, (4) cost-benefit of centralized vs. distributed inventory.
```

### Supplier Performance and Lead Time Analysis
```
Track supplier delivery performance for the past 12 months. For each supplier,
show: (1) quoted lead time vs. actual average lead time, (2) on-time delivery
percentage, (3) variability in delivery times, (4) impact of unreliable delivery
on our safety stock requirements. Recommend adjusting reorder points based on
actual supplier performance, not quoted lead times.
```

### Seasonal Inventory Investment Planning
```
Model inventory investment requirements for the next 12 months considering
seasonal demand patterns. Show month-by-month: (1) predicted sales by product
category, (2) recommended stock levels, (3) total inventory investment required,
(4) peak inventory month and cash requirement, (5) working capital financing
needs for seasonal stock build-up.
```

### Product Lifecycle Analysis
```
Analyse our inventory portfolio by product lifecycle stage: (1) Introduction
(new products, building sales), (2) Growth (rapid sales increase), (3) Maturity
(stable sales), (4) Decline (falling sales). For each stage, recommend
appropriate inventory strategy: aggressive stocking for growth products,
managed run-down for declining products. Identify products to discontinue.
```

### Stock-to-Sales Ratio Monitoring
```
Calculate stock-to-sales ratio for each product category. Show me: (1) current
month's stock-to-sales ratio, (2) trend over past 6 months, (3) comparison to
industry benchmarks (retail target: 1.5-2.5), (4) categories with excess stock
relative to sales, (5) recommended actions to right-size inventory investment
by category.
```

## Inventory Alerts and Notifications

Ask LedgerBot to set up automated monitoring:

**Daily Alerts:**
- Items that fell below reorder point
- Critical stockouts (zero stock on fast movers)
- Large orders shipped (high inventory depletion)

**Weekly Alerts:**
- Items approaching reorder point in next 14 days
- Slow-moving stock report (>60 days on hand)
- Inventory valuation changes >10%

**Monthly Alerts:**
- Complete inventory status report
- Stock turnover analysis
- Excess and obsolete stock review

## Integration with Purchasing

**Automated Purchase Order Creation:**
1. LedgerBot identifies reorder requirements
2. Generates draft PO for each supplier
3. You review and approve
4. Process PO in Xero
5. LedgerBot tracks expected delivery dates

**Purchase Order Optimization:**
- Group items by supplier (reduce shipping costs)
- Meet minimum order quantities
- Apply volume discounts where available
- Schedule deliveries to match cash flow

**Supplier Allocation:**
For items with multiple suppliers:
- Primary supplier (first choice)
- Secondary supplier (backup or better pricing)
- Consider lead time, reliability, pricing
- Diversify risk

## Physical Stock Management

**Stock Take Integration:**
```
We completed a stock take on 30 November. Actual counts differed from system
for 24 items. Show me: (1) count variance by item (actual vs. system),
(2) total dollar value of variance, (3) variance as % of total stock value,
(4) items with concerning variances (>10% or >$1,000), (5) recommended stock
adjustments to align system with actual counts. Post adjustment journals.
```

**Shrinkage Tracking:**
Monitor stock loss from theft, damage, expiry:
- Calculate shrinkage % (variance / expected stock)
- Industry benchmarks: Retail 1-2%, Hospitality 2-4%
- Investigate high shrinkage items
- Improve controls (security, handling procedures)

## Technical Notes

This workflow uses LedgerBot's Analytics agent with demand forecasting and inventory optimization algorithms. The system integrates with Xero inventory tracking features.

For technical implementation details, developers can refer to:
- `lib/ai/tools/xero-tools.ts` - Xero inventory and purchase order tools
- `app/agents/analytics/` - Analytics agent for demand forecasting
- EOQ and reorder point calculations use operations research formulas
- Time-series analysis for sales velocity and trend detection
