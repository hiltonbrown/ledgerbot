# AI Preferences QA Checklist

**Purpose:** Verify that AI Preferences (default chat model and reasoning toggle) correctly control the initial state of new chats.

**Last Updated:** 2025-11-24

---

## Prerequisites

- [ ] Application is running locally (`pnpm dev`)
- [ ] Browser DevTools is open (Network tab for API inspection)
- [ ] User is logged in
- [ ] No existing AI preferences set (or note current values)

---

## Test 1: Set AI Preferences and Verify New Chat

### 1.1 Configure AI Preferences

- [ ] Navigate to `/settings/personalisation`
- [ ] Scroll to "AI Preferences" section
- [ ] Set **Default Chat Model** to `OpenAI GPT-5.1` (or `openai-gpt-5-chat`)
- [ ] Set **Reasoning** toggle to **ON**
- [ ] Click "Save AI Preferences"
- [ ] Verify success toast appears

### 1.2 Verify New Chat Initialization

- [ ] Navigate to `/` (new chat page)
- [ ] **Verify:** Model selector displays `OpenAI GPT-5.1`
- [ ] **Verify:** Reasoning toggle is **ON**

### 1.3 Verify API Request

- [ ] Open Browser DevTools → Network tab
- [ ] Filter for `chat` requests
- [ ] Type a simple message (e.g., "Hello") and send
- [ ] Find the POST request to `/api/chat`
- [ ] Click on the request → Payload tab
- [ ] **Verify:** Request body contains:
  ```json
  {
    "selectedChatModel": "openai-gpt-5-chat",
    "streamReasoning": true
  }
  ```

---

## Test 2: Change AI Preferences and Verify

### 2.1 Update AI Preferences

- [ ] Navigate to `/settings/personalisation`
- [ ] Set **Default Chat Model** to `Anthropic Claude Haiku 4.5` (or `anthropic-claude-haiku-4-5`)
- [ ] Set **Reasoning** toggle to **OFF**
- [ ] Click "Save AI Preferences"
- [ ] Verify success toast appears

### 2.2 Verify New Chat Reflects Changes

- [ ] Navigate to `/` (new chat page)
- [ ] **Verify:** Model selector displays `Anthropic Claude Haiku 4.5`
- [ ] **Verify:** Reasoning toggle is **OFF**

### 2.3 Verify API Request

- [ ] Open Browser DevTools → Network tab
- [ ] Type a simple message and send
- [ ] Find the POST request to `/api/chat`
- [ ] **Verify:** Request body contains:
  ```json
  {
    "selectedChatModel": "anthropic-claude-haiku-4-5",
    "streamReasoning": false
  }
  ```

---

## Test 3: Override Defaults Before Sending

### 3.1 Change Model/Reasoning in UI

- [ ] Navigate to `/` (new chat page)
- [ ] **Initial state:** Model selector shows `Anthropic Claude Haiku 4.5`, Reasoning is **OFF** (from Test 2)
- [ ] Change model selector to `Google Gemini 2.5 Flash` (or `google-gemini-2-5-flash`)
- [ ] Toggle reasoning **ON**
- [ ] **Verify:** UI updates immediately

### 3.2 Verify Overridden Values Sent to API

- [ ] Open Browser DevTools → Network tab
- [ ] Type a simple message and send
- [ ] Find the POST request to `/api/chat`
- [ ] **Verify:** Request body contains the **overridden** values:
  ```json
  {
    "selectedChatModel": "google-gemini-2-5-flash",
    "streamReasoning": true
  }
  ```

---

## Test 4: Existing Chat Behavior

### 4.1 Create a Chat with Specific Model

- [ ] Navigate to `/` (new chat page)
- [ ] Ensure AI preferences are set to `Anthropic Claude Haiku 4.5` and Reasoning **OFF**
- [ ] Change model to `OpenAI GPT-5.1` in the UI
- [ ] Send a message to create the chat
- [ ] Note the chat ID from the URL (e.g., `/chat/abc-123`)

### 4.2 Reopen Existing Chat

