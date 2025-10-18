import "server-only";

import type { DecryptedXeroConnection } from "@/lib/xero/types";
import { getDecryptedConnection } from "@/lib/xero/connection-manager";

interface CacheEntry {
  connection: DecryptedXeroConnection;
  refreshPromise?: Promise<DecryptedXeroConnection | null>;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function buildKey(userId: string, tenantId?: string) {
  return `${userId}:${tenantId ?? "primary"}`;
}

export async function getConnectionSafe(
  userId: string,
  tenantId?: string
): Promise<DecryptedXeroConnection | null> {
  const key = buildKey(userId, tenantId);
  const cached = cache.get(key);
  const now = Date.now();

  if (cached) {
    if (cached.refreshPromise) {
      return cached.refreshPromise;
    }

    if (cached.expiresAt > now) {
      return cached.connection;
    }
  }

  const refreshPromise = getDecryptedConnection(userId, tenantId);

  cache.set(key, {
    connection: cached?.connection as DecryptedXeroConnection,
    refreshPromise,
    expiresAt: now + CACHE_TTL_MS,
  });

  try {
    const connection = await refreshPromise;

    if (connection) {
      cache.set(key, {
        connection,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    } else {
      cache.delete(key);
    }

    return connection;
  } catch (error) {
    cache.delete(key);
    throw error;
  }
}

export function invalidateConnection(userId: string, tenantId?: string) {
  cache.delete(buildKey(userId, tenantId));
}

export function clearUserConnections(userId: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      cache.delete(key);
    }
  }
}
