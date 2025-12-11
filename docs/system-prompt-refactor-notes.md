# System Prompt Refactor Notes

## 1. Current State

The Ledgerbot system prompt is currently constructed in a fragmented manner:

*   **Main Chat (`app/(chat)/api/chat/route.ts`):**
    *   Uses a rich, personalized prompt derived from `prompts/ledgerbot-system-prompt.md`.
    *   **Construction:** `lib/ai/prompts.ts` now contains `buildLedgerbotSystemPrompt()` which loads the markdown template and performs string substitution (replacing `{{FIRST_NAME}}`, `{{COMPANY_NAME}}`, etc.) using data from user settings and Xero connection.
    *   **Rendering Pipeline:** Template → Variable Substitution → Sanitization → Artifacts Appending → Final Prompt
    *   **Personalization:** Heavily personalized with user details, company info, and Xero chart of accounts.
    *   **✅ REFACTORED:** This part of the system now uses the template-based architecture described in section 3.

*   **Agents & Deep Research:**
    *   **Deep Research (`lib/deep-research.ts`):** Uses hardcoded constant strings (`PLAN_SYSTEM_PROMPT`, etc.) defined within the file. It does **not** share the main system prompt or its personalization variables.
    *   **Q&A Agent (`app/api/agents/qanda/route.ts`):** Uses a hardcoded `SYSTEM_INSTRUCTIONS` string. It manually checks for Xero connection to enable tools but doesn't inject the rich Xero context (Chart of Accounts, etc.) into the prompt itself.
    *   **Doc Management (`lib/agents/docmanagement.ts`):** Uses a hardcoded `SYSTEM_INSTRUCTIONS` string.

## 2. Problems / Risks

*   **Inconsistency:** The "personality" and context awareness of Ledgerbot vary significantly depending on whether the user is in the main chat or interacting with a specific agent. Deep Research and Agents lack the rich context (e.g., Chart of Accounts, Company Name) available in the main chat.
*   **Duplication & Coupling:** The logic for fetching user/Xero data and substituting it into the template is tightly coupled with the User Settings API (`getUserSettings`). This makes it difficult to reuse this logic for other agents or background tasks.
*   **Maintenance Overhead:** Adding a new template variable requires modifying `app/(settings)/api/user/data.ts`.
*   **Testing Difficulty:** Testing the prompt construction requires mocking the entire User Settings and Database layer, rather than just testing a pure function that takes a context object and a template.
*   **Hardcoded Prompts:** Agents use hardcoded strings, making them harder to iterate on or personalize without code changes.

## 3. Target Architecture

We propose a centralized **Prompt Engineering Service** that decouples data fetching, template management, and rendering.

### High-Level Components

1.  **`PromptContextBuilder` (Data Layer):**
    *   Responsible for fetching and aggregating all necessary context data (User, Settings, Xero Connection, Chart of Accounts, Timezone).
    *   Returns a standardized `LedgerbotContext` object.
    *   Can be cached or scoped per request.

2.  **`PromptTemplateService` (Logic Layer):**
    *   Central registry for all system prompts (Main Chat, Deep Research, Q&A, etc.).
    *   Loads templates from markdown files (or potentially a CMS/DB in the future).
    *   Exposes a `render(templateId, context)` function.
    *   Handles strict variable substitution and sanitization of user inputs (e.g., `CUSTOM_SYSTEM_INSTRUCTIONS`).

3.  **`AgentFactory` (Consumer Layer):**
    *   Agents (Q&A, DocMan, Deep Research) request their specific system prompt from the `PromptTemplateService`, passing the `LedgerbotContext`.
    *   This ensures all agents have access to the same rich context (e.g., "You are helping {{COMPANY_NAME}}...") if they choose to use it.

### Proposed Workflow

1.  **Request Start:** `app/api/...` route receives a request.
2.  **Context Build:** Call `await contextBuilder.build(userId)`. This fetches User, DB, and Xero data once.
3.  **Prompt Render:**
    *   **Main Chat:** `promptService.render('main-system', context)`
    *   **Deep Research:** `promptService.render('deep-research-planner', context)`
4.  **Execution:** The rendered string is passed to the Vercel AI SDK `streamText` or `generateText`.

### Benefits

*   **Unified Context:** All parts of the system "know" the user and company details equally well.
*   **Testability:** `PromptTemplateService` can be unit tested with mock `LedgerbotContext` objects.
*   **Maintainability:** Templates are isolated in markdown files; logic is isolated in the service.
*   **Security:** Centralized sanitization of user-provided instructions prevents prompt injection risks.
