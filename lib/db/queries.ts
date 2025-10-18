import "server-only";

import { del } from "@vercel/blob";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
  sql,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import type { AppUsage } from "../usage";
import {
  type Chat,
  type ContextFile,
  chat,
  contextFile,
  type DBMessage,
  document,
  message,
  type Suggestion,
  stream,
  suggestion,
  type User,
  user,
  vote,
  type XeroConnection,
  xeroConnection,
} from "./schema";
import { generateHashedPassword } from "./utils";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
export const db = drizzle(client);

export async function getUser(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create user");
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    return await db.insert(message).values(messages);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function createContextFile({
  userId,
  name,
  originalName,
  blobUrl,
  fileType,
  fileSize,
  description,
}: {
  userId: string;
  name: string;
  originalName: string;
  blobUrl: string;
  fileType: string;
  fileSize: number;
  description?: string;
}) {
  try {
    return await db
      .insert(contextFile)
      .values({
        userId,
        name,
        originalName,
        blobUrl,
        fileType,
        fileSize,
        description,
      })
      .returning();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create context file"
    );
  }
}

export async function getContextFilesByUserId({
  userId,
  status,
}: {
  userId: string;
  status?: "processing" | "ready" | "failed";
}): Promise<ContextFile[]> {
  try {
    const conditions: SQL[] = [eq(contextFile.userId, userId)];
    if (status) {
      conditions.push(eq(contextFile.status, status));
    }

    const whereCondition =
      conditions.length === 1 ? conditions[0] : and(...conditions);

    return await db
      .select()
      .from(contextFile)
      .where(whereCondition)
      .orderBy(
        desc(contextFile.isPinned),
        desc(contextFile.lastUsedAt),
        desc(contextFile.createdAt)
      );
  } catch (error) {
    console.error("Database error in getContextFilesByUserId:", {
      userId,
      status,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to fetch context files"
    );
  }
}

export async function updateContextFileContent({
  id,
  extractedText,
  tokenCount,
  status,
  errorMessage,
}: {
  id: string;
  extractedText?: string;
  tokenCount?: number;
  status: "ready" | "failed";
  errorMessage?: string;
}) {
  try {
    return await db
      .update(contextFile)
      .set({
        extractedText,
        tokenCount,
        status,
        errorMessage,
        processedAt: new Date(),
      })
      .where(eq(contextFile.id, id))
      .returning();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update context file"
    );
  }
}

export async function deleteContextFile({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    const [file] = await db
      .select()
      .from(contextFile)
      .where(and(eq(contextFile.id, id), eq(contextFile.userId, userId)))
      .limit(1);

    if (!file) {
      throw new ChatSDKError("not_found:database", "Context file not found");
    }

    await del(file.blobUrl);

    return await db
      .delete(contextFile)
      .where(eq(contextFile.id, id))
      .returning();
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }

    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete context file"
    );
  }
}

export async function touchContextFile(id: string) {
  try {
    await db
      .update(contextFile)
      .set({ lastUsedAt: new Date() })
      .where(eq(contextFile.id, id));
  } catch (_error) {
    // Non-fatal: ignore
  }
}

export async function getUserStorageUsage(userId: string) {
  try {
    const [usage] = await db
      .select({
        totalSize: sql<number>`COALESCE(SUM(${contextFile.fileSize}), 0)`,
        fileCount: count(contextFile.id),
      })
      .from(contextFile)
      .where(eq(contextFile.userId, userId));

    const totalSize = usage?.totalSize ?? 0;
    const rawCount = usage?.fileCount ?? 0;
    const fileCount =
      typeof rawCount === "bigint" ? Number(rawCount) : Number(rawCount);

    return {
      totalSize,
      fileCount,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to compute storage usage"
    );
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map(
      (currentMessage) => currentMessage.id
    );

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateChatLastContextById({
  chatId,
  context,
}: {
  chatId: string;
  // Store merged server-enriched usage object
  context: AppUsage;
}) {
  try {
    return await db
      .update(chat)
      .set({ lastContext: context })
      .where(eq(chat.id, chatId));
  } catch (error) {
    console.warn("Failed to update lastContext for chat", chatId, error);
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, "user")
        )
      )
      .execute();

    return stats?.count ?? 0;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}

export type TokenUsageRow = {
  modelId: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  chatCount: number;
};