- [ ] Navigate to the chat URL (e.g., `/chat/abc-123`)
- [ ] **Verify:** Model selector shows `OpenAI GPT-5.1` (last-used model from cookie)
- [ ] **Verify:** Reasoning toggle is **OFF** (from user's default preference)

**Note:** For existing chats, the model selector uses the cookie value (last-used model) rather than always resetting to the user's default preference. This is intentional to remember the model used in that session.

---

## Test 5: Cookie Override for New Chats

### 5.1 Set Up Cookie

- [ ] Navigate to `/` (new chat page)
- [ ] Change model to `OpenAI GPT-5 Mini` (or `openai-gpt-5-mini`)
- [ ] Send a message (this sets a cookie)
- [ ] Note: This creates a `chat-model` cookie

### 5.2 Verify Cookie Takes Precedence

- [ ] Navigate to `/` (new chat page) again
- [ ] **Verify:** Model selector shows `OpenAI GPT-5 Mini` (from cookie)
- [ ] **Note:** Cookie value takes precedence over user's default preference

### 5.3 Clear Cookie and Verify Default

- [ ] Open Browser DevTools → Application → Cookies
- [ ] Delete the `chat-model` cookie
- [ ] Navigate to `/` (new chat page)
- [ ] **Verify:** Model selector shows the default from AI Preferences (e.g., `Anthropic Claude Haiku 4.5`)

---

## Test 6: Backend Fallback Logic

### 6.1 Verify Backend Uses Defaults

This test verifies that the backend applies user preferences when the frontend doesn't send explicit values.

- [ ] Open Browser DevTools → Console
- [ ] Navigate to `/` (new chat page)
- [ ] In the console, run this code to send a request without explicit model/reasoning:
  ```javascript
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      message: {
        id: crypto.randomUUID(),
        role: 'user',
        parts: [{ type: 'text', text: 'Test message' }]
      },
      selectedVisibilityType: 'private'
      // Note: selectedChatModel and streamReasoning are omitted
    })
  }).then(r => console.log('Status:', r.status));
  ```
- [ ] **Verify:** Request completes successfully (status 200)
- [ ] **Verify:** Backend logs show it used the default model and reasoning from user settings

---

## Test 7: Invalid Model ID Fallback

### 7.1 Send Invalid Model ID

This test verifies that the backend gracefully handles invalid model IDs.

- [ ] Open Browser DevTools → Console
- [ ] Run this code to send a request with an invalid model ID:
  ```javascript
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      message: {
        id: crypto.randomUUID(),
        role: 'user',
        parts: [{ type: 'text', text: 'Test message' }]
      },
      selectedChatModel: 'invalid-model-xyz',
      selectedVisibilityType: 'private'
    })
  }).then(r => console.log('Status:', r.status));
  ```
- [ ] **Verify:** Request completes successfully (status 200)
- [ ] **Verify:** Backend logs show error: `Invalid model ID: invalid-model-xyz, falling back to anthropic-claude-haiku-4-5`
- [ ] **Verify:** Chat works without errors

---

## Edge Cases

### Edge Case 1: No AI Preferences Set

- [ ] Create a new user account (or clear user settings in database)
- [ ] Navigate to `/` (new chat page) without setting AI preferences
- [ ] **Verify:** Model selector shows system default (`Anthropic Claude Haiku 4.5`)
- [ ] **Verify:** Reasoning toggle is **OFF** (system default)

### Edge Case 2: Locked Settings

- [ ] Set AI preferences to specific values
- [ ] In database, set `isLocked = true` for the user
- [ ] Navigate to `/settings/personalisation`
- [ ] **Verify:** AI Preferences form is disabled
- [ ] Navigate to `/` (new chat page)
- [ ] **Verify:** Model selector and reasoning toggle still reflect the locked preferences

### Edge Case 3: Rapid Model Switching

- [ ] Navigate to `/` (new chat page)
- [ ] Rapidly switch between different models (5+ times)
- [ ] Send a message
- [ ] **Verify:** API request contains the final selected model
- [ ] **Verify:** No errors or race conditions

---

## Summary Checklist

After completing all tests above, verify:

- [ ] ✅ New chats initialize with AI Preferences (model and reasoning)
- [ ] ✅ Changing AI Preferences updates new chats immediately
- [ ] ✅ User can override defaults before sending first message
- [ ] ✅ Existing chats respect reasoning preference but use cookie for model
- [ ] ✅ Cookie takes precedence over default model for new chats
- [ ] ✅ Backend applies user preferences when values are omitted
- [ ] ✅ Backend gracefully handles invalid model IDs
- [ ] ✅ Edge cases handled correctly

---

## Notes

- **New vs Existing Chats:**
  - **New chats:** Model selector uses cookie → user default → system default
  - **Existing chats:** Model selector uses cookie → system default (doesn't reset to user default)
  - **Both:** Reasoning toggle always uses user's default preference

- **Cookie Behavior:**
  - The `chat-model` cookie remembers the last-used model across sessions
  - This is intentional to provide continuity
  - Clear the cookie to test default preference behavior

- **Backend Validation:**
  - The backend validates model IDs and falls back to system default if invalid
  - This prevents errors from malformed requests

---

## Troubleshooting

**Issue:** Model selector doesn't update after changing AI Preferences

**Solution:**
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Check that "Save AI Preferences" was clicked and success toast appeared

**Issue:** API request shows different values than UI

**Solution:**
- Check that you're looking at the correct request (filter by `/api/chat`)
- Verify the request is POST, not GET
- Check the Payload tab, not the Preview tab

**Issue:** Backend logs not visible

**Solution:**
- Check terminal where `pnpm dev` is running
- Look for `[chat/route]` prefix in logs
- Ensure `console.log` statements are not filtered out
