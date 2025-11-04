import { generateUUID } from "@/lib/utils";

type MemoryMessage = {
  id: string;
  chatId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

type LibsqlClient = {
  execute: (
    query: string,
    params?: Record<string, unknown> | Array<unknown>
  ) => Promise<{ rows: Array<Record<string, unknown>> } | void>;
};

async function createLibsqlClient(): Promise<LibsqlClient | null> {
  if (!process.env.LIBSQL_URL) {
    return null;
  }

  try {
    const mod = await import("@libsql/client");
    const client = mod.createClient({
      url: process.env.LIBSQL_URL,
      authToken: process.env.LIBSQL_AUTH_TOKEN,
    });

    await client.execute(`
      CREATE TABLE IF NOT EXISTS forecasting_memory (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    await client.execute(
      "CREATE INDEX IF NOT EXISTS forecasting_memory_user_idx ON forecasting_memory (user_id, created_at)"
    );
    await client.execute(
      "CREATE INDEX IF NOT EXISTS forecasting_memory_chat_idx ON forecasting_memory (chat_id, created_at)"
    );

    return client;
  } catch (error) {
    console.warn("[ForecastingMemory] Failed to connect to LibSQL", error);
    return null;
  }
}

function toIso(date: Date) {
  return date.toISOString();
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

const fallbackStore = new Map<string, MemoryMessage[]>();

export class ForecastingMemoryStore {
  private clientPromise: Promise<LibsqlClient | null> | null = null;

  private async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = createLibsqlClient();
    }

    return this.clientPromise;
  }

  async append(message: Omit<MemoryMessage, "id" | "createdAt"> & {
    createdAt?: Date;
  }) {
    const record: MemoryMessage = {
      id: generateUUID(),
      createdAt: message.createdAt ?? new Date(),
      ...message,
    };

    const client = await this.getClient();

    if (client) {
      try {
        await client.execute(
          `INSERT INTO forecasting_memory (id, chat_id, user_id, role, content, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
          [
            record.id,
            record.chatId,
            record.userId,
            record.role,
            record.content,
            toIso(record.createdAt),
          ]
        );
      } catch (error) {
        console.warn("[ForecastingMemory] Failed to persist message", error);
      }
    } else {
      const key = `${record.userId}:${record.chatId}`;
      const existing = fallbackStore.get(key) ?? [];
      existing.push(record);
      fallbackStore.set(key, existing);
    }
  }

  async appendMany(messages: Array<Omit<MemoryMessage, "id" | "createdAt">>) {
    for (const message of messages) {
      await this.append(message);
    }
  }

  async getThreadMessages(chatId: string, limit = 8): Promise<MemoryMessage[]> {
    const client = await this.getClient();

    if (client) {
      try {
        const result = await client.execute(
          `SELECT id, chat_id as chatId, user_id as userId, role, content, created_at as createdAt
           FROM forecasting_memory
           WHERE chat_id = ?1
           ORDER BY datetime(created_at) DESC
           LIMIT ?2`,
          [chatId, limit]
        );

        const rows = ensureArray(result && "rows" in result ? result.rows : []);
        return rows
          .map((row) => ({
            id: String(row.id),
            chatId: String(row.chatId),
            userId: String(row.userId),
            role: (row.role as "user" | "assistant") ?? "assistant",
            content: String(row.content ?? ""),
            createdAt: new Date(String(row.createdAt ?? new Date().toISOString())),
          }))
          .reverse();
      } catch (error) {
        console.warn("[ForecastingMemory] Failed to query thread messages", error);
      }
    }

    const values: MemoryMessage[] = [];
    for (const [, threadMessages] of fallbackStore) {
      for (const message of threadMessages) {
        if (message.chatId === chatId) {
          values.push(message);
        }
      }
    }

    return values.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    ).slice(-limit);
  }

  async searchRelevantMemories(
    userId: string,
    keywords: string[],
    limit = 5
  ): Promise<MemoryMessage[]> {
    const trimmedKeywords = keywords
      .map((keyword) => keyword.trim().toLowerCase())
      .filter((keyword) => keyword.length > 2);

    if (trimmedKeywords.length === 0) {
      return [];
    }

    const client = await this.getClient();

    if (client) {
      try {
        const likeClauses = trimmedKeywords
          .map((_, index) => `LOWER(content) LIKE ?${index + 2}`)
          .join(" OR ");
        const params = [userId, ...trimmedKeywords.map((keyword) => `%${keyword}%`), limit];
        const query = `SELECT id, chat_id as chatId, user_id as userId, role, content, created_at as createdAt
          FROM forecasting_memory
          WHERE user_id = ?1 AND (${likeClauses})
          ORDER BY datetime(created_at) DESC
          LIMIT ?${trimmedKeywords.length + 2}`;
        const result = await client.execute(query, params);
        const rows = ensureArray(result && "rows" in result ? result.rows : []);
        return rows.map((row) => ({
          id: String(row.id),
          chatId: String(row.chatId),
          userId: String(row.userId),
          role: (row.role as "user" | "assistant") ?? "assistant",
          content: String(row.content ?? ""),
          createdAt: new Date(String(row.createdAt ?? new Date().toISOString())),
        }));
      } catch (error) {
        console.warn("[ForecastingMemory] Failed to search memories", error);
      }
    }

    const result: MemoryMessage[] = [];
    for (const [, threadMessages] of fallbackStore) {
      for (const message of threadMessages) {
        if (message.userId !== userId) {
          continue;
        }

        const haystack = message.content.toLowerCase();
        if (trimmedKeywords.some((keyword) => haystack.includes(keyword))) {
          result.push(message);
        }
      }
    }

    return result
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

export const forecastingMemory = new ForecastingMemoryStore();
