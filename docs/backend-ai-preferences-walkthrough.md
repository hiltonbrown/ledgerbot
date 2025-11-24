# Backend AI Preferences Implementation

**Date:** 2025-11-24  
**Objective:** Apply default chat model and reasoning preferences from user settings when creating new chats in the backend API.

---

## Changes Made

### 1. Updated Request Schema

**File:** [app/(chat)/api/chat/schema.ts](file:///home/hilton/Documents/ledgerbot/app/(chat)/api/chat/schema.ts)

Made `selectedChatModel` optional to allow the backend to apply user preferences as a fallback:

```diff
 export const postRequestBodySchema = z.object({
   id: z.string().uuid(),
   message: z.object({
     id: z.string().uuid(),
     role: z.enum(["user"]),
     parts: z.array(partSchema),
   }),
-  selectedChatModel: z.enum([...chatModelIds] as [string, ...string[]]),
+  selectedChatModel: z.enum([...chatModelIds] as [string, ...string[]]).optional(),
   selectedVisibilityType: z
     .enum(["public", "private"])
     .transform(() => "private" as const),
   streamReasoning: z.boolean().optional(),
   showReasoningPreference: z.boolean().optional(),
   deepResearch: z.boolean().optional(),
 });
```

---

### 2. Added Required Imports

**File:** [app/(chat)/api/chat/route.ts](file:///home/hilton/Documents/ledgerbot/app/(chat)/api/chat/route.ts#L24-L29)

Added imports for `DEFAULT_CHAT_MODEL` and `chatModelIds` to enable validation:

```diff
-import { type ChatModel, isReasoningModelId } from "@/lib/ai/models";
+import {
+  chatModelIds,
+  DEFAULT_CHAT_MODEL,
+  type ChatModel,
+  isReasoningModelId,
+} from "@/lib/ai/models";
```

---

### 3. Implemented Fallback Logic

**File:** [app/(chat)/api/chat/route.ts](file:///home/hilton/Documents/ledgerbot/app/(chat)/api/chat/route.ts#L268-L311)

Updated the request body destructuring and added fallback logic:

```diff
 const {
   id,
   message,
-  selectedChatModel,
+  selectedChatModel: requestedChatModel,
   selectedVisibilityType,
-  streamReasoning,
+  streamReasoning: requestedStreamReasoning,
   deepResearch,
 }: {
   id: string;
   message: ChatMessage;
-  selectedChatModel: ChatModel["id"];
+  selectedChatModel?: ChatModel["id"];
   selectedVisibilityType: VisibilityType;
   streamReasoning?: boolean;
   deepResearch?: boolean;
 } = requestBody;

 const sanitizedVisibility = sanitizeVisibility(selectedVisibilityType);

 const user = await getAuthUser();

 if (!user) {
   return new ChatSDKError("unauthorized:chat").toResponse();
 }

 // Fetch user settings for custom system prompt with template substitution
 const userSettings = await getUserSettings();

+// Extract AI preferences with fallbacks to system defaults
+const defaultModelId =
+  userSettings.personalisation.defaultModel || DEFAULT_CHAT_MODEL;
+const defaultReasoning =
+  userSettings.personalisation.defaultReasoning ?? false;
+
+// Apply user preferences as fallbacks when not explicitly provided
+let selectedChatModel = requestedChatModel || defaultModelId;
+const streamReasoning = requestedStreamReasoning ?? defaultReasoning;
+
+// Validate that the final model is valid, fall back to system default if not
+if (!chatModelIds.includes(selectedChatModel)) {
+  console.error(
+    `[chat/route] Invalid model ID: ${selectedChatModel}, falling back to ${DEFAULT_CHAT_MODEL}`
+  );
+  selectedChatModel = DEFAULT_CHAT_MODEL;
+}
```

**Key Implementation Details:**

1. **Renamed destructured variables** to `requestedChatModel` and `requestedStreamReasoning` to distinguish from final values
2. **Extracted user preferences** from `userSettings.personalisation`:
   - `defaultModel` → falls back to `DEFAULT_CHAT_MODEL` if not set
   - `defaultReasoning` → falls back to `false` if not set
3. **Applied fallback logic**:
   - `selectedChatModel = requestedChatModel || defaultModelId`
   - `streamReasoning = requestedStreamReasoning ?? defaultReasoning`
4. **Added validation** to ensure the final model ID is valid
5. **Used nullish coalescing (`??`)** for boolean reasoning to handle `false` correctly

---

## How It Works

### Scenario 1: Frontend Sends Explicit Model/Reasoning

**Request:**
```json
{
  "selectedChatModel": "openai-gpt-5-chat",
  "streamReasoning": true
}
```

**Backend Behavior:**
- Uses `openai-gpt-5-chat` (explicit choice)
- Uses `true` for reasoning (explicit choice)
- ✅ User's explicit choices are respected

---

### Scenario 2: Frontend Omits Model/Reasoning

**Request:**
```json
{
  "selectedChatModel": null,
  "streamReasoning": undefined
}
```

**User Settings:**
```typescript
{
  personalisation: {
    defaultModel: "anthropic-claude-sonnet-4-5",
    defaultReasoning: false
  }
}
```

**Backend Behavior:**
- Uses `anthropic-claude-sonnet-4-5` (from user settings)
- Uses `false` for reasoning (from user settings)
- ✅ User's default preferences are applied

---

### Scenario 3: Invalid Model ID

**Request:**
```json
{
  "selectedChatModel": "invalid-model-xyz"
}
```

**Backend Behavior:**
- Logs error: `Invalid model ID: invalid-model-xyz, falling back to anthropic-claude-haiku-4-5`
- Uses `anthropic-claude-haiku-4-5` (system default)
- ✅ Graceful fallback prevents errors

---

## Verification

### TypeScript Compilation

Ran `pnpm tsc --noEmit`:

**Result:** ✅ Compilation successful
- No type errors related to the changes
- Pre-existing test file errors are unrelated to this implementation

---

### Code Quality

**Lint Status:**
- ✅ All new code passes linting
- ⚠️ One pre-existing lint warning about namespace imports (line 56, unrelated to changes)

---

## Testing Recommendations

### Manual Test 1: Default Preferences Applied

1. Set AI preferences:
   - Default Model: `openai-gpt-5-mini`
   - Default Reasoning: **OFF**

2. Clear browser cookies (remove `chat-model` cookie)

3. Create a new chat and send a message

4. **Expected:** Backend uses `openai-gpt-5-mini` with reasoning disabled

---

### Manual Test 2: Explicit Choice Overrides Default

1. With same preferences as Test 1

2. Create a new chat and explicitly select `anthropic-claude-sonnet-4-5`

3. Send a message

4. **Expected:** Backend uses `anthropic-claude-sonnet-4-5` (explicit choice, not default)

---

### Manual Test 3: Invalid Model Fallback

1. Temporarily modify frontend to send invalid model ID

2. Send a message

3. **Expected:** 
   - Error logged to console
   - Backend falls back to `anthropic-claude-haiku-4-5`
   - Chat works without errors

---

## Summary

**What Changed:**
- ✅ Schema: `selectedChatModel` is now optional
- ✅ API: Extracts user's default model and reasoning preferences
- ✅ API: Applies user preferences when request values are missing
- ✅ API: Validates model IDs and falls back to system default if invalid

**Impact:**
- New chats without explicit model/reasoning choices will use user's saved preferences
- Existing explicit choices continue to work as before
- Invalid model IDs are handled gracefully
- Backward compatible with current frontend implementation

**Next Steps:**
- Manual testing to verify behavior in different scenarios
- Consider updating frontend to optionally omit model/reasoning for new chats (future enhancement)
