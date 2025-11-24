# AI Preferences Audit

**Date:** 2025-11-24  
**Purpose:** Understand why default chat model and reasoning preferences set on `/settings/personalisation` are not being applied to new chats.

---

## Executive Summary

The AI preferences system is **partially working**:
- ✅ Default model preference is correctly applied to new chats
- ❌ Default reasoning preference is **NOT** applied to existing chats when reopened
- ⚠️ New chats receive the default reasoning setting, but it may not be visible due to UI state management

### Root Cause

The issue is in [app/(chat)/chat/[id]/page.tsx](file:///home/hilton/Documents/ledgerbot/app/(chat)/chat/[id]/page.tsx):
- **New chats** ([app/(chat)/page.tsx](file:///home/hilton/Documents/ledgerbot/app/(chat)/page.tsx)) pass `initialDefaultReasoning={defaultReasoning}` to the `<Chat>` component
- **Existing chats** ([app/(chat)/chat/[id]/page.tsx](file:///home/hilton/Documents/ledgerbot/app/(chat)/chat/[id]/page.tsx)) **do NOT** pass the `initialDefaultReasoning` prop at all

This means when users reopen an existing chat, the reasoning toggle defaults to `true` (hardcoded fallback) instead of respecting their saved preference.

---

## 1. Where AI Preferences Are Stored

### Database Schema
AI preferences are stored in the `userSettings` table with the following relevant fields:

```typescript
// From lib/db/schema (inferred from getUserSettings)
{
  defaultModel: string;           // e.g., "anthropic-claude-haiku-4-5"
  defaultReasoning: boolean;      // e.g., false
  // ... other fields
}
```

### Type Definition
Defined in [app/(settings)/api/user/data.ts](file:///home/hilton/Documents/ledgerbot/app/(settings)/api/user/data.ts#L33-L72):

```typescript
export type UserSettings = {
  personalisation: {
    defaultModel: string;
    defaultReasoning: boolean;
    // ... other fields
  };
  // ... other sections
};
```

### Default Values
From [app/(settings)/api/user/data.ts](file:///home/hilton/Documents/ledgerbot/app/(settings)/api/user/data.ts#L88-L89):

```typescript
const USER_SETTINGS: UserSettings = {
  personalisation: {
    defaultModel: "anthropic-claude-haiku-4-5",
    defaultReasoning: false,
    // ...
  },
  // ...
};
```

### Loading Function
[getUserSettings()](file:///home/hilton/Documents/ledgerbot/app/(settings)/api/user/data.ts#L125-L255) merges database values with defaults:

```typescript
export async function getUserSettings(): Promise<UserSettings> {
  const [dbSettings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.id));

  return {
    personalisation: {
      defaultModel: dbSettings?.defaultModel || USER_SETTINGS.personalisation.defaultModel,
      defaultReasoning: dbSettings?.defaultReasoning ?? USER_SETTINGS.personalisation.defaultReasoning,
      // ...
    },
    // ...
  };
}
```

### Saving Function
AI preferences are saved via [app/(settings)/api/user/route.ts](file:///home/hilton/Documents/ledgerbot/app/(settings)/api/user/route.ts) POST endpoint.

The form in [components/settings/ai-preferences-form.tsx](file:///home/hilton/Documents/ledgerbot/components/settings/ai-preferences-form.tsx#L48-L72) sends:

```typescript
await fetch("/api/user", {
  method: "POST",
  body: JSON.stringify({
    // ... all existing settings
    defaultModel: formState.defaultModel,
    defaultReasoning: formState.defaultReasoning,
    toneAndGrammar: formState.toneAndGrammar,
  }),
});
```

---

## 2. How Chat Pages Initialize Model and Reasoning

### New Chats ([app/(chat)/page.tsx](file:///home/hilton/Documents/ledgerbot/app/(chat)/page.tsx))

**Lines 29-32:**
```typescript
const userSettings = await getUserSettings();
const defaultModel = userSettings.personalisation.defaultModel;
const defaultReasoning = userSettings.personalisation.defaultReasoning;
```

**Lines 114-123:**
```typescript
const cookieStore = await cookies();
const modelIdFromCookie = cookieStore.get("chat-model");
const initialModelId = modelIdFromCookie?.value;
const isValidModelId = initialModelId && chatModelIds.includes(initialModelId);

// Use cookie model if valid, otherwise fall back to user's default model, then system default
const selectedModel = isValidModelId
  ? initialModelId
  : defaultModel || DEFAULT_CHAT_MODEL;
```

**Lines 140-151:**
```typescript
<Chat
  autoResume={false}
  firstName={userSettings.personalisation.firstName}
  id={id}
  initialChatModel={selectedModel}
  initialDefaultReasoning={defaultReasoning}  // ✅ PASSED
  initialMessages={[]}
  initialVisibilityType="private"
  isReadonly={false}
  key={id}
  suggestions={suggestions}
/>
```

**✅ Result:** New chats correctly receive both `initialChatModel` and `initialDefaultReasoning` from user settings.

---

### Existing Chats ([app/(chat)/chat/[id]/page.tsx](file:///home/hilton/Documents/ledgerbot/app/(chat)/chat/[id]/page.tsx))

**Lines 30:**
```typescript
const userSettings = await getUserSettings();
```

**Lines 50-55:**
```typescript
const cookieStore = await cookies();
const chatModelFromCookie = cookieStore.get("chat-model");
const initialModelId = chatModelFromCookie?.value;
const isValidModelId = initialModelId && chatModelIds.includes(initialModelId);
```

**Lines 62-73 (when model is invalid):**
```typescript
<Chat
  autoResume={true}
  firstName={userSettings.personalisation.firstName}
  id={chat.id}
  initialChatModel={DEFAULT_CHAT_MODEL}
  initialDocument={latestDocument}
  initialLastContext={chat.lastContext ?? undefined}
  initialMessages={uiMessages}
  initialVisibilityType={chat.visibility}
  isReadonly={user.id !== chat.userId}
  key={chat.id}
  // ❌ initialDefaultReasoning NOT PASSED
/>
```

**Lines 81-92 (when model is valid):**
```typescript
<Chat
  autoResume={true}
  firstName={userSettings.personalisation.firstName}
  id={chat.id}
  initialChatModel={initialModelId}
  initialDocument={latestDocument}
  initialLastContext={chat.lastContext ?? undefined}
  initialMessages={uiMessages}
  initialVisibilityType={chat.visibility}
  isReadonly={user.id !== chat.userId}
  key={chat.id}
  // ❌ initialDefaultReasoning NOT PASSED
/>
```

**❌ Result:** Existing chats do NOT pass `initialDefaultReasoning`, causing the Chat component to fall back to hardcoded defaults.

---

## 3. How the Chat Component Uses These Props

From [components/chat.tsx](file:///home/hilton/Documents/ledgerbot/components/chat.tsx):

### State Initialization (Lines 83-90)
```typescript
const [currentModelId, setCurrentModelId] = useState(initialChatModel);
const [reasoningPreferences, setReasoningPreferences] = useState<
  Record<string, boolean>
>(() =>
  isReasoningModelId(initialChatModel)
    ? { [initialChatModel]: initialDefaultReasoning ?? true }  // Falls back to true
    : {}
);
```

**Key observation:** If `initialDefaultReasoning` is `undefined`, it defaults to `true`.

### Current Reasoning State (Lines 109-117)
```typescript
const currentReasoningEnabled = useMemo(() => {
  if (!isReasoningModelId(currentModelId)) {
    return false;
  }

  const storedPreference = reasoningPreferences[currentModelId];

  return storedPreference ?? initialDefaultReasoning ?? true;  // Falls back to true
}, [currentModelId, reasoningPreferences, initialDefaultReasoning]);
```

### Model Change Handler (Lines 126-142)
```typescript
const handleModelChange = (modelId: string) => {
  setCurrentModelId(modelId);
  setReasoningPreferences((previousPreferences) => {
    if (!isReasoningModelId(modelId)) {
      return previousPreferences;
    }

    if (previousPreferences[modelId] !== undefined) {
      return previousPreferences;
    }

    return {
      ...previousPreferences,
      [modelId]: initialDefaultReasoning ?? true,  // Falls back to true
    };
  });
};
```

**❌ Result:** When `initialDefaultReasoning` is not provided (existing chats), all reasoning preferences default to `true` instead of respecting the user's saved preference.

---

## 4. How the API Receives Model and Reasoning Settings

### Request Schema
From [app/(chat)/api/chat/schema.ts](file:///home/hilton/Documents/ledgerbot/app/(chat)/api/chat/schema.ts#L31-L45):

```typescript
export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({ /* ... */ }),
  selectedChatModel: z.enum([...chatModelIds] as [string, ...string[]]),
  selectedVisibilityType: z.enum(["public", "private"]).transform(() => "private" as const),
  streamReasoning: z.boolean().optional(),
  showReasoningPreference: z.boolean().optional(),
  deepResearch: z.boolean().optional(),
});
```

### How the Client Sends These Values
From [components/chat.tsx](file:///home/hilton/Documents/ledgerbot/components/chat.tsx#L174-L189):

```typescript
transport: new DefaultChatTransport({
  api: "/api/chat",
  fetch: fetchWithErrorHandlers,
  prepareSendMessagesRequest(request) {
    return {
      body: {
        id: request.id,
        message: request.messages.at(-1),
        selectedChatModel: currentModelIdRef.current,
        selectedVisibilityType: visibilityType,
        streamReasoning: true,  // ⚠️ Always true
        showReasoningPreference: getReasoningPreferenceForModel(currentModelIdRef.current),
        deepResearch: deepResearchRef.current,
        ...request.body,
      },
    };
  },
}),
```

**Key observations:**
- `streamReasoning` is **always `true`** (hardcoded)
- `showReasoningPreference` is derived from the client-side state (which may be incorrect if `initialDefaultReasoning` wasn't passed)

### How the API Uses These Values
From [app/(chat)/api/chat/route.ts](file:///home/hilton/Documents/ledgerbot/app/(chat)/api/chat/route.ts#L263-L277):

```typescript
const {
  id,
  message,
  selectedChatModel,
  selectedVisibilityType,
  streamReasoning,
  deepResearch,
}: {
  id: string;
  message: ChatMessage;
  selectedChatModel: ChatModel["id"];
  selectedVisibilityType: VisibilityType;
  streamReasoning?: boolean;
  deepResearch?: boolean;
} = requestBody;
```

The API receives `streamReasoning` but **does not apply any server-side defaults** if it's missing. The API also loads `userSettings` (line 288) but **does not use `userSettings.personalisation.defaultReasoning`** to override missing client values.

**Lines 398-403:**
```typescript
// Always send reasoning parts to the client for all models
// Reasoning models (Claude with <think> tags) will have reasoning extracted by middleware
// Non-reasoning models won't have reasoning parts, but sendReasoning should still be true
const sendReasoning = true;
// Always show reasoning steps when available
const preferenceForDisplay = true;
```

**❌ Result:** The API does not apply user preferences as a fallback. It trusts the client to send the correct values.

---

## 5. Hypotheses on Why Defaults Aren't Applied

### Primary Issue: Missing `initialDefaultReasoning` in Existing Chats

**File:** [app/(chat)/chat/[id]/page.tsx](file:///home/hilton/Documents/ledgerbot/app/(chat)/chat/[id]/page.tsx)

**Problem:**
- The page loads `userSettings` (line 30) but never extracts `defaultReasoning`
- The `<Chat>` component is rendered without the `initialDefaultReasoning` prop (lines 62-73, 81-92)
- This causes the Chat component to fall back to `true` for all reasoning preferences

**Impact:**
- When users reopen an existing chat, their saved reasoning preference is ignored
- The reasoning toggle will always default to "on" regardless of their settings

---

### Secondary Issue: Cookie-Based Model Selection May Override User Preference

**Files:**
- [app/(chat)/page.tsx](file:///home/hilton/Documents/ledgerbot/app/(chat)/page.tsx#L114-L123)
- [app/(chat)/chat/[id]/page.tsx](file:///home/hilton/Documents/ledgerbot/app/(chat)/chat/[id]/page.tsx#L50-L55)

**Behavior:**
```typescript
const selectedModel = isValidModelId
  ? initialModelId  // From cookie
  : defaultModel || DEFAULT_CHAT_MODEL;  // From user settings or system default
```

**Observation:**
- If a `chat-model` cookie exists and is valid, it takes precedence over `userSettings.personalisation.defaultModel`
- This is likely intentional (to remember the last-used model across sessions)
- However, it means the "default model" preference only applies when there's no cookie

**Impact:**
- Users may expect their "default model" setting to always apply to new chats
- But if they've used a different model recently, the cookie will override it
- This is probably acceptable behavior, but should be documented

---

### Tertiary Issue: No Server-Side Fallback in API

**File:** [app/(chat)/api/chat/route.ts](file:///home/hilton/Documents/ledgerbot/app/(chat)/api/chat/route.ts)

**Problem:**
- The API loads `userSettings` (line 288) but never uses `defaultModel` or `defaultReasoning` as fallbacks
- If the client sends invalid or missing values, the API doesn't apply user preferences

**Current behavior:**
- `selectedChatModel` is required in the schema, so it can't be missing
- `streamReasoning` is optional and defaults to `undefined` if not provided
- The API doesn't check if `streamReasoning` is missing and apply `userSettings.personalisation.defaultReasoning`

**Impact:**
- If the client-side logic fails to send the correct reasoning preference, the API won't correct it
- This is a defense-in-depth issue: the client should send the right values, but the API could validate/override them

---

## 6. Recommended Fixes

### Fix 1: Pass `initialDefaultReasoning` to Existing Chats (Critical)

**File:** [app/(chat)/chat/[id]/page.tsx](file:///home/hilton/Documents/ledgerbot/app/(chat)/chat/[id]/page.tsx)

**Change:**
```diff
  const userSettings = await getUserSettings();
+ const defaultReasoning = userSettings.personalisation.defaultReasoning;

  // ... later in the file ...

  <Chat
    autoResume={true}
    firstName={userSettings.personalisation.firstName}
    id={chat.id}
    initialChatModel={initialModelId}
+   initialDefaultReasoning={defaultReasoning}
    initialDocument={latestDocument}
    initialLastContext={chat.lastContext ?? undefined}
    initialMessages={uiMessages}
    initialVisibilityType={chat.visibility}
    isReadonly={user.id !== chat.userId}
    key={chat.id}
  />
```

**Impact:** Existing chats will now respect the user's default reasoning preference.

---

### Fix 2: Consider Applying User Preferences in API (Optional)

**File:** [app/(chat)/api/chat/route.ts](file:///home/hilton/Documents/ledgerbot/app/(chat)/api/chat/route.ts)

**Change:**
```diff
  const userSettings = await getUserSettings();

  const {
    id,
    message,
    selectedChatModel,
    selectedVisibilityType,
    streamReasoning,
    deepResearch,
  } = requestBody;

+ // Apply user's default reasoning preference if not explicitly provided
+ const effectiveStreamReasoning = streamReasoning ?? userSettings.personalisation.defaultReasoning;
```

**Impact:** Provides a server-side safety net if the client fails to send the correct reasoning preference.

---

### Fix 3: Document Cookie Behavior (Optional)

**File:** Documentation or UI tooltip

**Change:** Clarify that:
- The "default model" preference applies to new chats when no recent model has been used
- The app remembers your last-used model via cookies
- To reset to your default model, clear your browser cookies or explicitly select it

**Impact:** Reduces user confusion about when the default model preference applies.

---

## 7. Testing Recommendations

### Manual Test: New Chat with Custom Defaults
1. Go to `/settings/personalisation`
2. Set "Default Chat Model" to `gpt-4.5-mini`
3. Set "Reasoning" toggle to **OFF**
4. Save preferences
5. Create a new chat (go to `/`)
6. **Expected:** Model selector shows `gpt-4.5-mini`, reasoning toggle is **OFF**
7. **Actual (before fix):** Model selector may show last-used model (cookie), reasoning toggle is **OFF** ✅

### Manual Test: Existing Chat with Custom Defaults
1. Go to `/settings/personalisation`
2. Set "Default Chat Model" to `gpt-4.5-mini`
3. Set "Reasoning" toggle to **OFF**
4. Save preferences
5. Open an existing chat (e.g., `/chat/abc123`)
6. **Expected:** Reasoning toggle should be **OFF** (respecting user preference)
7. **Actual (before fix):** Reasoning toggle is **ON** (hardcoded fallback) ❌

### Manual Test: Model Change Preserves Reasoning Preference
1. Set default reasoning to **OFF** in settings
2. Create a new chat
3. Change model from `gpt-4.5-mini` to `anthropic-claude-haiku-4-5`
4. **Expected:** Reasoning toggle should remain **OFF** (user's default)
5. **Actual (before fix):** Reasoning toggle defaults to **ON** for new models ❌

---

## 8. Conclusion

The AI preferences system is **mostly functional** for new chats, but has a critical bug for existing chats:

- ✅ **Default model** is applied correctly (with cookie override)
- ❌ **Default reasoning** is NOT applied to existing chats due to missing prop
- ⚠️ **Default reasoning** for new chats works, but may not persist when switching models

**Primary fix:** Add `initialDefaultReasoning={defaultReasoning}` to [app/(chat)/chat/[id]/page.tsx](file:///home/hilton/Documents/ledgerbot/app/(chat)/chat/[id]/page.tsx).

**Secondary fix:** Consider applying user preferences server-side as a fallback in [app/(chat)/api/chat/route.ts](file:///home/hilton/Documents/ledgerbot/app/(chat)/api/chat/route.ts).
