# User Guide: Personalisation Settings

The **Personalisation Settings** page allows you to customize how LedgerBot behaves, understands your business, and interacts with you. By keeping this information up-to-date, you ensure that the AI provides accurate, compliant, and context-aware financial assistance.

**Location:** `Settings > Personalisation`

---

## 1. Business Information
This section defines the core identity and context of your business. LedgerBot uses this to tailor its accounting advice and transaction processing.

### Fields

| Field | Description | Technical Note |
| :--- | :--- | :--- |
| **Country** | Your business's tax residency (e.g., Australia). Determines regulatory context (ATO, GST). | Currently affects default regulatory rules. |
| **State / Province** | Your specific state (e.g., NSW, VIC). | Used for state-based tax or holiday logic if applicable. |
| **Timezone** | Your local timezone. | Essential for "Today's Date" and time-sensitive queries. |
| **Company Name** | The legal name of your business. | **Variable:** `{{COMPANY_NAME}}`<br/>*Synced automatically if Xero is connected.* |
| **Industry / Business Context** | A free-text description of your business (size, sector, staff, turnover). | **Variable:** `{{INDUSTRY_CONTEXT}}`<br/>You can insert dynamic variables here using the `{}` button. |
| **Chart of Accounts** | The list of account codes (e.g., "400 - Sales") used in your general ledger. | **Variable:** `{{CHART_OF_ACCOUNTS}}`<br/>*Synced automatically if Xero is connected.* |

### Xero Integration
If you have connected a Xero organisation:
- **Company Name** and **Chart of Accounts** are **automatically synced** and cannot be edited manually.
- To change these, you must update them in Xero or disconnect the integration.

---

## 2. AI Preferences
Control the underlying AI model and its communication style.

### Fields

- **Default Chat Model:** Select the AI "brain" used for your chats (e.g., GPT-4o, Claude 3.5 Sonnet).
    - *Tip:* Newer models are generally smarter but may be slower.
- **Reasoning:** A toggle to enable "Thinking Mode" by default.
    - *What it does:* The AI will "think" out loud before answering, breaking down complex accounting problems step-by-step. Useful for complex reconciliations or tax questions.
- **Tone & Style:** Choose how LedgerBot sounds (Professional, Friendly, Formal, Concise).

---

## 3. Custom Instructions
Advanced users can inject specific rules into the AI's system prompt. These instructions are appended to the default LedgerBot rules.

### Sections

1.  **Custom System Instructions:**
    -   Add global rules for how the AI should behave.
    -   *Example:* "Always ask for a receipt before recording expenses over $500."
    -   **Variable:** `{{CUSTOM_SYSTEM_INSTRUCTIONS}}`

2.  **Custom Code Instructions:**
    -   Rules for when the AI generates Python code artifacts.
    -   *Example:* "Use snake_case for all variable names."

3.  **Custom Sheet Instructions:**
    -   Rules for when the AI generates CSV spreadsheets.
    -   *Example:* "Always include a 'GST Amount' column."

---

## 4. Chat Suggestions
Customize the four "starter" prompts that appear on the main chat screen. These are useful for quick access to frequent tasks.

-   **Default:** "Draft an invoice...", "Analyze my spending...", etc.
-   **Custom:** You can replace these with your own frequent queries, like "Check for overdue invoices" or "Summarise this week's sales."