export async function getTokenUsageByUserId({
  userId,
  startDate,
  endDate,
}: {
  userId: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<TokenUsageRow[]> {
  try {
    const conditions: SQL[] = [eq(chat.userId, userId)];

    if (startDate) {
      conditions.push(gte(chat.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lt(chat.createdAt, endDate));
    }

    const whereCondition =
      conditions.length === 1 ? conditions[0] : and(...conditions);

    const results = await db
      .select({
        modelId: sql<string | null>`(${chat.lastContext}->>'modelId')`,
        promptTokens: sql<number>`COALESCE(SUM(CAST(${chat.lastContext}->>'promptTokens' AS INTEGER)), 0)`,
        completionTokens: sql<number>`COALESCE(SUM(CAST(${chat.lastContext}->>'completionTokens' AS INTEGER)), 0)`,
        totalTokens: sql<number>`COALESCE(SUM(CAST(${chat.lastContext}->>'totalTokens' AS INTEGER)), 0)`,
        cost: sql<number>`COALESCE(SUM(CAST(${chat.lastContext}->>'cost' AS NUMERIC)), 0)`,
        chatCount: count(chat.id),
      })
      .from(chat)
      .where(and(whereCondition, sql`${chat.lastContext} IS NOT NULL`))
      .groupBy(sql`${chat.lastContext}->>'modelId'`)
      .execute();

    return results.map((row) => ({
      modelId: row.modelId,
      promptTokens: Number(row.promptTokens),
      completionTokens: Number(row.completionTokens),
      totalTokens: Number(row.totalTokens),
      cost: Number(row.cost),
      chatCount:
        typeof row.chatCount === "bigint"
          ? Number(row.chatCount)
          : Number(row.chatCount),
    }));
  } catch (error) {
    console.error("Failed to get token usage by user id:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get token usage by user id"
    );
  }
}

export type TokenUsageTimeseriesRow = {
  date: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
};

export async function getTokenUsageTimeseries({
  userId,
  startDate,
  endDate,
}: {
  userId: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<TokenUsageTimeseriesRow[]> {
  try {
    const conditions: SQL[] = [eq(chat.userId, userId)];

    if (startDate) {
      conditions.push(gte(chat.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lt(chat.createdAt, endDate));
    }

    const whereCondition =
      conditions.length === 1 ? conditions[0] : and(...conditions);

    const results = await db
      .select({
        date: sql<string>`DATE(${chat.createdAt})`,
        promptTokens: sql<number>`COALESCE(SUM(CAST(${chat.lastContext}->>'promptTokens' AS INTEGER)), 0)`,
        completionTokens: sql<number>`COALESCE(SUM(CAST(${chat.lastContext}->>'completionTokens' AS INTEGER)), 0)`,
        totalTokens: sql<number>`COALESCE(SUM(CAST(${chat.lastContext}->>'totalTokens' AS INTEGER)), 0)`,
        cost: sql<number>`COALESCE(SUM(CAST(${chat.lastContext}->>'cost' AS NUMERIC)), 0)`,
      })
      .from(chat)
      .where(and(whereCondition, sql`${chat.lastContext} IS NOT NULL`))
      .groupBy(sql`DATE(${chat.createdAt})`)
      .orderBy(asc(sql`DATE(${chat.createdAt})`))
      .execute();

    return results.map((row) => ({
      date: row.date,
      promptTokens: Number(row.promptTokens),
      completionTokens: Number(row.completionTokens),
      totalTokens: Number(row.totalTokens),
      cost: Number(row.cost),
    }));
  } catch (error) {
    console.error("Failed to get token usage timeseries:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get token usage timeseries"
    );
  }
}

// Xero Connection Queries

export async function getActiveXeroConnection(
  userId: string
): Promise<XeroConnection | null> {
  try {
    const [connection] = await db
      .select()
      .from(xeroConnection)
      .where(
        and(
          eq(xeroConnection.userId, userId),
          eq(xeroConnection.isActive, true)
        )
      )
      .orderBy(desc(xeroConnection.updatedAt))
      .limit(1);

    return connection ?? null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get active Xero connection"
    );
  }
}

export async function getXeroConnectionById(
  id: string
): Promise<XeroConnection | null> {
  try {
    const [connection] = await db
      .select()
      .from(xeroConnection)
      .where(eq(xeroConnection.id, id))
      .limit(1);

    return connection ?? null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get Xero connection"
    );
  }
}

export async function getXeroConnectionsByUserId(
  userId: string
): Promise<XeroConnection[]> {
  try {
    return await db
      .select()
      .from(xeroConnection)
      .where(eq(xeroConnection.userId, userId))
      .orderBy(desc(xeroConnection.isActive), desc(xeroConnection.updatedAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get Xero connections"
    );
  }
}

export async function createXeroConnection({
  userId,
  tenantId,
  tenantName,
  accessToken,
  refreshToken,
  expiresAt,
  scopes,
}: {
  userId: string;
  tenantId: string;
  tenantName?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
}): Promise<XeroConnection> {
  try {
    // Deactivate any existing connections
    await db
      .update(xeroConnection)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(xeroConnection.userId, userId));

    const [connection] = await db
      .insert(xeroConnection)
      .values({
        userId,
        tenantId,
        tenantName,
        accessToken,
        refreshToken,
        expiresAt,
        scopes,
        isActive: true,
      })
      .returning();

    return connection;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create Xero connection"
    );
  }
}

export async function updateXeroTokens({
  id,
  accessToken,
  refreshToken,
  expiresAt,
}: {
  id: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}): Promise<XeroConnection> {
  try {
    const [connection] = await db
      .update(xeroConnection)
      .set({
        accessToken,
        refreshToken,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(xeroConnection.id, id))
      .returning();

    return connection;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update Xero tokens"
    );
  }
}

export async function deleteXeroConnection(id: string): Promise<void> {
  try {
    await db.delete(xeroConnection).where(eq(xeroConnection.id, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete Xero connection"
    );
  }
}

export async function deactivateXeroConnection(id: string): Promise<void> {
  try {
    await db
      .update(xeroConnection)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(xeroConnection.id, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to deactivate Xero connection"
    );
  }
}
