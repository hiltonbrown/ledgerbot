# Agents Workspace

LedgerBot exposes a family of specialised bookkeeping agents under `/agents`. Each agent page is a client component that currently renders mock telemetry and control toggles to illustrate the target UX. This guide describes the routing, shared UI primitives, and the behaviour of each workspace so future integrations can wire in live data.

## Routing & Layout
- `app/agents/layout.tsx` is a server component that wraps the consoles with `SidebarProvider`, loads the authenticated user via `getAuthUser()`, and respects the persisted sidebar state stored in the `sidebar_state` cookie.
- Pages opt into `dynamic = "force-dynamic"` and `experimental_ppr` to keep the console responsive to upstream changes.
- `components/agents/agents-header.tsx` drives the breadcrumb, contextual titles, and pill navigation for every agent view. Update the `agentLinks` array to add or remove workspaces.

## Shared UI Building Blocks
- `AgentSummaryCard` (`components/agents/agent-summary-card.tsx`) renders the snapshot tiles on the overview page. Cards accept optional status, badge, metrics, and footer content and always link to the agent workspace.
- `components/ui/chart.tsx` supplies a thin adapter around Recharts to standardise legends and tooltips across analytics and forecasting views.
- The consoles reuse design-system primitives from `/components/ui` (cards, buttons, switches, scroll areas, etc.), keeping the styling consistent with the chat workspace.

## Agent Consoles

### Overview (`app/agents/page.tsx`)
- Surfaces automation coverage metrics, human-review queues, and a grid of `AgentSummaryCard`s that deep-link into each agent.
- Includes a change-management card that highlights release trains, risk register entries, and recommended actions seeded from static copy.

### Document Processing (`app/agents/docmanagement/page.tsx`)
- Provides an upload dropzone, rolling intake metrics, and average confidence calculations computed from the in-file `validationQueue`.
- Offers guardrail toggles for auto-validation, duplicate detection, and Slack digests, plus a scrollable validation queue with confidence progress bars.
- Displays extraction KPIs, recent document issues, and human-review telemetry; all datasets are currently hard-coded arrays.

### Reconciliations (`app/agents/reconciliations/page.tsx`)
- Aggregates batch statistics (`reconciliationBatches`) to compute match and auto-approval rates with `useMemo`.
- Lets operators toggle auto-approval and auto-adjustments, and shows an exception queue with severity indicators and suggested actions.
- Encourages cross-agent hand-offs (for example, compliance escalations) via contextual tips.

### Compliance (`app/agents/compliance/page.tsx`)
- Tracks ATO-aligned deadlines, audit checklists, and knowledge-base freshness indicators.
- Guardrails cover disclaimers, escalation rules, and jurisdiction overrides; state lives in local `useState` hooks.
- Uses scrollable lists for deadlines and checklist completion alongside static legal copy surfaced in cards.

### Analytics (`app/agents/analytics/page.tsx`)
- Leverages `ChartContainer`, `ChartLegend`, and `ChartTooltip` around Recharts `AreaChart` and `BarChart` components to render revenue trends and expense breakdowns.
- Highlights KPIs, generates narrative prompt buttons, and logs distribution activity via static arrays (`revenueData`, `expenseBreakdown`, `kpiHighlights`).
- Export and prompt buttons are placeholders awaiting API wiring.

### Forecasting (`app/agents/forecasting/page.tsx`)
- Visualises base, upside, and downside scenarios with configurable confidence bands powered by Recharts.
- Stores scenario toggles, assumption inputs, and run summaries in component state; helper copy references LangGraph orchestration even though the data is mocked (`forecastSeries`).
- Risk alerts and assumption editors are rendered as cards with `Switch` and `Input` controls.

### Advisory Q&A (`app/agents/qanda/page.tsx`)
- Mimics a chat transcript using `conversationHistory`, including confidence scores, feedback buttons, and stream toggles.
- Suggested prompts and knowledge-base coverage live in static arrays, ready to be replaced by the real suggestion service.
- Feedback capture toggles are wired via `useState` but do not yet persist.

### Workflow Supervisor (`app/agents/workflow/page.tsx`)
- Centralises multi-agent orchestration with a live run table (`workflowRuns`), execution metrics, and retry or observer toggles.
- Provides a form scaffold for creating new workflows and a scrollable template library (`orchestrationLibrary`).
- Elevates human-approval requirements via an alert block designed to surface escalations from dependent agents.

## Settings Integration
- `/app/(settings)/settings/agents/page.tsx` reuses the same agent taxonomy to manage configuration. `AgentConfigCard` components wrap collapsible panels with enable switches, reset buttons, and detailed form controls for each agent.
- Settings state is currently local to the page; persistence hooks should be added when API endpoints are available.
- The settings overview links back into `/agents` so product teams can jump between configuration and operations quickly.

## Data & Integration Notes
- Every console seeds mock data with in-file arrays; no API calls or database reads occur yet. Replace these structures with SWR or server actions when integrating with backend services.
- Copy throughout the agents references LangGraph orchestration and cross-agent workflows but there is no LangGraph implementation in the repo today; plan for adapters in `lib/ai/` when real workflows land.
- When adding live context, reuse the existing `lib/ai` provider or model abstractions and `lib/db` query helpers for context file ingestion to keep agent responses aligned with the chat experience.

## Next Steps
- Wire document, reconciliation, and compliance metrics to real queries once the respective API routes are available.
- Align analytics and forecasting charts with actual data sources (for example, Postgres views or external APIs) and handle loading states and error surfaces.
- Persist agent settings and surface telemetry (success and failure counts, escalations) via shared types so the overview dashboard reflects production health in real time.
