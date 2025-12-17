# Personalisation User Guides - Summary

## Overview

This document summarizes the complete user guide series for LedgerBot's Personalisation settings (`/settings/personalisation`).

## Created Documentation

### 1. [Personalisation Overview](./user-guide-personalisation-overview.md)
**Purpose**: Introduction to personalization, why it matters, and how it affects AI responses

**Key Topics**:
- What personalization is and why it's important
- Overview of all 5 settings sections
- Template variable system explanation
- Lock settings and security
- Quick start guide for new users

**Target Audience**: All users, especially those new to LedgerBot

---

### 2. [Business Information Guide](./user-guide-personalisation-business-info.md)
**Purpose**: Detailed explanation of all business information fields and their impact

**Key Topics**:
- **Country & State**: Location-based tax and regulatory context
- **Timezone**: Date/time accuracy in responses
- **Company Name**: Organization identity (Xero sync or manual)
- **Industry Context**: Business type and operations (200 chars)
- **Chart of Accounts**: Account structure (1000 chars, Xero sync or manual)
- **Custom Variables**: User-defined template variables
- Template preview and validation
- Xero sync behavior and management

**Includes**: 20+ practical examples, before/after comparisons, industry-specific templates

**Target Audience**: All users setting up or refining their business context

---

### 3. [AI Preferences Guide](./user-guide-personalisation-ai-preferences.md)
**Purpose**: Model selection, reasoning mode, and communication tone settings

**Key Topics**:
- **6 AI Models**: Detailed comparison across Anthropic, OpenAI, Google
  - Claude Sonnet 4.5: Balanced high-quality responses
  - Claude Haiku 4.5: Fast, cost-efficient (default)
  - GPT-5.1: Complex analysis and creative tasks
  - GPT-5 Mini: OpenAI quality, better value
  - Gemini 2.5 Flash: Ultra-fast Google model
  - Gemini 2.5 Pro: Advanced Google reasoning
- **Reasoning Mode**: When to enable/disable thinking process visibility
- **Tone & Style**: Professional, Friendly, Formal, Concise options
- Cost/Speed/Quality matrix
- Model selection guide by use case
- 10+ scenario-based examples

**Includes**: Practical examples showing response differences between models and tones

**Target Audience**: Users wanting to optimize AI performance and communication style

---

### 4. [Custom Instructions Guide](./user-guide-personalisation-custom-instructions.md)
**Purpose**: Extending base prompts with business-specific rules and preferences

**Key Topics**:
- **Custom System Instructions**: General behavior (400 chars)
  - Working preferences, terminology, business rules
  - Compliance reminders, response structure
  - 10+ examples by business type
- **Custom Code Instructions**: Python code generation (400 chars)
  - Coding style, libraries, output formats
  - Error handling, business logic
- **Custom Spreadsheet Instructions**: CSV formatting (400 chars)
  - Column preferences, formatting rules
  - Data structure, business rules
- Writing effective instructions (Do's and Don'ts)
- Layering with other settings
- Testing and troubleshooting

**Includes**: 30+ real-world examples across different industries and use cases

**Target Audience**: Advanced users wanting fine-grained control over AI behavior

---

### 5. [Chat Suggestions Guide](./user-guide-personalisation-chat-suggestions.md)
**Purpose**: Customizing the 4 quick-start prompts on the main chat page

**Key Topics**:
- Why customize suggestions
- Best practices for writing effective suggestions
- Suggestion ideas by role (Owner, Bookkeeper, Accountant, etc.)
- Suggestion ideas by industry (Retail, Professional Services, etc.)
- Suggestion ideas by frequency (Daily, Weekly, Monthly)
- Managing suggestions over time
- Seasonal adjustments
- Before/after examples

**Includes**: 50+ suggestion templates across different roles and industries

**Target Audience**: All users wanting to streamline their daily workflows

---

## Documentation Structure

```
docs/
├── user-guide-personalisation-overview.md          (Entry point, 2,800 words)
├── user-guide-personalisation-business-info.md     (Detailed field guide, 5,200 words)
├── user-guide-personalisation-ai-preferences.md    (Model guide, 5,800 words)
├── user-guide-personalisation-custom-instructions.md (Advanced customization, 5,600 words)
├── user-guide-personalisation-chat-suggestions.md  (Quick-start prompts, 3,400 words)
└── PERSONALISATION_GUIDES_SUMMARY.md              (This file)
```

