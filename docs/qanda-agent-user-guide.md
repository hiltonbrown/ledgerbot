# Q&A Advisory Agent - User Guide

**For Small Business Owners, Bookkeepers, and Accountants**

---

## Table of Contents

1. [Introduction](#introduction)
2. [What is the Q&A Advisory Agent?](#what-is-the-qa-advisory-agent)
3. [Getting Started](#getting-started)
4. [Using the Q&A Agent](#using-the-qa-agent)
5. [Understanding Responses](#understanding-responses)
6. [Managing Settings](#managing-settings)
7. [Best Practices](#best-practices)
8. [Common Use Cases](#common-use-cases)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Introduction

Welcome to the LedgerBot Q&A Advisory Agent! This guide will help you use the regulatory-aware AI assistant to get accurate, cited answers to your Australian tax, employment law, and compliance questions.

### Who is this guide for?

- **Small Business Owners**: Get quick answers to compliance questions without waiting for your accountant
- **Bookkeepers**: Verify regulatory requirements while processing payroll and transactions
- **Accountants**: Research ATO rulings and Fair Work awards efficiently for client advisory work

### What you'll learn

- How to ask questions and get regulatory advice
- How to interpret confidence scores and citations
- When to escalate questions for human review
- How to customize the agent for your needs

---

## What is the Q&A Advisory Agent?

The Q&A Advisory Agent is an AI-powered assistant that provides answers to Australian regulatory and compliance questions. It searches a curated knowledge base of:

- **Fair Work Modern Awards** (employment law, minimum wages, conditions)
- **ATO Tax Rulings** (income tax, GST, superannuation, PAYG)
- **State Payroll Tax Guidance** (NSW, VIC, QLD, WA, SA, TAS, NT, ACT)

### What makes it different from regular AI chat?

✅ **Regulatory Citations**: Every answer includes links to official government sources
✅ **Confidence Scores**: You can see how confident the AI is in its answer (70-100%)
✅ **Australian-Specific**: Trained on current Australian tax and employment law
✅ **Xero Integration**: Can cross-reference answers with your actual business data
✅ **Human Review**: Low-confidence answers can be escalated to experts

### What it's NOT

❌ **Not a Replacement for Professional Advice**: For complex situations, always consult a registered tax agent or accountant
❌ **Not Real-Time**: Regulatory data is updated regularly but may lag behind very recent changes
❌ **Not Legal Advice**: This is informational guidance only

---

## Getting Started

### Step 1: Access the Q&A Agent

1. Log in to LedgerBot at [your-ledgerbot-url.com](https://your-ledgerbot-url.com)
2. Click **"Agents"** in the sidebar
3. Select **"Advisory Q&A"** from the agent list

You'll see the Q&A Agent workspace with three main areas:
- **Regulatory Knowledge Base Stats** (top banner)
- **Chat Interface** (main area)
- **Suggested Questions** (right sidebar)

### Step 2: Check Knowledge Base Status

Before asking questions, check the knowledge base stats at the top:

```
Modern Awards: 150
Tax Rulings: 320
State Payroll Tax: 8
Last updated: 2 days ago
```

✅ **Green Progress Bars**: Knowledge base is populated and current
⚠️ **Yellow/Red**: Knowledge base may need updating (contact your admin)
❌ **All Zeros**: System not yet configured (see technical guide)

### Step 3: Try a Suggested Question

Click any of the suggested questions in the sidebar to get started:
- "What's the minimum wage for a Level 3 retail worker?"
- "Explain the superannuation guarantee rate for FY2024-25"
- "What are the payroll tax thresholds for NSW and VIC?"

This helps you see how the system works before asking your own questions.

---

## Using the Q&A Agent

### Asking Questions

**Tips for Effective Questions:**

✅ **Be Specific**:
- ❌ "What about super?"
- ✅ "What's the current superannuation guarantee rate for employees?"

✅ **Include Context**:
- ❌ "Payroll tax threshold?"
- ✅ "What's the payroll tax threshold for a business in Victoria?"

✅ **Mention Relevant Details**:
- ❌ "Minimum wage?"
- ✅ "What's the minimum wage for a Level 2 hospitality worker under the Hospitality Award?"

**How to Ask:**

1. **Type your question** in the text area at the bottom
2. **Press Enter** or click **"Send"** button
3. **Wait for response** (usually 2-5 seconds)

**Keyboard Shortcuts:**
- **Enter**: Send message
- **Shift + Enter**: New line (for multi-line questions)

### Understanding the Response

Every response includes several elements:

#### 1. Answer Text
The main answer in plain English with:
- **Bold** for key terms and numbers
- **Bullet points** for lists and conditions
- **Markdown formatting** for readability

#### 2. Confidence Score
Located at the bottom of assistant responses:

| Score | Badge Color | Meaning | Action |
|-------|------------|---------|---------|
| 80-100% | 🟢 Green | High confidence - reliable answer | Use with confidence |
| 60-79% | 🟡 Yellow | Medium confidence - verify important details | Cross-check if critical |
| Below 60% | 🔴 Red | Low confidence - may be incomplete | Request human review |

**Example:**
```
Confidence: 95% 🟢
```
This means the AI is very confident in its answer based on clear regulatory sources.

#### 3. Regulatory Citations

Below each answer, you'll see citation cards like:

```
📄 Superannuation Guarantee Ruling SGR 2009/2
   Tax Ruling
   https://www.ato.gov.au/law/view/document?docid=SGR/SGR20092
```

**What to do with citations:**
- ✅ **Click the link** to view the official government document
- ✅ **Save the link** for your records or client files
- ✅ **Share with clients** to back up your advice
- ✅ **Verify dates** to ensure the ruling is still current

#### 4. Review Status

Some answers may show:
```
⚠️ Review Required
```

This means:
- Confidence is below your threshold (default: 70%)
- The question may be complex or ambiguous
- You should click **"Request Review"** to escalate to a human expert

### Using Stream Controls

At the bottom of the chat interface, you'll find two toggles:

**Stream Responses** (default: ON)
- Shows the answer as it's being generated (word-by-word)
- Feels more interactive and responsive
- Turn OFF if you prefer to see complete answers only

**Show Citations** (default: ON)
- Displays regulatory sources below each answer
- Essential for compliance and audit trails
- Turn OFF only if you're doing quick exploratory research

---

## Understanding Responses

### Example Question & Response

**Your Question:**
> "What's the superannuation guarantee rate for the 2024-25 financial year?"

**Agent Response:**

---

The Superannuation Guarantee (SG) rate for the 2024-25 financial year is **11.5%** of an employee's ordinary time earnings.

This rate applies from 1 July 2024. The SG rate is scheduled to increase to 12% from 1 July 2025.

**Key Points:**
- Employers must pay SG contributions at least quarterly
- The quarterly due dates are 28 days after the end of each quarter
- Ordinary time earnings include most payments for ordinary hours of work, but exclude overtime
- The current quarterly earnings threshold is $450 (employees earning less than this are still entitled to SG)

**Note:** This information is current as of the effective date shown in the ATO ruling. For specific situations or recent changes, please consult with a registered tax agent.

**Citations:**
📄 **Superannuation Guarantee Ruling SGR 2009/2**
Tax Ruling
[View on ATO website](https://www.ato.gov.au/law/view/document?docid=SGR/SGR20092)

📄 **Super guarantee percentage**
Tax Ruling
[View on ATO website](https://www.ato.gov.au/rates/key-superannuation-rates-and-thresholds)

**Confidence: 95%** 🟢

---

### What This Response Tells You

✅ **Clear Answer**: 11.5% for FY2024-25
✅ **Forward Guidance**: Increase to 12% from 1 July 2025
✅ **Practical Details**: Quarterly payment obligations
✅ **Official Sources**: Two ATO rulings cited
✅ **High Confidence**: 95% - very reliable
✅ **Disclaimer**: Reminds you to seek professional advice for complex situations

### When to Trust the Answer

**You can generally trust answers when:**
- ✅ Confidence is 80% or higher
- ✅ Multiple citations are provided
- ✅ The answer includes specific numbers, dates, or thresholds
- ✅ Citations are from official government sources (ato.gov.au, fairwork.gov.au)

**Be cautious when:**
- ⚠️ Confidence is below 80%
- ⚠️ No citations are provided
- ⚠️ The answer is vague or uses phrases like "it depends"
- ⚠️ You're dealing with complex situations (multiple states, special industries)

### Requesting Human Review

If you see a low-confidence answer or want expert verification:

1. **Click "Request Review"** button below the response
2. **Add context** (optional): Explain why you need human review
3. **Submit**: Your question is sent to a human expert
4. **Wait for response**: Usually 1-2 business days
5. **Receive notification**: You'll get an email when the expert responds

**When to request review:**
- Your business depends on getting this exactly right (e.g., BAS lodgement deadlines)
- The answer affects significant financial decisions (e.g., hiring staff, choosing awards)
- You're advising a client and need 100% certainty
- The confidence score is red (below 60%)

---

## Managing Settings

### Accessing Q&A Agent Settings

1. Click **"Settings"** in the sidebar
2. Select **"Agents"** from the settings menu
3. Scroll to **"Advisory and Q&A Agent"** section

### Key Settings Explained

#### Response Confidence Threshold (0-100%)

**Default: 70%**

This controls when answers are flagged for human review.

- **Set to 90%**: Only very high-confidence answers shown without review flag
- **Set to 70%**: Balanced - catches most uncertain answers
- **Set to 50%**: Permissive - see more answers without review flags

**Recommendation:**
- **Small business owners**: 80% (prefer higher certainty)
- **Bookkeepers**: 70% (balanced for daily work)
- **Accountants**: 60% (comfortable verifying answers yourself)

#### Knowledge Base Selection

Choose which regulatory sources the agent searches:

| Option | Use Case |
|--------|----------|
| **All regulatory sources** | General compliance questions (default) |
| **ATO tax rulings only** | Tax-specific questions (income tax, GST, super) |
| **Fair Work awards only** | Employment law questions (wages, conditions) |
| **State payroll tax only** | Multi-state payroll questions |
| **Custom documents** | Your own uploaded policies and procedures |

**Example:**
If you only do tax work, select "ATO tax rulings only" to get faster, more focused answers.

#### Hallucination Prevention

Controls how cautious the AI is:

- **Conservative** (safest): Only answers questions with clear regulatory guidance
- **Balanced** (recommended): Handles most questions while staying safe
- **Aggressive** (most flexible): Attempts more complex questions but less certain

**When to change:**
- Use **Conservative** for critical compliance work (BAS, payroll tax)
- Use **Balanced** for daily bookkeeping questions (most common)
- Use **Aggressive** for exploratory research only (not for client advice)

#### Human Escalation

**Default: ON**

When enabled, low-confidence answers are automatically flagged and can be escalated to human experts.

**Turn OFF if:**
- You're just exploring and don't need expert review
- You're comfortable verifying all answers yourself

**Keep ON if:**
- You're advising clients (accountants)
- Compliance mistakes could be costly (payroll, BAS)
- You prefer expert verification for important questions

### Regulatory Source Categories

These toggles show which sources are active in your knowledge base:

✅ **Fair Work awards** (always on)
✅ **ATO tax rulings** (always on)
✅ **State payroll tax** (always on)

**Note:** These are system-managed and updated automatically. Contact your administrator if you need additional regulatory sources.

### Display Citations

**Default: ON**

Shows regulatory source citations below each answer.

**Keep ON for:**
- Client advisory work (accountants)
- Compliance documentation (bookkeepers)
- Audit trails (all users)

**Turn OFF only if:**
- You're doing quick exploratory research
- You trust the AI and don't need to verify sources

---

## Best Practices

### For Small Business Owners

**DO:**
✅ Use suggested questions to learn what the agent can answer
✅ Start with simple questions before complex scenarios
✅ Save citation links for your records
✅ Request human review for important decisions (hiring, awards, tax)
✅ Combine agent answers with your accountant's advice

**DON'T:**
❌ Use agent answers as legal advice
❌ Skip reading the full response (don't just trust the summary)
❌ Ignore low-confidence warnings
❌ Share client data in questions (agent logs conversations)
❌ Make major business decisions without professional verification

### For Bookkeepers

**DO:**
✅ Use agent to quickly verify pay rates and super calculations
✅ Check multiple sources when confidence is below 85%
✅ Save citations for client files
✅ Set confidence threshold to 70-80% for daily work
✅ Request review for payroll tax questions across multiple states
✅ Cross-reference with Xero data when connected

**DON'T:**
❌ Process payroll based solely on agent advice (verify first)
❌ Use agent for complex modern award interpretations
❌ Ignore review flags on compliance-critical questions
❌ Share client business names or ABNs in questions
❌ Rely on agent for time-sensitive lodgement questions (verify dates)

### For Accountants

**DO:**
✅ Use agent for initial research before diving into legislation
✅ Verify all answers against primary sources (use citations)
✅ Set confidence threshold to 60-70% (you can verify yourself)
✅ Save citations for client letters and advisory documents
✅ Use agent to quickly find relevant ATO rulings
✅ Request review for novel or complex interpretations
✅ Combine agent research with your professional judgment

**DON'T:**
❌ Copy agent responses directly into client advice
❌ Skip verification of facts, numbers, and dates
❌ Use agent as your only research source
❌ Share client-identifying information in questions
❌ Provide agent answers as professional tax advice without review

---

## Common Use Cases

### 1. Checking Minimum Wages

**Scenario:** You're hiring a retail worker and need to know the minimum wage.

**Question:**
> "What's the minimum wage for a Level 3 retail employee under the General Retail Industry Award?"

**What you'll get:**
- Current hourly rate (e.g., $24.51/hour)
- Effective date (e.g., "from 1 July 2024")
- Award citation with link
- Confidence score (usually 90%+)

**Next steps:**
1. ✅ Click citation to verify on Fair Work website
2. ✅ Check effective dates match your hiring date
3. ✅ If hiring soon, verify no recent award updates
4. ✅ Save citation for HR records

### 2. Superannuation Obligations

**Scenario:** You need to calculate super for a new employee.

**Question:**
> "What's the current superannuation guarantee rate and when are quarterly payments due?"

**What you'll get:**
- Current SG rate (e.g., 11.5%)
- Future rate increases (e.g., "12% from 1 July 2025")
- Quarterly due dates (28 days after quarter end)
- ATO ruling citations

**Next steps:**
1. ✅ Note the rate for your payroll calculations
2. ✅ Set calendar reminders for quarterly due dates
3. ✅ Save ATO ruling links for compliance records
4. ✅ If confidence below 90%, verify on ATO website

### 3. Payroll Tax Thresholds

**Scenario:** Your business operates in NSW and VIC, and you need to know payroll tax obligations.

**Question:**
> "What are the current payroll tax thresholds and rates for businesses operating in New South Wales and Victoria?"

**What you'll get:**
- NSW threshold and rate (e.g., $1.2M, 5.45%)
- VIC threshold and rate (e.g., $700K, 4.85%)
- State revenue office citations
- Confidence score (usually 85%+)

**Next steps:**
1. ✅ Click citations to verify on state revenue websites
2. ✅ Check if your payroll exceeds thresholds
3. ✅ If confidence below 80%, request human review
4. ✅ Consult your accountant for registration requirements

### 4. BAS Lodgement Deadlines

**Scenario:** You need to confirm your BAS lodgement deadline.

**Question:**
> "When is the BAS lodgement deadline for quarterly reporters for the October-December quarter?"

**What you'll get:**
- Lodgement date (e.g., "28 February")
- Reporting period (October-December)
- ATO citation with lodgement calendar
- Confidence score

**Next steps:**
1. ✅ Verify date on ATO Business Portal
2. ✅ Set calendar reminder 1 week before deadline
3. ✅ If using a tax agent, check if extended deadline applies
4. ✅ Request review if date seems incorrect

### 5. Award Classification

**Scenario:** You need to know which award applies to a hospitality worker.

**Question:**
> "What Fair Work award applies to a chef working in a restaurant, and how do I classify their level?"

**What you'll get:**
- Award name (e.g., "Hospitality Industry (General) Award 2020")
- Award code (e.g., MA000009)
- Classification levels explanation
- Fair Work citation

**Next steps:**
1. ✅ Download full award from Fair Work website
2. ✅ Review classification definitions (levels 1-5)
3. ✅ Request human review if unsure about classification
4. ✅ Document classification decision for records

### 6. PAYG Withholding

**Scenario:** You need to understand PAYG withholding obligations.

**Question:**
> "What are my obligations for PAYG withholding for employees, and when do I need to report?"

**What you'll get:**
- Withholding requirements
- Reporting timeframes (monthly, quarterly, or annual)
- Payment due dates
- ATO citations

**Next steps:**
1. ✅ Confirm your reporting cycle based on total withholding
2. ✅ Set up payroll software for automatic calculations
3. ✅ Note reporting dates for calendar
4. ✅ If new to PAYG, consult accountant for setup

---

## Troubleshooting

### Problem: No Regulatory Stats Showing

**Symptoms:**
- Knowledge base shows "0" for all categories
- Message: "Knowledge base not yet initialized"

**Solution:**
1. Contact your system administrator or IT support
2. The regulatory knowledge base needs to be configured
3. See technical maintenance guide for setup instructions

**Temporary workaround:**
- Use general chat (not Q&A agent) for basic questions
- Manually search ato.gov.au and fairwork.gov.au

### Problem: Very Low Confidence Scores

**Symptoms:**
- Most answers show confidence below 70%
- Frequent "Review Required" flags

**Possible causes:**
1. **Your questions are too complex**: Try breaking into simpler sub-questions
2. **Knowledge base is outdated**: Check "Last updated" date in stats
3. **Question is ambiguous**: Rephrase with more specific details

**Solutions:**
- ✅ Add more context to your questions
- ✅ Ask about one topic at a time
- ✅ If stats show "Last updated: 30+ days ago", contact administrator
- ✅ Request human review for important questions

### Problem: No Citations Shown

**Symptoms:**
- Answers appear but no citation cards below

**Check:**
1. Is "Show Citations" toggle ON? (bottom of chat interface)
2. Does the answer say "No regulatory documents found"?

**Solutions:**
- ✅ Turn ON "Show Citations" toggle
- ✅ If no regulatory docs found, question may be outside agent's knowledge
- ✅ Try rephrasing with more specific regulatory terms
- ✅ Use general chat for non-regulatory questions

### Problem: Slow Responses

**Symptoms:**
- Answers take more than 10 seconds to appear

**Possible causes:**
1. Network connectivity issues
2. Complex question requiring multiple sources
3. System under heavy load

**Solutions:**
- ✅ Check your internet connection
- ✅ Wait for response (can take up to 30 seconds for complex questions)
- ✅ If consistently slow (>30 seconds), contact support
- ✅ Try suggested questions to test if problem is question-specific

### Problem: Answer Seems Outdated

**Symptoms:**
- Rates, thresholds, or dates don't match current information

**Check:**
1. Look at citation dates (older than 12 months?)
2. Check "Last updated" in knowledge base stats
3. Verify on official government website

**Solutions:**
- ✅ Click citation links to check official sources
- ✅ If regulatory data is outdated, contact administrator
- ✅ Note the effective date mentioned in the answer
- ✅ For critical decisions, always verify on official websites

### Problem: Can't Request Human Review

**Symptoms:**
- "Request Review" button is disabled or missing

**Check:**
1. Is "Human Escalation" enabled in settings?
2. Is your user account authorized for review requests?

**Solutions:**
- ✅ Go to Settings → Agents → Q&A Agent
- ✅ Turn ON "Human Escalation"
- ✅ If still disabled, contact your account administrator
- ✅ Temporarily, save the question and email your accountant directly

---

## FAQ

### General Questions

**Q: Is the Q&A agent connected to my Xero account?**
A: Yes, if you've connected Xero in Settings → Integrations. The agent can cross-reference regulatory requirements with your actual payroll and invoice data.

**Q: Can I ask questions about regulations in other countries?**
A: Currently, the agent only covers Australian regulations. Support for NZ, UK, and US is planned for future releases.

**Q: How current is the regulatory information?**
A: The knowledge base is updated regularly (check "Last updated" in stats). Most sources are refreshed weekly or monthly depending on update frequency.

**Q: Can I upload my own compliance documents?**
A: Yes, via Settings → Agents → Knowledge Base → "Custom documents". Upload your company policies, procedures, or internal guidelines.

**Q: Is my conversation history private?**
A: Yes, conversations are private to your account. Only you and authorized administrators can view your Q&A history. Never share client-identifying information.

### Technical Questions

**Q: Can I export my Q&A history?**
A: Not currently available in the UI. Contact support if you need compliance records.

**Q: What happens if I ask a question outside the agent's knowledge?**
A: The agent will respond with low confidence and suggest: (1) rephrasing, (2) using general chat, or (3) requesting human review.

**Q: Can I customize suggested questions?**
A: Not currently. Suggested questions are curated for common Australian compliance scenarios.

**Q: Does the agent learn from my questions?**
A: No, the agent doesn't learn from individual conversations. Knowledge base updates are managed centrally by administrators.

**Q: Can I use the agent offline?**
A: No, the agent requires internet connection to access the regulatory knowledge base and AI models.

### Compliance Questions

**Q: Can I rely on agent answers for BAS lodgements?**
A: Use agent answers as guidance, but always verify critical details on the ATO Business Portal. Request human review for lodgement-critical questions.

**Q: What if the agent gives me wrong information?**
A: The agent provides informational guidance only. Always verify important decisions with official sources and registered professionals. Report errors to support.

**Q: Is using the agent a substitute for hiring an accountant?**
A: No. The agent helps with research and routine questions, but you still need professional advice for complex situations, tax planning, and critical decisions.

**Q: Can the agent help with ATO audits?**
A: The agent can help you understand ATO rulings and requirements, but audit responses should be prepared by a registered tax agent with full knowledge of your situation.

**Q: What if I'm in a specialized industry (construction, mining, etc.)?**
A: The agent covers general awards and tax rules. For industry-specific awards and conditions, verify answers against your specific modern award and request human review.

---

## Getting Help

### Support Resources

📧 **Email Support**: support@ledgerbot.com
📱 **Phone Support**: 1300 XXX XXX (Mon-Fri, 9am-5pm AEST)
💬 **Live Chat**: Available in LedgerBot (bottom right corner)
📚 **Knowledge Base**: help.ledgerbot.com

### When to Contact Support

Contact support if:
- Knowledge base stats show all zeros
- Confidence scores are consistently very low (below 50%)
- Citations aren't loading
- You need human review but can't request it
- You find incorrect regulatory information
- System performance is very slow (>30 seconds per response)

### When to Contact Your Accountant

Contact your accountant/tax agent for:
- Complex tax planning questions
- Business structure advice
- ATO audit or review responses
- Multi-jurisdictional compliance questions
- Novel or unusual business situations
- Decisions with significant financial impact

---

## Appendix: Sample Questions

### Tax Questions

✅ "What's the current small business CGT concession threshold?"
✅ "When are quarterly GST payments due for a business registered for GST?"
✅ "What's the company tax rate for base rate entities in FY2024-25?"
✅ "What are the instant asset write-off rules for small businesses?"
✅ "How do I calculate FBT on a company car?"

### Employment Law Questions

✅ "What's the minimum wage for a casual Level 2 retail worker?"
✅ "What are the casual loading rates under the Hospitality Award?"
✅ "How much annual leave is an employee entitled to?"
✅ "What notice period is required to terminate an employee?"
✅ "What are the superannuation contribution requirements for contractors?"

### Payroll Questions

✅ "What's the payroll tax threshold for Queensland?"
✅ "When do I need to register for payroll tax in NSW?"
✅ "What payroll costs are included in the payroll tax calculation?"
✅ "What's the difference between payroll tax and PAYG withholding?"
✅ "How do I calculate super for employees paid monthly?"

### Compliance Questions

✅ "When is the BAS lodgement deadline for quarterly reporters?"
✅ "What records do I need to keep for ATO compliance?"
✅ "How long do I need to retain employee payroll records?"
✅ "What are the penalties for late superannuation payments?"
✅ "When do I need to lodge my annual tax return?"

---

## Document Version

**Version:** 1.0
**Last Updated:** October 2025
**System:** LedgerBot Q&A Advisory Agent
**Applicable Regions:** Australia

---

**Disclaimer:** This guide provides instructions for using the LedgerBot Q&A Advisory Agent. Answers provided by the agent are for informational purposes only and do not constitute professional tax, legal, or financial advice. Always consult with registered professionals for decisions affecting your business.

---

**Need more help?** Visit [help.ledgerbot.com](https://help.ledgerbot.com) or contact support@ledgerbot.com
