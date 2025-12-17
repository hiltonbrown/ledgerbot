# AI Preferences Settings - Detailed Guide

## Overview

AI Preferences control how LedgerBot thinks, reasons, and communicates. These settings determine which AI model powers your conversations and how it should present information to you.

## Fields Reference

### 1. Default Chat Model

**What it does**: Selects which AI model LedgerBot uses for new chat conversations.

**Available models**: 6 options across 3 providers (Anthropic, OpenAI, Google)

**Can be changed**: Yes, per-chat (this sets the default for new chats only)

---

## Model Comparison

### Anthropic Claude Sonnet 4.5
**Description**: Balanced general-purpose model for high-quality responses

**Best for**:
- Complex accounting questions requiring nuanced understanding
- Multi-step workflows (e.g., month-end procedures)
- Detailed analysis and explanations
- When accuracy is more important than speed

**Strengths**:
- Superior reasoning on complex problems
- Excellent at following custom instructions
- Strong understanding of Australian accounting context
- Balanced speed/quality ratio

**Cost**: Mid-range
**Speed**: Medium (2-4 seconds for typical responses)

**Example use case**:
```
"Analyze our accounts receivable aging and recommend collection strategies
for overdue invoices, considering our customer relationships and cash flow needs."
```
→ Sonnet provides thorough analysis with multiple considerations

---

### Anthropic Claude Haiku 4.5 (Default)
**Description**: Lightweight Claude model optimized for fast, cost-efficient replies

**Best for**:
- Quick questions and simple tasks
- Frequent interactions throughout the day
- Coding transactions and routine bookkeeping
- When speed matters more than depth

**Strengths**:
- Very fast responses (1-2 seconds)
- Cost-effective for high-volume usage
- Still maintains strong accuracy on standard tasks
- Excellent for straightforward queries

**Cost**: Lowest
**Speed**: Fastest (1-2 seconds for typical responses)

**Example use case**:
```
"What account should I code this office supplies invoice to?"
```
→ Haiku provides quick, accurate answer without unnecessary detail

**Recommended as default**: Yes - best balance of speed, cost, and quality for daily use

---

### OpenAI GPT-5.1
**Description**: Flagship OpenAI model for complex and creative tasks

**Best for**:
- Creative problem-solving (business strategy, growth planning)
- Advanced forecasting and scenario analysis
- When you want a "second opinion" from a different AI approach
- Complex multi-variable optimizations

**Strengths**:
- Excellent creative and strategic thinking
- Strong at mathematical and statistical analysis
- Different reasoning approach than Claude (useful for comparison)
- Advanced problem decomposition

**Cost**: Highest
**Speed**: Slower (4-6 seconds for typical responses)

**Example use case**:
```
"Model three scenarios for expanding our business to a new location, including
cash flow projections, risk analysis, and ROI calculations."
```
→ GPT-5 excels at complex multi-faceted analysis

---

### OpenAI GPT-5 Mini
**Description**: Fast, cost-efficient GPT-5 variant for everyday use

**Best for**:
- Quick responses with OpenAI's reasoning style
- Lighter tasks that don't require flagship model
- Budget-conscious usage at scale
- Testing OpenAI models before committing to GPT-5.1

**Strengths**:
- Faster than GPT-5.1
- More cost-effective
- Same underlying architecture as GPT-5.1
- Good for routine tasks

**Cost**: Low-medium
**Speed**: Medium-fast (2-3 seconds)

**Example use case**:
```
"Generate a payment reminder email for an overdue invoice."
```
→ GPT-5 Mini handles this well without needing the flagship model

---

### Google Gemini 2.5 Flash
**Description**: Speed-optimized Gemini model with strong reasoning

**Best for**:
- Very fast responses with good quality
- High-volume interactions
- When you want Google's AI approach
- Testing/comparing different AI providers

**Strengths**:
- Extremely fast inference
- Cost-effective
- Good reasoning capabilities
- Strong at data analysis tasks

**Cost**: Low
**Speed**: Fastest (1-2 seconds, comparable to Haiku)

**Example use case**:
```
"Calculate the GST on this invoice: $1,100 total including GST"
```
→ Flash provides instant, accurate calculation

---

### Google Gemini 2.5 Pro
**Description**: Advanced Gemini model with superior reasoning capabilities

**Best for**:
- Complex analytical tasks
- Large-scale data interpretation
- When you need Google's most powerful model
- Advanced reasoning on novel problems

**Strengths**:
- Excellent reasoning depth
- Strong analytical capabilities
- Good at handling large context windows
- Alternative perspective to Anthropic/OpenAI