**Total documentation**: ~23,000 words, 5 comprehensive guides

---

## Key Features of These Guides

### 1. Comprehensive Coverage
Every field on the `/settings/personalisation` page is documented with:
- What it does
- How it affects AI responses
- Character limits and constraints
- Best practices
- Real-world examples

### 2. Practical Examples
Over 100 examples showing:
- Before/after comparisons
- Industry-specific configurations
- Role-based setups
- Common mistakes and corrections

### 3. Model Selection Guidance
Detailed comparison of 6 AI models including:
- Cost/speed/quality trade-offs
- Best use cases for each model
- Scenario-based recommendations
- Response time expectations

### 4. Progressive Complexity
Guides are structured for different skill levels:
- **Beginners**: Start with Overview → Business Info basics
- **Intermediate**: Add AI Preferences, simple Custom Instructions
- **Advanced**: Full customization with Custom Instructions and template variables

### 5. Cross-Referenced
Each guide links to related documentation:
- Other personalization guides
- CLAUDE.md technical reference
- System prompt architecture docs

---

## Quick Reference Tables

### Model Selection by Use Case

| Use Case | Recommended Model | Why |
|----------|-------------------|-----|
| Daily transaction coding | Claude Haiku 4.5 | Fast, accurate, cost-effective |
| Complex accounting questions | Claude Sonnet 4.5 | Deep reasoning, detailed analysis |
| Strategic planning | GPT-5.1 | Creative thinking, scenario analysis |
| Cash flow forecasting | GPT-5.1 or Gemini 2.5 Pro | Advanced modeling capabilities |
| Quick GST calculations | Haiku or Gemini Flash | Instant responses |
| BAS preparation | Claude Sonnet 4.5 | Compliance-critical accuracy |
| Learning accounting | Sonnet + Reasoning On | Visible thinking process |

### Tone by Context

| Context | Recommended Tone | Why |
|---------|------------------|-----|
| General business use | Professional | Balanced, shareable |
| Solo practitioner | Friendly | Conversational, supportive |
| Audit preparation | Formal | Technical precision |
| Experienced user | Concise | Efficient, direct |
| Learning/training | Friendly | Encouraging, explanatory |
| Client-facing documents | Formal or Professional | Business-appropriate |

### Character Limits Reference

| Field | Limit | Priority Content |
|-------|-------|------------------|
| Industry Context | 200 chars | Business type, size, unique characteristics |
| Chart of Accounts | 1000 chars | Most-used accounts, GST accounts, structure |
| Custom System Instructions | 400 chars | Business-critical rules, flagging thresholds |
| Custom Code Instructions | 400 chars | Coding style, libraries, output format |
| Custom Sheet Instructions | 400 chars | Column preferences, formatting rules |

---

## Common User Journeys

### Journey 1: New User Setup (15 minutes)

1. **Read**: [Personalisation Overview](./user-guide-personalisation-overview.md)
2. **Set**: Country, Timezone (Business Information)
3. **Choose**: Model = Haiku, Tone = Professional (AI Preferences)
4. **Test**: Start a chat, ask a simple question
5. **Refine**: Add company name, brief industry context

**Expected outcome**: Basic personalization working, AI responses contextually relevant

---

### Journey 2: Xero User (10 minutes)

1. **Read**: Business Information Guide - Xero sync sections
2. **Verify**: Company name and chart auto-synced
3. **Add**: Industry context (manual), timezone
4. **Review**: Template preview to verify
5. **Test**: Ask about account coding to verify chart is being used

**Expected outcome**: Xero data integrated, AI provides coding suggestions matching your chart

---

### Journey 3: Advanced Customization (30 minutes)

1. **Read**: All 5 guides (or skim for relevant sections)
2. **Configure**: Full business information with custom variables
3. **Customize**: Add system instructions for business-specific rules
4. **Optimize**: Choose model based on usage patterns
5. **Personalize**: Set up 4 chat suggestions for daily tasks
6. **Test**: Comprehensive testing across different question types

**Expected outcome**: Fully customized LedgerBot instance tailored to specific business

---

### Journey 4: Model Optimization (20 minutes)

