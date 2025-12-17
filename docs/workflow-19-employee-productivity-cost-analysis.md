# Workflow 19: Employee Productivity and Cost Analysis

## Overview

LedgerBot's employee productivity and cost analysis workflow tracks labour costs per employee against revenue generated (for billable staff) or output metrics, identifies over/under-utilised team members, calculates the true all-in cost of employment including super and leave provisions, and generates insights for staffing decisions and capacity planning.

This workflow helps you optimize workforce productivity, understand true employment costs, make data-driven hiring decisions, and identify training or role adjustment needs.

## How It Works

1. **Cost Aggregation**: LedgerBot calculates total employment costs per employee including wages, super, leave, on-costs
2. **Productivity Measurement**: Tracks output metrics (revenue, billable hours, units produced) per employee
3. **Efficiency Calculation**: Calculates cost per unit of output and revenue per employee
4. **Benchmarking**: Compares individual and team performance to company averages and industry standards
5. **Capacity Analysis**: Identifies underutilized capacity and potential bottlenecks

## Prerequisites

- Active Xero connection (preferably with Xero Payroll)
- Employee wage and salary data
- Optional: Time tracking or productivity metrics
- Optional: Revenue attribution by employee (for client-facing roles)
- Superannuation and leave accrual data

## Step-by-Step Guide

### 1. Calculate True Employment Costs

For each employee, LedgerBot calculates:
- Base salary/wages
- Superannuation (11.5%)
- Leave provisions (annual leave, sick leave, long service leave)
- Payroll tax (if applicable)
- Workers compensation insurance
- Other on-costs (training, equipment, benefits)

### 2. Measure Productivity

Depending on role type:
- **Billable staff**: Billable hours, revenue generated
- **Production staff**: Units produced, output per hour
- **Sales staff**: Revenue, deals closed, pipeline value
- **Support staff**: Tickets resolved, customer satisfaction

### 3. Calculate Key Metrics

- Revenue per employee
- Cost per billable hour
- Utilization rate (billable hours / available hours)
- Profit per employee
- Employee ROI (value added / total cost)

### 4. Identify Insights

LedgerBot flags:
- High performers (above average productivity and profitability)
- Underutilized employees (capacity available)
- High-cost employees (above budget or benchmark)
- Training opportunities (productivity gaps)

### 5. Capacity Planning

Model scenarios:
- Impact of hiring additional staff
- Effect of letting underperformers go
- ROI of training investments
- Optimal team size and structure

## Example Prompts

### Prompt 1: Comprehensive Employee Cost Analysis
```
Calculate the true all-in cost of employment for each employee. For each person,
show: (1) base salary/wages, (2) superannuation, (3) leave provisions (annual
+ sick + long service if applicable), (4) payroll tax (4.75% for wages >$25k),
(5) workers comp insurance (estimate 1.5% of wages), (6) total employment cost.
Show me our 10 most expensive employees and total annual employment cost across
the business.
```

### Prompt 2: Billable Staff Utilization and Profitability
```
For all billable staff (consultants, lawyers, accountants), calculate: (1) total
available hours (38 hrs/week × 48 weeks = 1,824 hrs/year), (2) billable hours
actually worked, (3) utilization rate (billable/available %), (4) bill rate,
(5) total revenue generated, (6) total employment cost, (7) gross profit per
employee. Rank by profitability and flag: high performers (>75% utilization,
>60% margin), and underutilized staff (<60% utilization).
```

### Prompt 3: Revenue per Employee Benchmarking
```
Calculate revenue per employee across the business and by department. Show me:
(1) total revenue, (2) number of employees (FTE), (3) revenue per employee.
Compare to industry benchmarks for our sector (professional services target:
$200k-$300k per employee). Identify departments with low revenue per employee
indicating potential overstaffing or productivity issues.
```

### Prompt 4: Hiring ROI Analysis
```
We're considering hiring two additional roles: (1) Senior Consultant at $120k
+ on-costs = $150k total, (2) Junior Developer at $75k + on-costs = $94k total.
For the Senior Consultant, model: expected billable hours (1,400/year at $180/hr
= $252k revenue), gross profit ($252k - $150k = $102k). For Junior Developer,
model: productivity improvement (enable 2 senior devs to bill 200 extra hours/year
= $40k value). Show me ROI and payback period for each hire.
```

### Prompt 5: Workforce Capacity Planning
```
Analyse our current workforce capacity and utilization. We have 12 billable
staff with total capacity of 21,888 hours/year (12 × 1,824). Current utilization
is 68% (14,884 billable hours). Show me: (1) unutilized capacity (6,984 hours),
(2) revenue potential of unused capacity at average bill rate ($135/hr = $943k),
(3) whether we should hire more staff or improve utilization of existing team,
(4) break-even utilization rate for hiring additional staff member.
```

## Tips and Best Practices

### True Cost of Employment

**Base Salary/Wages:**
Obvious direct cost

**Superannuation (11.5% from July 2024):**
```
Example:
- Salary: $85,000
- Super: $85,000 × 11.5% = $9,775
```