**Cost**: High
**Speed**: Slower (4-5 seconds)

**Example use case**:
```
"Analyze 12 months of financial data to identify trends, anomalies, and
optimization opportunities across all expense categories."
```
→ Gemini Pro excels at large-scale data analysis

---

## Model Selection Guide

### Choose Claude Haiku 4.5 when:
- ✓ Daily routine tasks (transaction coding, simple questions)
- ✓ You chat with LedgerBot frequently throughout the day
- ✓ Speed is more important than deep analysis
- ✓ Cost efficiency matters (high message volume)
- ✓ You're just starting with LedgerBot

### Choose Claude Sonnet 4.5 when:
- ✓ Complex accounting or compliance questions
- ✓ You need detailed explanations and reasoning
- ✓ Working through multi-step workflows
- ✓ Accuracy is critical (e.g., tax advice, regulatory compliance)
- ✓ Custom instructions and context are heavily used

### Choose GPT-5.1 when:
- ✓ Strategic planning and creative problem-solving
- ✓ Advanced financial modeling and forecasting
- ✓ You want a different AI perspective on a problem
- ✓ Complex optimization tasks
- ✓ Cost is not a primary concern

### Choose GPT-5 Mini when:
- ✓ You prefer OpenAI's reasoning but want cost efficiency
- ✓ Tasks that don't require the flagship model
- ✓ Testing OpenAI capabilities before upgrading
- ✓ Good balance of OpenAI quality and speed

### Choose Gemini 2.5 Flash when:
- ✓ Need extremely fast responses
- ✓ High-volume, routine interactions
- ✓ Simple data analysis and calculations
- ✓ Want to try Google's AI approach cost-effectively

### Choose Gemini 2.5 Pro when:
- ✓ Large-scale data analysis tasks
- ✓ Complex reasoning requirements
- ✓ Want Google's most powerful model
- ✓ Alternative to GPT-5.1 for advanced analysis

---

## Cost/Speed/Quality Matrix

| Model | Cost | Speed | Quality | Best Use Case |
|-------|------|-------|---------|---------------|
| **Claude Haiku 4.5** | $ | ★★★★★ | ★★★★ | Daily tasks, routine queries |
| **Claude Sonnet 4.5** | $$ | ★★★★ | ★★★★★ | Complex accounting, detailed analysis |
| **GPT-5 Mini** | $$ | ★★★★ | ★★★★ | OpenAI approach, good value |
| **Gemini 2.5 Flash** | $ | ★★★★★ | ★★★★ | Speed-critical tasks |
| **GPT-5.1** | $$$$ | ★★★ | ★★★★★ | Strategic planning, complex analysis |
| **Gemini 2.5 Pro** | $$$ | ★★★ | ★★★★★ | Large data analysis |

---

## Practical Examples by Scenario

### Scenario 1: Coding a Supplier Invoice
**Best model**: Claude Haiku 4.5 or Gemini 2.5 Flash
**Why**: Fast, simple task requiring account lookup
**Expected response time**: 1-2 seconds
```
User: "Code this invoice: Office Depot, $450 for printer paper"
Haiku: "Code to Account 6300 - Office Supplies, GST Code: GST on Expenses"
```

---

### Scenario 2: Month-End Reconciliation Advice
**Best model**: Claude Sonnet 4.5
**Why**: Multi-step process requiring detailed understanding
**Expected response time**: 3-5 seconds
```
User: "Walk me through month-end bank reconciliation for 3 accounts"
Sonnet: Provides step-by-step process with specific account references,
common issues to check, and GST considerations
```

---

### Scenario 3: Cash Flow Forecasting
**Best model**: GPT-5.1 or Gemini 2.5 Pro
**Why**: Complex modeling with multiple variables
**Expected response time**: 5-8 seconds
```
User: "Create a 6-month cash flow forecast based on historical trends and
upcoming capital expenses"
GPT-5: Provides detailed forecast with scenario analysis and assumptions
```

---

### Scenario 4: Quick GST Calculation
**Best model**: Claude Haiku 4.5 or Gemini 2.5 Flash
**Why**: Simple calculation, instant answer needed
**Expected response time**: 1 second
```
User: "What's the GST-exclusive amount if total is $1,100?"
Haiku: "$1,000 (GST: $100)"
```

---

### Scenario 5: BAS Lodgement Preparation
**Best model**: Claude Sonnet 4.5
**Why**: Compliance-critical task requiring accuracy
**Expected response time**: 3-4 seconds
```
User: "What do I need to prepare for my Q2 BAS lodgement?"
Sonnet: Comprehensive checklist with deadlines, specific forms,
and common issues to review
```