1. **Read**: [AI Preferences Guide](./user-guide-personalisation-ai-preferences.md)
2. **Benchmark**: Test same question with 3 different models
3. **Evaluate**: Compare speed, depth, accuracy
4. **Choose**: Select best default model for your needs
5. **Document**: Note which models work best for which tasks

**Expected outcome**: Optimized model selection balancing cost, speed, quality

---

## Integration with Other Features

### Personalization + Xero Integration
- Company name and chart auto-sync
- Account coding suggestions use your actual accounts
- Xero org type influences compliance advice
- Currency and reporting period alignment

### Personalization + Context Files
- Industry context helps AI interpret uploaded documents
- Custom instructions apply to file analysis
- Tone settings affect document summaries

### Personalization + Agents
- AR agent uses your chart for account coding
- Workflow supervisor understands your business context
- Compliance assistant references your jurisdiction

---

## Maintenance and Updates

### When to Update Settings

**Monthly Review**:
- Are chat suggestions still your top 4 tasks?
- Is industry context still accurate?

**Quarterly Review**:
- Is your model choice still optimal?
- Do custom instructions need refinement?
- Are custom variables still relevant?

**Major Changes**:
- New business location → Update country/state
- Industry shift → Update industry context
- New accounting system → Update chart of accounts
- Xero connection/disconnection → Verify auto-sync fields

---

## Success Metrics

After personalizing LedgerBot, users should see:

### Improved Response Quality
- ✓ AI uses your specific account codes
- ✓ Regulatory advice matches your jurisdiction
- ✓ Industry terminology is relevant
- ✓ Dates and times are in your timezone

### Increased Efficiency
- ✓ One-click access to common tasks (suggestions)
- ✓ Faster responses (optimal model selection)
- ✓ Less need to provide context repeatedly
- ✓ More accurate first-time answers

### Better Learning
- ✓ Reasoning mode shows AI's thinking
- ✓ Explanations match your expertise level
- ✓ Tone matches your learning style

---

## Troubleshooting Resources

Each guide includes a "Troubleshooting" section covering:
- Common issues and solutions
- Validation errors and fixes
- Character limit strategies
- Setting conflicts resolution

**Additional resources**:
- [CLAUDE.md](../CLAUDE.md) - Technical architecture
- [System Prompt Refactor Notes](./system-prompt-refactor-notes.md) - Template system
- [AI Preferences Audit](./ai-preferences-audit.md) - Settings validation

---

## Future Enhancements (Planned)

Based on these guides, potential future improvements:

1. **Visual Template Builder**: UI for constructing custom instructions
2. **Suggestion Templates**: Pre-built suggestion sets by industry/role
3. **Smart Suggestions**: AI-learned suggestions based on usage
4. **Contextual Suggestions**: Time-based or role-based dynamic suggestions
5. **Multi-Profile Support**: Different configurations for different contexts
6. **Import/Export Settings**: Share configurations across accounts

---

## Feedback and Contributions

These guides are living documents. If you find:
- Errors or outdated information
- Missing use cases or examples
- Unclear explanations
- Opportunities for improvement

Please report via GitHub issues or contribute updates directly.

---

## Document Metadata

**Created**: December 2025
**Version**: 1.0
**Authors**: Claude Code (Anthropic)
**Maintained by**: LedgerBot Documentation Team

**Related Documentation**:
- [CLAUDE.md](../CLAUDE.md) - Main technical reference
- [README.md](../README.md) - Project overview
- System Prompt Architecture docs
- AI Preferences technical docs

**Status**: ✅ Complete - Covers all fields on `/settings/personalisation` page

---

## Quick Links

### Start Here
- [Personalisation Overview](./user-guide-personalisation-overview.md)

### By Topic
- [Business Information](./user-guide-personalisation-business-info.md) - Location, company, industry, chart of accounts
- [AI Preferences](./user-guide-personalisation-ai-preferences.md) - Models, reasoning, tone
- [Custom Instructions](./user-guide-personalisation-custom-instructions.md) - Business-specific rules
- [Chat Suggestions](./user-guide-personalisation-chat-suggestions.md) - Quick-start prompts

### Technical Reference
- [CLAUDE.md](../CLAUDE.md) - Architecture and development
- [System Prompt Templates](./system-prompt-refactor-notes.md) - Template system details
- [AI Preferences Audit](./ai-preferences-audit.md) - Settings validation

---

**End of Summary**