**Leave Provisions:**
```
Annual Leave: 4 weeks = 7.69% of wages
- $85,000 × 7.69% = $6,537/year accrual

Sick Leave: 10 days = 3.85% of wages
- $85,000 × 3.85% = $3,272/year accrual

Long Service Leave: Varies by state, ~0.87% after 7 years
- $85,000 × 0.87% = $740/year accrual

Total leave provision: ~12.4% of wages = $10,549
```

**Payroll Tax (varies by state):**
```
Victoria: 4.85% on wages >$700k threshold
NSW: 5.45% on wages >$1.2M threshold

Example (VIC):
- Total wages: $900,000
- Taxable wages: $900k - $700k = $200k
- Payroll tax: $200k × 4.85% = $9,700
```

**Workers Compensation:**
```
Varies by industry risk rating: 0.5% to 5%
Office/admin: ~1.5%
Construction: ~3-5%

Example:
- Wages: $85,000
- Industry rate: 1.5%
- Workers comp: $85,000 × 1.5% = $1,275
```

**Other On-Costs:**
- Equipment (laptop, phone, software): $2k-$5k/year
- Training and development: $1k-$3k/year
- Recruitment: $5k-$15k one-time
- Office space: $5k-$15k/year

**Total Employment Cost:**
```
Example: $85,000 salary role
- Base salary: $85,000
- Super: $9,775
- Leave provisions: $10,549
- Payroll tax: ~$850 (allocated)
- Workers comp: $1,275
- Equipment/training: $3,000
- Total: $110,449 (30% on-costs)

Rule of thumb: Multiply salary × 1.25 to 1.35 for true cost
```

### Productivity Metrics by Role Type

**Billable/Professional Services:**
- Utilization rate: Billable hours / available hours
- Target: 70-80% (allows for admin, training, business development)
- Realization rate: Billed amount / standard rates
- Revenue per employee: $200k-$400k depending on seniority

**Sales:**
- Revenue generated per salesperson
- Deals closed per month/quarter
- Average deal size
- Sales cycle length
- Pipeline value per rep

**Production/Manufacturing:**
- Units produced per hour
- Output per shift
- Quality/defect rates
- Equipment downtime

**Customer Support:**
- Tickets resolved per day
- Average handling time
- First contact resolution rate
- Customer satisfaction scores

**Administrative:**
- Transactions processed
- Accuracy rates
- Time to complete tasks
- May be harder to quantify - focus on quality and efficiency

### Utilization Rate Analysis

**Available Hours Calculation:**
```
Total hours: 52 weeks × 38 hours = 1,976 hours
Less: Annual leave (4 weeks): -152 hours
Less: Public holidays (~10 days): -76 hours
Less: Sick leave (average 5 days): -38 hours
Less: Training (5 days): -38 hours
Available billable hours: 1,672 hours/year

Target billable hours at 75% utilization: 1,254 hours
```

**Utilization Benchmarks:**
- Excellent: >75%
- Good: 65-75%
- Acceptable: 55-65%
- Concerning: <55%

**Non-Billable Time Includes:**
- Business development
- Proposals and quotes
- Internal meetings
- Training and learning
- Administration

### High Performer vs. Underperformer

**High Performer Indicators:**
- Consistently high utilization (>70%)
- Revenue/output above team average
- High quality work (low rework)
- Self-directed and efficient
- Positive customer feedback

**Underperformer Indicators:**
- Low utilization (<55%)
- Revenue/output below team average
- Requires significant supervision
- Quality issues or errors
- Customer complaints

**Actions for Underperformers:**
1. **Investigate root cause**: Training gap? Unclear expectations? Personal issues?
2. **Provide support**: Training, mentoring, clear goals
3. **Set improvement plan**: Specific targets, timeline
4. **Review progress**: Regular check-ins
5. **Decision point**: Improve, reassign, or exit

### Capacity Planning

**When to Hire:**
- Existing team >80% utilized consistently
- Revenue pipeline requires more capacity
- Customer demand exceeding capacity (turning away work)
- Quality suffering due to overload

**When NOT to Hire:**
- Temporary spike in demand (use contractors)
- Existing team <65% utilized (improve utilization first)
- Unclear revenue pipeline
- Cash flow constraints

**Hiring ROI Calculation:**
```
New hire cost: $120k total employment cost
Expected contribution:
- Billable hours: 1,200 hrs/year (72% utilization)
- Bill rate: $150/hr
- Revenue: $180,000
- Gross profit: $180k - $120k = $60k
- ROI: $60k / $120k = 50% return

Payback period: 20 months
```

## Common Questions

**Q: How do I measure productivity for non-billable roles?**
A: Use output metrics relevant to role (transactions processed, customers served, quality scores). Compare to team averages and industry benchmarks.

**Q: Should I share these metrics with employees?**
A: Yes, transparency helps. Share individual metrics in private (performance reviews), team averages publicly (motivation), and provide context/support.