---

### Scenario 6: Business Strategy Question
**Best model**: GPT-5.1
**Why**: Creative, strategic thinking required
**Expected response time**: 5-7 seconds
```
User: "Should we transition from hourly billing to value-based pricing?"
GPT-5: Analyzes pros/cons, provides implementation framework,
considers industry trends and your business context
```

---

## 2. Default Reasoning

**What it does**: Controls whether new chats start with "reasoning mode" enabled.

**Options**: Toggle on/off

**What is reasoning mode?**
When enabled, the AI:
- Shows its thinking process before answering
- Breaks down complex problems step-by-step
- Explains the reasoning behind recommendations
- Provides more transparent decision-making

**When to enable by default**:
- ✓ You frequently ask complex, multi-step questions
- ✓ You value understanding *why* not just *what*
- ✓ You're learning accounting/bookkeeping and want explanations
- ✓ You need to audit or verify AI recommendations

**When to disable by default**:
- ✓ You mostly ask simple, straightforward questions
- ✓ You prefer concise, direct answers
- ✓ Speed is more important than detailed explanations
- ✓ You're experienced and don't need the reasoning explained

**Note**: You can toggle reasoning on/off for individual chats regardless of this default.

**Example comparison**:

**Without reasoning mode**:
```
User: "Should I write off this $50 bad debt?"
LedgerBot: "Yes, for debts under $100 that are more than 12 months overdue,
you can write them off. Code to Account 6450 - Bad Debts Written Off."
```

**With reasoning mode**:
```
User: "Should I write off this $50 bad debt?"

LedgerBot [Thinking]:
- Debt is $50 (under the $100 threshold for simplified write-off)
- Need to check if customer has responded to collection attempts
- Tax implications: can claim immediate deduction if written off
- Alternative: could pursue if customer relationship matters
- Decision factors: cost of collection vs. amount owed

[Answer]:
"Yes, you should write this off. For debts under $100 that are more than
12 months overdue with no response to collection efforts, write-off is
appropriate. Code to Account 6450 - Bad Debts Written Off. Tax benefit:
immediate deduction in current year."
```

---

## 3. Tone & Style

**What it does**: Controls LedgerBot's communication personality and formality.

**Available options**: 4 preset styles

### Professional (Default)
**Characteristics**:
- Business-appropriate language
- Balanced formality
- Clear and respectful
- Focused on accuracy and clarity

**Best for**: Most business contexts, client-facing work, general use

**Example**:
```
"Based on your accounts receivable aging report, I recommend implementing
a 30/60/90 day follow-up process for overdue invoices. This approach balances
maintaining positive customer relationships while improving cash flow."
```

---

### Friendly
**Characteristics**:
- Conversational and approachable
- Less formal language
- Supportive and encouraging
- Still professional but warmer

**Best for**: Solo practitioners, learning scenarios, casual interactions

**Example**:
```
"Great question! Let's tackle your AR aging together. I'd suggest setting up
a simple follow-up schedule - friendly reminder at 30 days, firmer at 60,
and then a final notice at 90. It keeps things positive while still getting
you paid!"
```

---

### Formal
**Characteristics**:
- Highly professional language
- Precise and technical terminology
- Structured and methodical
- Minimal conversational elements

**Best for**: Formal documentation, audit preparation, regulatory contexts

**Example**:
```
"In accordance with AASB 9 Financial Instruments, accounts receivable aged
beyond 90 days require assessment for impairment. Implementation of a
systematic collection procedure aligned with the 30/60/90 day framework
is recommended to ensure compliance with credit risk management protocols."
```

---

### Concise
**Characteristics**:
- Brief, direct responses
- Minimal explanation unless requested
- Action-focused
- Efficient communication

**Best for**: Experienced users, quick answers, high-volume interactions

**Example**:
```
"Implement 30/60/90 day AR follow-up:
• Day 30: Reminder email
• Day 60: Phone call
• Day 90: Final notice + suspend credit

Reduces DSO, improves cash flow."
```

---

## Tone Selection Guide

### Choose Professional when:
- ✓ You're not sure which to pick (best default)
- ✓ Responses may be shared with clients or colleagues
- ✓ You want balanced formality and clarity
- ✓ Working in a team environment

### Choose Friendly when:
- ✓ You're a solo practitioner or small team
- ✓ You're learning and want supportive guidance
- ✓ You prefer conversational interactions
- ✓ Formality feels too stiff for your workflow

### Choose Formal when:
- ✓ Preparing audit documentation
- ✓ Generating reports for external stakeholders
- ✓ Compliance and regulatory contexts
- ✓ You prefer technical precision

