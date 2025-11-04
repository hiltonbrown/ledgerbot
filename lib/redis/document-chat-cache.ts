/**
 * Redis cache for document conversation persistence
 * Enables resumable Q&A sessions with PDFs across page refreshes
 */

import { getRedisClients } from "./config";
import type { PdfChatMessage } from "@/lib/agents/docmanagement/types";

// Cache TTL: 24 hours (conversations expire after 1 day of inactivity)
const CONVERSATION_TTL_SECONDS = 24 * 60 * 60;

// Cache key prefix to namespace document conversations
const CACHE_KEY_PREFIX = "docmanagement:chat";

type ConversationState = {
  contextFileId: string;
  documentId: string | null;
  summary: string;
  messages: PdfChatMessage[];
  lastUpdated: number;
};

/**
 * Generate Redis key for a user's document conversation
 */
function getCacheKey(userId: string, contextFileId: string): string {
  return `${CACHE_KEY_PREFIX}:${userId}:${contextFileId}`;
}

/**
 * Save conversation state to Redis cache
 */
export async function saveConversationCache(
  userId: string,
  contextFileId: string,
  state: Omit<ConversationState, "lastUpdated">
): Promise<void> {
  const clients = await getRedisClients();

  if (!clients) {
    console.log("[docmanagement] Redis not available - cache disabled");
    return;
  }

  const key = getCacheKey(userId, contextFileId);

  const cacheData: ConversationState = {
    ...state,
    lastUpdated: Date.now(),
  };

  try {
    await clients.publisher.set(
      key,
      JSON.stringify(cacheData),
      { EX: CONVERSATION_TTL_SECONDS }
    );

    console.log(
      `[docmanagement] Cached conversation for ${contextFileId} (${state.messages.length} messages)`
    );
  } catch (error) {
    console.error("[docmanagement] Failed to cache conversation:", error);
  }
}

/**
 * Retrieve conversation state from Redis cache
 */
export async function getConversationCache(
  userId: string,
  contextFileId: string
): Promise<ConversationState | null> {
  const clients = await getRedisClients();

  if (!clients) {
    return null;
  }

  const key = getCacheKey(userId, contextFileId);

  try {
    const cached = await clients.publisher.get(key);

    if (!cached) {
      return null;
    }

    const state = JSON.parse(cached) as ConversationState;

    // Refresh TTL on read (conversations stay alive while being used)
    await clients.publisher.expire(key, CONVERSATION_TTL_SECONDS);

    console.log(
      `[docmanagement] Restored conversation for ${contextFileId} (${state.messages.length} messages, age: ${Math.round((Date.now() - state.lastUpdated) / 1000)}s)`
    );

    return state;
  } catch (error) {
    console.error("[docmanagement] Failed to retrieve cached conversation:", error);
    return null;
  }
}

/**
 * Clear conversation cache (e.g., when user uploads new PDF)
 */
export async function clearConversationCache(
  userId: string,
  contextFileId: string
): Promise<void> {
  const clients = await getRedisClients();

  if (!clients) {
    return;
  }

  const key = getCacheKey(userId, contextFileId);

  try {
    await clients.publisher.del(key);
    console.log(`[docmanagement] Cleared conversation cache for ${contextFileId}`);
  } catch (error) {
    console.error("[docmanagement] Failed to clear conversation cache:", error);
  }
}

/**
 * List all active conversations for a user (for debugging/admin)
 */
export async function listUserConversations(
  userId: string
): Promise<string[]> {
  const clients = await getRedisClients();

  if (!clients) {
    return [];
  }

  try {
    const pattern = `${CACHE_KEY_PREFIX}:${userId}:*`;
    const keys: string[] = [];

    // Scan for matching keys (avoids blocking KEYS command)
    for await (const key of clients.publisher.scanIterator({ MATCH: pattern })) {
      if (Array.isArray(key)) {
        keys.push(...key);
      } else {
        keys.push(key);
      }
    }

    return keys;
  } catch (error) {
    console.error("[docmanagement] Failed to list conversations:", error);
    return [];
  }
}