**Q: What if an employee is expensive but high-performing?**
A: High performers are worth premium cost. Calculate their contribution (revenue, profit, value created) vs. cost. Usually the ROI justifies the expense.

**Q: How do I improve utilization rates?**
A: Ensure sufficient billable work pipeline, reduce non-billable admin (automation), improve scheduling, train staff on time tracking discipline.

**Q: What about part-time or casual staff?**
A: Calculate FTE (full-time equivalent). E.g., 20 hrs/week = 0.53 FTE. Analyse productivity on per-hour basis rather than per-employee.

## Related Workflows

- **Workflow 7**: Payroll Exception Monitoring (ensure correct pay and compliance)
- **Workflow 16**: Business Benchmarking (compare labor metrics to industry)
- **Workflow 11**: Customer Profitability (revenue attribution to team members)
- **Workflow 6**: Variance Analysis (track labor cost variances)

## Advanced Usage

### Department-Level Productivity Analysis
```
Break down employee productivity by department: Sales, Operations, Customer
Service, Administration. For each department, calculate: (1) total employment
cost, (2) revenue generated (direct or allocated), (3) headcount and FTE,
(4) revenue per employee, (5) cost per employee, (6) profit contribution.
Compare departments and identify which are most/least efficient. Recommend
reallocations or restructuring.
```

### Skill Mix Optimization
```
We have a mix of Senior (bill at $200/hr, cost $150k), Mid-level (bill at
$150/hr, cost $105k), and Junior staff (bill at $100/hr, cost $75k). Analyse
our current mix (4 senior, 6 mid, 3 junior) versus optimal mix for our client
work. Model scenarios: (1) replace 2 seniors with 3 mid-level = lower cost,
slightly lower bill rate, (2) hire 2 more juniors to support seniors = leverage
model. Show revenue and profit impact of each scenario.
```

### Training ROI Calculation
```
We're considering a $15,000 training program for 5 mid-level staff to upskill
them toward senior capabilities. Model the ROI: (1) training cost = $15k,
(2) productivity improvement = 15% more billable hours + 10% higher bill rate,
(3) annual value added = $42k (based on improved billing), (4) ROI = 180%,
(5) Payback period = 4 months. Recommend proceeding with training investment.
```

### Workload Distribution Analysis
```
Analyse workload distribution across the team. Show me: (1) utilization rate
by employee, (2) identify overloaded staff (>85% utilization - burnout risk),
(3) identify underutilized staff (<60% utilization), (4) recommend redistribution
of work from overloaded to underutilized staff, (5) whether we need to hire,
let go, or just rebalance work allocation.
```

### Attrition Cost Analysis
```
We have 18% annual staff turnover (3 departures from 17 staff). Calculate the
cost of attrition: (1) recruitment cost ($10k per hire), (2) training cost for
new staff ($8k), (3) lost productivity during handover (2 months at 50% =
$15k per position), (4) total attrition cost = $99k/year. Model: if we invested
$50k in retention programs and reduced turnover to 10%, net savings = $49k/year.
```

### Succession Planning Analysis
```
Identify succession risks in our organization. Show me: (1) key roles with single
points of failure (senior staff, specialized skills), (2) employees approaching
retirement age or high flight risk, (3) bench strength (ready-now successors),
(4) skill gaps requiring external hire or development. Create succession plan
with timeline and development activities required.
```

## Staffing Models by Business Type

### Professional Services (Leverage Model)
```
Pyramid structure:
- 1 Partner (rainmaker, strategy)
- 2 Senior Consultants (client delivery, supervision)
- 4 Consultants (core delivery)
- 4 Junior Consultants (research, analysis)

Ratio: 1:2:4:4
Revenue: Partners $500k, Seniors $250k, Consultants $180k, Juniors $120k
```

### Product Business (Lean Operations)
```
Flat structure focused on:
- Sales team (revenue generators)
- Operations (fulfillment)
- Minimal admin overhead

Target: Revenue per employee >$300k
```

### Manufacturing (Shift Model)
```
Focus on:
- Production staff (output per hour)
- Equipment utilization
- Minimize downtime
- Cross-training for flexibility
```

## Performance Review Integration

Use productivity data in performance reviews:

**Quantitative Metrics:**
- Utilization rate vs. target
- Revenue generated vs. target
- Output volume/quality vs. team average

**Qualitative Factors:**
- Teamwork and collaboration
- Initiative and improvement ideas
- Customer feedback
- Development and growth

**Balanced Approach:**
Metrics inform, not dictate. Consider context, challenges, growth.

## Technical Notes

This workflow uses LedgerBot's Analytics agent with payroll integration and productivity tracking. The system calculates comprehensive employment costs and productivity metrics.

For technical implementation details, developers can refer to:
- `lib/ai/tools/xero-tools.ts` - Xero Payroll data retrieval
- `app/agents/analytics/` - Analytics agent architecture
- Employment cost calculations based on Australian payroll regulations
- Productivity algorithms analyse time-series data and calculate efficiency ratios