### Choose Concise when:
- ✓ You're experienced and don't need explanations
- ✓ You value brevity above all else
- ✓ You have high message volume
- ✓ You know what you're looking for

---

## Combining Settings Effectively

### Configuration 1: Fast & Efficient
- **Model**: Claude Haiku 4.5
- **Reasoning**: Off
- **Tone**: Concise
- **Use case**: Experienced bookkeeper doing high-volume transaction coding

---

### Configuration 2: Learning Mode
- **Model**: Claude Sonnet 4.5
- **Reasoning**: On
- **Tone**: Friendly
- **Use case**: New business owner learning accounting concepts

---

### Configuration 3: Professional Standard
- **Model**: Claude Haiku 4.5 (daily) / Sonnet 4.5 (complex tasks)
- **Reasoning**: Off (toggle on when needed)
- **Tone**: Professional
- **Use case**: Established business with regular accounting workflows

---

### Configuration 4: Deep Analysis
- **Model**: GPT-5.1 or Gemini 2.5 Pro
- **Reasoning**: On
- **Tone**: Formal
- **Use case**: Strategic planning, complex financial analysis, audit prep

---

## Changing Settings Per-Chat

**Important**: Your AI Preferences set the *default* for new chats only.

**Per-chat controls**:
- Model selector (dropdown in chat interface)
- Reasoning toggle (button in chat interface)
- Tone remains as configured (change in settings to affect all chats)

**Workflow**:
1. Set default preferences for typical daily use
2. Change model/reasoning in specific chats when needed
3. Return to default for new chats automatically

---

## Impact on Response Quality

### Example: "Explain PAYG withholding"

**Haiku 4.5 + Concise**:
```
"PAYG withholding: Tax withheld from employee wages and remitted to ATO.
Calculate via tax tables, report on BAS, pay monthly/quarterly depending on size."
```

**Sonnet 4.5 + Professional + Reasoning**:
```
[Thinking]: Need to explain concept, requirements, and practical application
for Australian context. Consider user's business size and compliance obligations.

"PAYG (Pay As You Go) withholding is a system where employers withhold tax
from employee wages and remit it to the ATO. Here's what you need to know:

1. Calculation: Use ATO tax tables based on employee's tax-free threshold claim
2. Frequency: Remit monthly (if withheld >$25k annually) or quarterly (<$25k)
3. Reporting: Report on BAS (Business Activity Statement)
4. Timing: Due 21st of month following pay period
5. Penalties: Failure to withhold/remit incurs SGC penalties

For Acme Consulting with 15 staff, you're likely a monthly reporter."
```

**GPT-5.1 + Formal**:
```
"Pay As You Go (PAYG) withholding constitutes a taxation mechanism pursuant
to the Income Tax Assessment Act 1997 whereby employers are obligated to
withhold specified amounts from remuneration paid to employees. The withheld
amounts are subsequently remitted to the Australian Taxation Office (ATO).

Key compliance requirements:
• Withholding calculations must align with ATO tax tables (NAT 1004)
• Reporting obligations via Business Activity Statement (BAS)
• Remittance frequency determined by annual withholding volume threshold ($25,000)
• Payment deadlines: 21st day of subsequent month (monthly) or 28 days
  post-quarter (quarterly)

Non-compliance attracts Failure to Withhold (FTW) penalties under Division 16-30."
```

---

## Troubleshooting

### "Responses are too slow"
- Switch to Claude Haiku 4.5 or Gemini 2.5 Flash
- These models respond in 1-2 seconds vs. 4-6 seconds for flagship models

### "Responses lack detail"
- Switch to Claude Sonnet 4.5 or GPT-5.1
- Enable reasoning mode for more thorough explanations

### "Tone doesn't match what I want"
- Try different tone presets
- Add custom instructions (see Custom Instructions guide) for specific language preferences

### "Model selection doesn't save"
- Ensure you clicked "Save AI Preferences"
- Check that settings aren't locked
- Verify success toast appeared

### "Responses use wrong terminology (US vs AU)"
- Check Business Information → Country is set correctly
- The country setting overrides tone/style for terminology

---

## Best Practices

1. **Start with defaults**: Haiku 4.5 + Professional is excellent for most users
2. **Upgrade when needed**: Switch to Sonnet/GPT-5 for complex one-off tasks
3. **Match tone to audience**: Formal for external documents, Friendly for learning
4. **Enable reasoning when learning**: Helps understand the "why" behind advice
5. **Review cost vs. value**: Flagship models cost more - use strategically

---

**Next**: [Custom Instructions Guide →](./user-guide-personalisation-custom-instructions.md)
