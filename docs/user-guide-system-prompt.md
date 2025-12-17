# User Guide: System Prompt & AI Configuration

This guide explains the **System Prompt** architecture of LedgerBot. It is intended for both users seeking to understand how the AI "thinks" and developers looking to customize the AI's behavior.

---

## Overview

The **System Prompt** is the foundational set of instructions given to the AI at the start of every conversation. It defines LedgerBot's persona, capabilities, limitations, and knowledge base.

You can view the raw template in: `prompts/ledgerbot-system-prompt.md`.

---

## Structure of the System Prompt

The prompt is modular, composed of static rules and dynamic variables injected at runtime.

### 1. Role and Purpose
Defines LedgerBot as an **Australian Accounting Assistant**.
-   **Goal:** Manage financial transactions, ensure compliance (ATO/GST), and integrate with Xero.
-   **Behavior:** Precise, professional, and action-oriented.

### 2. Context Injection (Dynamic)
The system injects real-time data into the prompt to ground the AI's responses.

| Variable | Source | Description |
| :--- | :--- | :--- |
| `{{FIRST_NAME}}` | User Profile | User's first name. |
| `{{COMPANY_NAME}}` | Settings / Xero | The business entity being managed. |
| `{{TODAY_DATE}}` | System | Current date (critical for accounting periods). |
| `{{TIMEZONE}}` | Settings | User's configured timezone. |
| `{{BASE_CURRENCY}}` | Xero | The organisation's base currency (default AUD). |
| `{{IS_DEMO_COMPANY}}` | Xero | Boolean flag to warn users if they are modifying demo data. |

### 3. Industry Context
**Variable:** `{{INDUSTRY_CONTEXT}}`
-   Populated from the **Personalisation Settings**.
-   Contains free-text details about the business sector, size, and specific nuances.
-   *Effect:* The AI uses this to infer typical expenses or revenue streams (e.g., a "Cafe" implies coffee bean purchases and daily takings).

### 4. Chart of Accounts
**Variable:** `{{CHART_OF_ACCOUNTS}}`
-   Populated from **Xero Sync** or **Manual Settings**.
-   Contains the full list of active General Ledger accounts (Code + Name).
-   *Effect:* The AI can map natural language requests ("Bought a laptop") to specific GL codes ("720 - Office Equipment").

### 5. Capabilities & Constraints
Hard-coded rules ensuring safety and accuracy:
-   **Capabilities:** Recording transactions, calculating GST, Bank Recs, AP/AR analysis.
-   **Constraints:** Cannot lodge official BAS (only draft), cannot audit, cannot give legal advice.
-   **ABN Lookup:** Strict instruction to use `abn_search` tools rather than guessing business numbers.

### 6. Tone & Grammar
**Variable:** `{{TONE_AND_GRAMMAR}}`
-   Selected in **Personalisation Settings**.
-   Modifies the output style (e.g., "Professional" vs "Friendly").

---

## How It Works in Practice

When a user sends a message, the backend constructs the prompt:

1.  **Load Template:** Reads `ledgerbot-system-prompt.md`.
2.  **Fetch Data:** Retrieves User Settings and active Xero Connection metadata.
3.  **Replace Variables:** Substitutes `{{COMPANY_NAME}}`, `{{CHART_OF_ACCOUNTS}}`, etc., with actual data.
4.  **Append Custom Instructions:** Adds the user's `{{CUSTOM_SYSTEM_INSTRUCTIONS}}` to the end, giving them high priority.
5.  **Send to LLM:** The fully formed prompt is sent to the AI model (e.g., GPT-4o) alongside the user's message history.

## Customization for Developers

To modify the core behavior:
1.  **Edit `prompts/ledgerbot-system-prompt.md`**: Changes here affect ALL users.
2.  **Edit `app/(settings)/settings/personalisation/page.tsx`**: To add new configuration fields.
3.  **Update `lib/ai/prompts.ts`**: To handle new variable replacements if you add them to the template.
