# Mastra Security Vulnerability Assessment

**Date:** 2025-11-22
**Scope:** Security analysis of Mastra AI agent framework usage in Ledgerbot.

## 1. Data Handling & Exposure Risks

### 1.1. Sensitive Data in Logs
- **Risk:** High
- **Location:** `lib/agents/ap/tools.ts`, `lib/agents/ar/workflow.ts`, `lib/ai/xero-mcp-client.ts`
- **Finding:** Extensive logging of tool inputs and outputs, including potentially sensitive financial data (invoice amounts, supplier names, contact details).
  - `lib/agents/ap/tools.ts`: Logs supplier names, amounts, and validation results.
  - `lib/agents/ar/workflow.ts`: Logs invoice details, though some redaction (`redactLog`) is used in triage.
  - `lib/ai/xero-mcp-client.ts`: Logs Xero API query parameters and response counts.
- **Impact:** Exposure of confidential business data in server logs (Vercel logs, etc.).
- **Recommendation:** Implement strict PII/financial data redaction in all production logs. Ensure `redactLog` is consistently applied to all sensitive inputs.

### 1.2. Unsanitized File Processing
- **Risk:** Medium
- **Location:** `lib/agents/ap/tools.ts` (`extractInvoiceData`)
- **Finding:** The `extractInvoiceData` function fetches files from URLs provided in the input.
  - **Mitigation Present:** It checks against a `TRUSTED_FILE_HOSTNAMES` allowlist (`cdn.example.com`, `storage.googleapis.com`).
  - **Vulnerability:** If the allowlist is not strictly managed or if `cdn.example.com` is a placeholder, it could allow SSRF (Server-Side Request Forgery) or processing of malicious files.
- **Impact:** Potential for SSRF attacks or processing of malicious payloads if the allowlist is misconfigured.
- **Recommendation:** Verify `TRUSTED_FILE_HOSTNAMES` contains only the actual production storage domains (e.g., Vercel Blob). Implement strict content-type validation beyond just the header (magic number checks).

### 1.3. Xero Token Handling
- **Risk:** Critical
- **Location:** `lib/ai/xero-mcp-client.ts`
- **Finding:** Xero tokens are decrypted and used in memory.
  - **Mitigation Present:** Tokens are encrypted at rest (`encryptToken`).
  - **Vulnerability:** The `persistTokenSet` function logs token expiry and update status. While it doesn't log the full token, any logging around auth tokens requires extreme caution.
  - **Concurrency:** The optimistic locking mechanism (`expectedUpdatedAt`) handles concurrent updates, but race conditions could still potentially leave a process with an invalid token if not handled perfectly.
- **Impact:** Token leakage or corruption could lead to unauthorized access to user financial data.
- **Recommendation:** Ensure no part of the access/refresh token is ever logged. Review the optimistic locking logic to ensure it fails safe (denies access) rather than using potentially stale tokens.

## 2. Authentication & Authorization

### 2.1. Agent Execution Authorization
- **Risk:** High
- **Location:** `app/api/agents/ap/route.ts`
- **Finding:** The route checks `getAuthUser()` to ensure the user is authenticated.
  - **Vulnerability:** It creates a `createAPAgentWithXero(user.id)` instance. If `user.id` is tampered with or if the session handling is flawed, a user could potentially instantiate an agent for another user's Xero connection.
  - **Mitigation:** `getAuthUser()` relies on Clerk, which is robust. However, the internal passing of `userId` to `createAPAgentWithXero` must be strictly tied to the authenticated session.
- **Impact:** Cross-tenant data access if `userId` is not strictly validated against the session.
- **Recommendation:** Ensure `userId` is never derived from client input (e.g., request body) and always comes directly from the trusted session object.

### 2.2. Tool Execution Context
- **Risk:** Medium
- **Location:** `lib/mastra/index.ts`, `lib/agents/*`
- **Finding:** Agents are instantiated with specific tools.
  - **Vulnerability:** If an agent is instantiated globally or cached incorrectly (e.g., in a serverless warm container) with a specific user's context, subsequent requests might reuse that agent instance.
  - **Mitigation:** The code seems to create new agent instances per request in `app/api/agents/ap/route.ts`.
- **Impact:** Data leakage between users if agent instances are shared/cached.
- **Recommendation:** Verify that `createAPAgentWithXero` and similar factories *always* return a fresh instance and that no state is shared globally or via module-level variables.

## 3. Code Execution & Injection Risks

### 3.1. Prompt Injection
- **Risk:** High
- **Location:** All Agent System Prompts (`lib/agents/*/agent.ts`)
- **Finding:** Agents take user input and process it with LLMs.
  - **Vulnerability:** "Jailbreak" or prompt injection attacks could trick the agent into revealing system instructions, executing tools inappropriately (e.g., `xero_create_payment` with malicious data), or bypassing safety filters.
  - **Specific Concern:** The `AP Agent` has tools like `generatePaymentProposal` and `xero_create_bill`. Malicious input could manipulate the agent to draft fraudulent bills.
- **Impact:** Financial fraud, data exfiltration, or reputational damage.
- **Recommendation:** Implement strict input validation (Zod schemas help here). Use "system" role for instructions and ensure user input is always treated as untrusted data. Consider an intermediate "guardrail" model layer.

### 3.2. SSRF in Deep Research
- **Risk:** Medium
- **Location:** `lib/mastra/deep-research.ts`
- **Finding:** The `performSearch` function calls `TAVILY_SEARCH_URL`.
  - **Vulnerability:** While it uses a fixed URL, if the `TAVILY_API_URL` environment variable can be manipulated, it could be redirected. More importantly, the *results* from the search (URLs) are processed. If the system were to fetch those URLs (which `extractInvoiceData` does, but Deep Research currently just uses the snippet), it would be an SSRF vector.
- **Impact:** Internal network scanning if the search tool or subsequent processing fetches arbitrary URLs.
- **Recommendation:** Ensure `TAVILY_API_URL` is hardcoded or strictly validated. If Deep Research is extended to fetch page content (scraping), apply the same strict allowlist/blocklist as `extractInvoiceData`.

## 4. Dependency Chain

### 4.1. Mastra Framework
- **Risk:** Low to Medium
- **Finding:** The project uses `@mastra/core` (^0.23.3).
- **Vulnerability:** As a relatively new framework, it may have undiscovered vulnerabilities or rapid breaking changes.
- **Impact:** Stability and security of the agent orchestration layer.
- **Recommendation:** Monitor Mastra releases closely for security patches. Keep the dependency updated.

## 5. Summary of Recommendations

1.  **Log Sanitization:** Immediately review and sanitize all logs in `lib/agents/` and `lib/ai/xero-mcp-client.ts` to remove PII and financial data.
2.  **Strict URL Validation:** Hardcode or strictly validate allowed domains for file fetching in `extractInvoiceData`.
3.  **Session Integrity:** Verify that `userId` used for Xero connection lookup *always* comes from the authenticated session, never from client input.
4.  **Instance Isolation:** Confirm that agent instances created in API routes are garbage collected and never reused across requests to prevent context bleeding.
5.  **Prompt Hardening:** Review system prompts for injection resilience, especially for agents with write-access tools (AP, AR).