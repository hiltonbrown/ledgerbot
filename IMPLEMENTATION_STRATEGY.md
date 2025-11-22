# Vercel AI SDK Core Implementation Strategy

**Date:** 2025-11-22
**Scope:** Comprehensive strategy for replacing Mastra with Vercel AI SDK Core in Ledgerbot.

## 1. Tool & Function Calling Strategy

### 1.1. Tool Definition Pattern
We will adopt the Vercel AI SDK `tool()` helper pattern to define all agent capabilities.
- **Structure:** Each tool will be a standalone exportable object containing:
  - `description`: Clear, natural language description for the LLM.
  - `parameters`: A Zod schema defining strict input types.
  - `execute`: An async function receiving the typed arguments.
- **Context Injection:** Unlike Mastra's context object, Vercel AI SDK tools receive arguments directly. To handle request-scoped context (like `userId`), we will use a **Factory Pattern**.
  - **Factory Functions:** Instead of exporting static tool objects, we will export functions like `createXeroTools(userId: string)` that return the tool definitions with the context closed over in the scope. This ensures strict data isolation per request.

### 1.2. Type Safety & Validation
- **Input Validation:** Zod schemas will enforce strict typing on all tool inputs. The SDK automatically validates LLM outputs against these schemas before execution.
- **Output Typing:** While the SDK handles inputs, we will enforce return types on the `execute` functions to ensure consistent downstream processing (e.g., always returning a standard `Result<T>` object).

### 1.3. Error Handling
- **Try/Catch Wrappers:** All tool execution logic will be wrapped in robust try/catch blocks.
- **User-Friendly Errors:** Instead of throwing raw exceptions, tools will return a structured error object or a natural language string describing the failure (e.g., "Failed to fetch invoice: Invoice ID not found") so the LLM can gracefully inform the user.

## 2. Streaming Response Strategy

### 2.1. `streamText` Implementation
We will standardize on the `streamText` function for all chat interactions.
- **Unified Stream:** This function handles text generation, tool calls, and tool results in a single stream.
- **Protocol:** We will use the `toDataStreamResponse()` method to format the output, which is natively compatible with the client-side `useChat` hook.

### 2.2. Multi-Step Execution
- **`maxSteps` Configuration:** To replicate Mastra's workflow capabilities, we will configure `maxSteps` (e.g., 5 or 10) in `streamText`. This allows the model to call a tool, receive the result, and then decide to call another tool or generate a final response in a recursive loop.
- **Round-Trip Logic:** The SDK automatically handles the "call -> execute -> feed result back" loop, simplifying the orchestration logic previously handled by Mastra.

### 2.3. Progress & Artifacts
- **Tool Call Events:** The client will listen for `tool-call` events to display "Processing..." or specific status messages (e.g., "Searching Xero...").
- **Data Stream:** We will use the experimental `StreamData` primitive to send auxiliary data (artifacts like generated reports or JSON objects) alongside the text stream, ensuring structured data reaches the client without polluting the chat text.

## 3. Agent Definition & Configuration

### 3.1. Agent Primitives
Instead of a heavy `Agent` class, "Agents" will be defined as **Configuration Objects** or **Route Handlers**.
- **Definition:** An agent is simply a combination of:
  - **System Prompt:** A template string (e.g., `prompts/ap-agent.ts`).
  - **Tool Set:** A collection of tool factories (e.g., `tools/ap-tools.ts`).
  - **Model Config:** Default model ID and parameters (temperature, etc.).

### 3.2. Dynamic Configuration
- **Runtime Composition:** In the API route (`app/api/chat/route.ts`), we will dynamically compose the agent based on the request.
  - **Model Swapping:** The `model` parameter in `streamText` will be selected based on user preference or plan tier.
  - **Prompt Hydration:** System prompts will be hydrated with user-specific context (name, company, location) at runtime before being passed to the SDK.

## 4. State Management & Context

### 4.1. Stateless Execution
We will move to a fully stateless execution model for agents.
- **Request-Scoped:** Each API request contains the full conversation history (or a summarized version). The agent does not hold memory between requests; it relies entirely on the `messages` array passed to `streamText`.

### 4.2. Conversation Persistence
- **Database as Source of Truth:** The Neon database (Postgres) will remain the persistent store.
- **Loading History:** On each request, we fetch the relevant chat history from the database, convert it to the Vercel AI SDK `CoreMessage` format, and pass it to the model.
- **Saving History:** We will use the `onFinish` callback of `streamText` to asynchronously persist the new user message and the full assistant response (including tool calls) back to the database.

## 5. Integration Strategy

### 5.1. Redis Integration
- **Caching:** We will use Redis to cache expensive, non-personalized tool results (e.g., regulatory search queries) using a deterministic key generation strategy.
- **Rate Limiting:** Redis will continue to track API usage quotas (e.g., Xero API limits) to prevent 429s, shared across all agent instances.

### 5.2. Neon Database Integration
- **Logging:** Structured logs of tool executions (inputs, outputs, latency) will be written to a dedicated `AgentLogs` table for auditing and debugging.
- **Artifact Storage:** Large generated artifacts (PDFs, CSVs) will be stored in Vercel Blob, with metadata and references stored in Neon.

## 6. Security Improvements

### 6.1. Input Sanitization & Validation
- **Strict Schemas:** Zod schemas for tools will be reviewed to ensure no "any" types or loose string inputs where enums or specific formats (e.g., UUIDs, dates) are expected.
- **URL Allowlisting:** The file processing tool will enforce a strict allowlist of domains (e.g., only the project's own Vercel Blob domain) to prevent SSRF.

### 6.2. Data Isolation
- **Factory Pattern Enforcement:** By strictly using the factory pattern (`createTools(userId)`), we guarantee that a tool instance *cannot* access another user's data, as the `userId` is closed over at creation time and cannot be changed.

### 6.3. Output Redaction
- **Log Scrubbing:** A centralized logging utility will be implemented to automatically detect and redact patterns resembling PII (emails, phone numbers) and financial data (credit card numbers, bank details) before writing to system logs.

## 7. Migration Plan Summary

1.  **Refactor Tools:** Convert all Mastra tools to Vercel AI SDK `tool()` definitions using the factory pattern.
2.  **Refactor Prompts:** Extract system prompts into standalone template modules.
3.  **Create Route Handlers:** Implement standard Next.js API routes using `streamText` to replace the Mastra agent endpoints.
4.  **Update Client:** Ensure the frontend `useChat` hook is configured to handle the standard Vercel AI SDK data stream format.
5.  **Testing:** Verify all workflows (AP, AR, etc.) function identically to the previous implementation.