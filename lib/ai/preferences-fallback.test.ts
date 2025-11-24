import assert from "node:assert/strict";
import { chatModelIds, DEFAULT_CHAT_MODEL } from "./models";

console.log("Running AI preferences fallback logic tests...");

// Test 1: chatModelIds array is populated
assert.ok(
  Array.isArray(chatModelIds) && chatModelIds.length > 0,
  "chatModelIds should be a non-empty array"
);
console.log(`✅ chatModelIds contains ${chatModelIds.length} models`);

// Test 2: DEFAULT_CHAT_MODEL is valid
assert.ok(
  chatModelIds.includes(DEFAULT_CHAT_MODEL),
  `DEFAULT_CHAT_MODEL (${DEFAULT_CHAT_MODEL}) should be in chatModelIds`
);
console.log(`✅ DEFAULT_CHAT_MODEL is valid: ${DEFAULT_CHAT_MODEL}`);

// Test 3: Model ID validation logic
const testModelValidation = (modelId: string, shouldBeValid: boolean) => {
  const isValid = chatModelIds.includes(modelId);
  assert.strictEqual(
    isValid,
    shouldBeValid,
    `Model ID "${modelId}" validation failed`
  );
};

// Valid model IDs
testModelValidation("anthropic-claude-haiku-4-5", true);
testModelValidation("openai-gpt-5-chat", true);
testModelValidation("google-gemini-2-5-flash", true);

// Invalid model IDs
testModelValidation("invalid-model-xyz", false);
testModelValidation("", false);
testModelValidation("gpt-4", false); // Old model ID format

console.log("✅ Model ID validation logic passed");

// Test 4: Fallback logic simulation
const simulateFallback = (
  requestedModel: string | undefined,
  userDefaultModel: string | undefined
): string => {
  // This simulates the logic in app/(chat)/api/chat/route.ts
  let selectedModel = requestedModel || userDefaultModel || DEFAULT_CHAT_MODEL;

  // Validate and fall back if invalid
  if (!chatModelIds.includes(selectedModel)) {
    console.log(
      `[test] Invalid model ID: ${selectedModel}, falling back to ${DEFAULT_CHAT_MODEL}`
    );
    selectedModel = DEFAULT_CHAT_MODEL;
  }

  return selectedModel;
};

// Test 4a: Requested model takes precedence
assert.strictEqual(
  simulateFallback("openai-gpt-5-chat", "anthropic-claude-haiku-4-5"),
  "openai-gpt-5-chat",
  "Requested model should take precedence"
);

// Test 4b: User default used when request is undefined
assert.strictEqual(
  simulateFallback(undefined, "google-gemini-2-5-flash"),
  "google-gemini-2-5-flash",
  "User default should be used when request is undefined"
);

// Test 4c: System default used when both are undefined
assert.strictEqual(
  simulateFallback(undefined, undefined),
  DEFAULT_CHAT_MODEL,
  "System default should be used when both are undefined"
);

// Test 4d: Invalid requested model falls back to user default
assert.strictEqual(
  simulateFallback("invalid-model", "openai-gpt-5-mini"),
  DEFAULT_CHAT_MODEL,
  "Invalid requested model should fall back to system default"
);

// Test 4e: Invalid user default falls back to system default
assert.strictEqual(
  simulateFallback(undefined, "invalid-default"),
  DEFAULT_CHAT_MODEL,
  "Invalid user default should fall back to system default"
);

console.log("✅ Fallback logic simulation passed");

// Test 5: Reasoning preference fallback
const simulateReasoningFallback = (
  requestedReasoning: boolean | undefined,
  userDefaultReasoning: boolean | undefined
): boolean => {
  // This simulates the logic in app/(chat)/api/chat/route.ts
  return requestedReasoning ?? userDefaultReasoning ?? false;
};

// Test 5a: Requested reasoning takes precedence
assert.strictEqual(
  simulateReasoningFallback(true, false),
  true,
  "Requested reasoning should take precedence"
);

assert.strictEqual(
  simulateReasoningFallback(false, true),
  false,
  "Requested reasoning (false) should take precedence over user default (true)"
);

// Test 5b: User default used when request is undefined
assert.strictEqual(
  simulateReasoningFallback(undefined, true),
  true,
  "User default reasoning should be used when request is undefined"
);

assert.strictEqual(
  simulateReasoningFallback(undefined, false),
  false,
  "User default reasoning (false) should be used when request is undefined"
);

// Test 5c: System default used when both are undefined
assert.strictEqual(
  simulateReasoningFallback(undefined, undefined),
  false,
  "System default reasoning (false) should be used when both are undefined"
);

console.log("✅ Reasoning fallback logic passed");

// Test 6: Complete request body simulation
interface SimulatedRequestBody {
  selectedChatModel?: string;
  streamReasoning?: boolean;
}

interface SimulatedUserSettings {
  personalisation: {
    defaultModel: string;
    defaultReasoning: boolean;
  };
}

const simulateRequestProcessing = (
  requestBody: SimulatedRequestBody,
  userSettings: SimulatedUserSettings
): { model: string; reasoning: boolean } => {
  const defaultModelId =
    userSettings.personalisation.defaultModel || DEFAULT_CHAT_MODEL;
  const defaultReasoning =
    userSettings.personalisation.defaultReasoning ?? false;

  let selectedChatModel = requestBody.selectedChatModel || defaultModelId;
  const streamReasoning = requestBody.streamReasoning ?? defaultReasoning;

  // Validate model
  if (!chatModelIds.includes(selectedChatModel)) {
    selectedChatModel = DEFAULT_CHAT_MODEL;
  }

  return { model: selectedChatModel, reasoning: streamReasoning };
};

// Test 6a: Complete request with explicit values
const result1 = simulateRequestProcessing(
  { selectedChatModel: "openai-gpt-5-chat", streamReasoning: true },
  {
    personalisation: {
      defaultModel: "anthropic-claude-haiku-4-5",
      defaultReasoning: false,
    },
  }
);
assert.deepStrictEqual(
  result1,
  { model: "openai-gpt-5-chat", reasoning: true },
  "Explicit values should be used"
);

// Test 6b: Request with omitted values uses user defaults
const result2 = simulateRequestProcessing(
  {},
  {
    personalisation: {
      defaultModel: "google-gemini-2-5-flash",
      defaultReasoning: true,
    },
  }
);
assert.deepStrictEqual(
  result2,
  { model: "google-gemini-2-5-flash", reasoning: true },
  "User defaults should be used when values are omitted"
);

// Test 6c: Invalid model falls back to system default
const result3 = simulateRequestProcessing(
  { selectedChatModel: "invalid-model" },
  {
    personalisation: {
      defaultModel: "openai-gpt-5-mini",
      defaultReasoning: false,
    },
  }
);
assert.deepStrictEqual(
  result3,
  { model: DEFAULT_CHAT_MODEL, reasoning: false },
  "Invalid model should fall back to system default"
);

console.log("✅ Complete request processing simulation passed");

console.log("\n🎉 All AI preferences fallback logic tests passed!");
