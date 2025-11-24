# Personalisation Settings Audit

This document audits the current state of system prompt-related settings and outlines a plan to consolidate them into `/settings/personalisation`.

## Findings

### 1. Duplicate Personalisation Pages
There are two "personalisation" pages in the codebase:
- **`app/(settings)/personalisation/page.tsx`**:
  - Maps to URL: `/personalisation` (likely unused or legacy).
  - Uses `UserPreferencesForm`.
  - **Status**: I recently added new fields here, but this page might not be accessible from the main UI.
- **`app/(settings)/settings/personalisation/page.tsx`**:
  - Maps to URL: `/settings/personalisation` (linked from `/settings`).
  - Uses modular components: `TemplateVariableForm`, `CustomInstructionsForm`, `AIPreferencesForm`.
  - **Status**: This appears to be the *active* page intended for the new design.

### 2. Data Source (`app/(settings)/api/user/data.ts`)
- Defines `UserSettings` type.
- Contains legacy fields: `systemPrompt`, `codePrompt`, `sheetPrompt`.
- Contains new fields: `companyName`, `industryContext`, `customSystemInstructions`, etc.
- **Action**: Needs cleanup of legacy fields (already marked with TODOs).

### 3. Agent Settings (`app/(settings)/settings/agents/page.tsx`)
- Contains extensive configuration for specific agents (AP, AR, Reconciliation).
- Uses `localStorage` for persistence (not backend `userSettings`).
- **Action**: These should eventually be moved to the backend if they are to influence the server-side system prompt or agent behavior reliably.

## Consolidation Plan

The goal is to make `/settings/personalisation` (the active one) the single source of truth for the global system prompt variables.

### 1. Adopt `/settings/personalisation` (Active)
We should focus on `app/(settings)/settings/personalisation/page.tsx` and its components.

- **`TemplateVariableForm`**: Should handle `companyName`, `industryContext`, `chartOfAccounts`.
- **`CustomInstructionsForm`**: Should handle `customSystemInstructions`.
- **`AIPreferencesForm`**: Should handle `toneAndGrammar`, `defaultModel`.

### 2. Deprecate `/personalisation` (Legacy)
- The file `app/(settings)/personalisation/page.tsx` should be removed or redirected to `/settings/personalisation`.
- The `UserPreferencesForm` component might be obsolete if its functionality is covered by the modular forms.

### 3. Migration Steps
1.  **Verify Components**: Check `TemplateVariableForm` and `CustomInstructionsForm` to ensure they bind to the correct `userSettings` fields.
2.  **Port Changes**: If I added logic to `UserPreferencesForm` that isn't in the modular components, port it over.
3.  **Remove Legacy Page**: Delete `app/(settings)/personalisation/page.tsx`.
4.  **Backend Cleanup**: Proceed with the `system-prompt-cleanup-plan.md` to remove legacy fields from `data.ts` and `schema.ts`.

## Next Actions
- Inspect `components/settings/template-variable-form.tsx` and `components/settings/custom-instructions-form.tsx`.
- Confirm they save to the correct API endpoints.
- Switch focus to the active settings page.
