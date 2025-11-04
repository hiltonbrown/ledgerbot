# Deep Research Workflow

This document describes the Deep Research experience that augments the LedgerBot chat surface.

## Frontend integration

- **Toggle control** – The primary chat input (`components/multimodal-input.tsx`) now exposes a `Deep Research` switch next to the existing reasoning control. The toggle is disabled while a response is streaming to avoid interrupting in-flight research.
- **State management** – `components/chat.tsx` tracks the toggle state and forwards it through both chat and artifact inputs. A ref keeps the latest value so the request payload always reflects the UI.
- **Context summary** – The context dropdown (`components/elements/context.tsx`) shows real-time reasoning and deep research status, helping users confirm what will be sent with the next prompt.
- **Message badge** – `components/deep-research-status.tsx` surfaces the current workflow state (confidence, plan steps, source count, and follow-up lineage) above assistant responses whenever deep research metadata is present, ensuring users have a persistent visual summary even after reloads.

## Backend orchestration

- **Request contract** – `/api/chat` accepts an optional `deepResearch` boolean (see `app/(chat)/api/chat/schema.ts`). When true, the handler diverts to a Mastra-backed workflow rather than the standard streaming LLM session.
- **Mastra workflow** – `lib/mastra/deep-research.ts` implements planning, Tavily-powered search, source evaluation, summary synthesis, and report generation. Key helpers:
  - `runMastraDeepResearchSummary` – Builds a plan, executes searches, evaluates sources, and returns a citation-rich briefing that pauses for user approval.
  - `runMastraDeepResearchReport` – Generates the full markdown report once approval is received.
  - Utility guards such as `isLikelyDetailedQuestion`, `detectApprovalCommand`, and `detectDeeperRequest` drive conversational branching.
- **Streaming** – `respondWithManualStream` (inside `app/(chat)/api/chat/route.ts`) crafts manual UI message streams for summary prompts, clarification requests, and report delivery. Attachments persist the research session metadata for follow-up queries.
- **Conversation flow** – The backend distinguishes three states:
  1. **Needs detail** – If the user’s prompt lacks depth, the assistant asks for a richer research question.
  2. **Awaiting approval** – After completing automated research the summary is stored and the assistant pauses.
  3. **Report delivery / deeper dive** – User responses either trigger a full report or launch a focused follow-up investigation.
- **Session attachments** – Workflow prompts, errors, summaries, and reports attach structured records (`deep-research-session`, `deep-research-summary`, `deep-research-report`) so the UI and API can reconstruct status, plan, and sourcing after persistence.

## Environment configuration

The search workflow integrates Tavily. Provide an API key to enable live web lookups:

```bash
# .env.local
TAVILY_API_KEY=your_key
# optional: override endpoint
# TAVILY_API_URL=https://api.tavily.com/search
```

When a key is missing the assistant still runs but marks results as low confidence and encourages configuration.

## Auditing and follow-up

Each research response stores structured attachments (session metadata, plan, sources, and history). Subsequent messages reuse that context to deepen analysis or produce the final report, ensuring an auditable trail for finance and compliance teams.

## Extensibility tips

- Swap the planning or synthesis model by adjusting the defaults in `lib/mastra/deep-research.ts`.
- Extend `performSearch` to integrate internal knowledge bases or regulatory feeds alongside Tavily.
- The stored attachments can drive dashboards or history views if you need cross-chat reporting of research sessions.
