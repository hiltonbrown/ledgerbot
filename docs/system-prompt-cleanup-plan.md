# System Prompt Cleanup Plan

This document outlines the plan to remove legacy system prompt code following the migration to the new template-based architecture (`buildLedgerbotSystemPrompt`).

## Identified Legacy Code

The following files and symbols have been identified as legacy and marked with `// TODO(legacy-system-prompt-cleanup)`:

### 1. `lib/ai/prompts.ts`
- **Symbol**: `systemPrompt` function.
- **Status**: Deprecated.
- **Action**: Remove this function once all consumers are migrated to `buildLedgerbotSystemPrompt`.
- **Notes**: This function was the previous entry point for constructing the system prompt.

### 2. `app/(settings)/api/user/data.ts`
- **Symbol**: `UserSettings.prompts.systemPrompt` field.
- **Symbol**: `loadDefaultSystemPrompt` usage in default settings.
- **Symbol**: `substituteTemplateVariables` logic for `systemPrompt`.
- **Status**: Legacy data path.
- **Action**: Remove the `systemPrompt` field from the `UserSettings` type and the associated loading/substitution logic.
- **Notes**: The new architecture derives the system prompt dynamically from personalisation settings, not a stored full prompt string.

### 3. `components/settings/user-preferences-form.tsx`
- **Symbol**: `systemPrompt` field in `handleSubmit`.
- **Status**: Legacy form submission.
- **Action**: Remove `systemPrompt` from the payload sent to `/api/user`.
- **Notes**: The UI for editing the raw system prompt has already been replaced by granular personalisation fields.

### 4. `lib/db/schema.ts`
- **Symbol**: `systemPrompt` column in `userSettings` table.
- **Status**: Legacy database column.
- **Action**: Create a migration to drop this column (or keep it as nullable/unused if immediate schema changes are risky).
- **Notes**: This column stores the raw user-editable system prompt string, which is no longer used.

## Cleanup Strategy

1.  **Verify Migration**: Ensure `app/api/chat/route.ts` and any other chat endpoints are fully using `buildLedgerbotSystemPrompt`.
2.  **Remove Code**:
    - Delete `systemPrompt` function from `lib/ai/prompts.ts`.
    - Remove `systemPrompt` field from `UserSettings` type and `data.ts` logic.
    - Remove `systemPrompt` from `user-preferences-form.tsx` submission.
3.  **Database Cleanup**:
    - Generate a migration to drop the `systemPrompt` column from `user_settings` table.
4.  **Final Verification**: Run tests to ensure no regressions.

## Timeline

This cleanup can be performed immediately after the new system prompt architecture is verified in production.
