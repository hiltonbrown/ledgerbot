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
  ne,
  type SQL,
  sql,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/lib/chat/visibility";
import { ChatSDKError } from "../errors";
import type { AppUsage } from "../usage";
import * as schema from "./schema";
import {
  type AgentTrace,
  type AgentTraceInsert,
  agentTrace,
  type Chat,
  type ContextFile,
  chat,
  contextFile,
  type DBMessage,
  document,
  message,
  type RegulatoryDocument,
  type RegulatoryScrapeJob,
  regulatoryDocument,
  regulatoryScrapeJob,
  type Suggestion,
  stream,
  suggestion,
  type User,
  user,
  vote,
  type XeroConnection,
  xeroConnection,
} from "./schema";
import {
  type ArFollowUpContext,
  type ArFollowUpContextInsert,
  arFollowUpContext,
} from "./schema/ar";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
export const db = drizzle(client, { schema });

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

export async function saveChatIfNotExists({
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
    console.log("[saveChatIfNotExists] Attempting to save chat:", {
      id,
      userId,
      title,
      visibility,
    });

    const result = await db
      .insert(chat)
      .values({
        id,
        createdAt: new Date(),
        userId,
        title,
        visibility,
      })
      .onConflictDoNothing();

    console.log("[saveChatIfNotExists] Chat saved successfully");
    return result;
  } catch (_error) {
    console.error("[saveChatIfNotExists] Error saving chat:", _error);
    console.error("[saveChatIfNotExists] Error details:", {
      message: _error instanceof Error ? _error.message : String(_error),
      code: (_error as any)?.code,
      detail: (_error as any)?.detail,
    });
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
  chatId,
  name,
  originalName,
  blobUrl,
  fileType,
  fileSize,
  description,
}: {
  userId: string;
  chatId?: string;
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
        chatId,
        name,
        originalName,
        blobUrl,
        fileType,
        fileSize,
        description,
      })
      .returning();
  } catch (error) {
    console.error("Database error creating context file:", error);
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

export async function getContextFileById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<ContextFile | null> {
  try {
    const [file] = await db
      .select()
      .from(contextFile)
      .where(and(eq(contextFile.id, id), eq(contextFile.userId, userId)))
      .limit(1);

    return file ?? null;
  } catch (error) {
    console.error("Database error in getContextFileById:", {
      id,
      userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to fetch context file by id"
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
  } catch (error) {
    console.error("[db] Failed to update context file:", error);
    console.error("[db] Update params:", {
      id,
      extractedText: extractedText
        ? `${extractedText.length} chars`
        : undefined,
      tokenCount,
      status,
      errorMessage,
    });
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to update context file: ${error instanceof Error ? error.message : String(error)}`
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
  chatId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
  chatId?: string;
}) {
  try {
    console.log("saveDocument: Attempting to insert document", {
      id,
      title,
      kind,
      userId,
      chatId,
      contentLength: content?.length,
    });

    const result = await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        ...(chatId && { chatId }),
        createdAt: new Date(),
      })
      .returning();

    console.log("saveDocument: Insert successful", result);
    return result;
  } catch (error) {
    console.error("saveDocument: Insert failed", {
      id,
      title,
      kind,
      userId,
      chatId,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
      errorCode: (error as any)?.code,
      errorDetail: (error as any)?.detail,
      errorConstraint: (error as any)?.constraint,
      fullError: JSON.stringify(error, null, 2),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function updateDocumentChatId({
  documentId,
  chatId,
}: {
  documentId: string;
  chatId: string;
}) {
  try {
    return await db
      .update(document)
      .set({ chatId })
      .where(eq(document.id, documentId))
      .returning();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update document chatId"
    );
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

export async function getDocumentsByChatId({ chatId }: { chatId: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.chatId, chatId))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by chat id"
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
        promptTokens: sql<number>`COALESCE(SUM(CAST(${chat.lastContext}->>'inputTokens' AS INTEGER)), 0)`,
        completionTokens: sql<number>`COALESCE(SUM(CAST(${chat.lastContext}->>'outputTokens' AS INTEGER)), 0)`,
        totalTokens: sql<number>`COALESCE(SUM(CAST(${chat.lastContext}->>'totalTokens' AS INTEGER)), 0)`,
        cost: sql<number>`COALESCE(SUM(CAST(${chat.lastContext}->'costUSD'->>'totalUSD' AS NUMERIC)), 0)`,
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
        promptTokens: sql<number>`COALESCE(SUM(CAST(${chat.lastContext}->>'inputTokens' AS INTEGER)), 0)`,
        completionTokens: sql<number>`COALESCE(SUM(CAST(${chat.lastContext}->>'outputTokens' AS INTEGER)), 0)`,
        totalTokens: sql<number>`COALESCE(SUM(CAST(${chat.lastContext}->>'totalTokens' AS INTEGER)), 0)`,
        cost: sql<number>`COALESCE(SUM(CAST(${chat.lastContext}->'costUSD'->>'totalUSD' AS NUMERIC)), 0)`,
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

export async function removeDuplicateXeroConnectionsForUser(
  userId: string
): Promise<void> {
  try {
    const connections = await db
      .select({
        id: xeroConnection.id,
        tenantId: xeroConnection.tenantId,
        isActive: xeroConnection.isActive,
        updatedAt: xeroConnection.updatedAt,
      })
      .from(xeroConnection)
      .where(eq(xeroConnection.userId, userId))
      .orderBy(
        desc(xeroConnection.isActive),
        desc(xeroConnection.updatedAt),
        desc(xeroConnection.createdAt)
      );

    const seenTenantIds = new Set<string>();
    const duplicateIds: string[] = [];

    for (const connection of connections) {
      if (seenTenantIds.has(connection.tenantId)) {
        duplicateIds.push(connection.id);
      } else {
        seenTenantIds.add(connection.tenantId);
      }
    }

    if (duplicateIds.length === 0) {
      return;
    }

    await db
      .delete(xeroConnection)
      .where(inArray(xeroConnection.id, duplicateIds));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to remove duplicate Xero connections: ${_error instanceof Error ? _error.message : String(_error)}`
    );
  }
}

export async function createXeroConnection({
  userId,
  tenantId,
  tenantName,
  tenantType,
  organisationId,
  shortCode,
  baseCurrency,
  organisationType,
  isDemoCompany,
  accessToken,
  refreshToken,
  expiresAt,
  scopes,
  authenticationEventId,
  xeroConnectionId,
  xeroCreatedDateUtc,
  xeroUpdatedDateUtc,
}: {
  userId: string;
  tenantId: string;
  tenantName?: string;
  tenantType?: string;
  organisationId?: string;
  shortCode?: string;
  baseCurrency?: string;
  organisationType?: string;
  isDemoCompany?: boolean;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
  authenticationEventId?: string;
  xeroConnectionId?: string;
  xeroCreatedDateUtc?: Date;
  xeroUpdatedDateUtc?: Date;
}): Promise<XeroConnection> {
  try {
    const now = new Date();
    const tenantNameValue = tenantName?.trim() ?? null;

    // Log input parameters for debugging
    console.log("createXeroConnection called with:", {
      userId,
      tenantId,
      tenantName: tenantNameValue,
      accessTokenLength: accessToken?.length,
      refreshTokenLength: refreshToken?.length,
      expiresAt,
      scopes,
      scopesLength: scopes?.length,
    });

    return await db.transaction(async (tx) => {
      const [existingConnection] = await tx
        .select()
        .from(xeroConnection)
        .where(
          and(
            eq(xeroConnection.userId, userId),
            eq(xeroConnection.tenantId, tenantId)
          )
        )
        .orderBy(desc(xeroConnection.updatedAt))
        .limit(1);

      console.log("Existing connection check:", {
        found: !!existingConnection,
        existingId: existingConnection?.id,
        existingTenantId: existingConnection?.tenantId,
      });

      let connection: XeroConnection | null = null;

      if (existingConnection) {
        console.log("Updating existing connection:", existingConnection.id);
        const [updatedConnection] = await tx
          .update(xeroConnection)
          .set({
            tenantName:
              tenantNameValue !== null
                ? tenantNameValue
                : existingConnection.tenantName,
            tenantType: tenantType || existingConnection.tenantType,
            // Update organisation metadata (Xero best practice)
            organisationId: organisationId || existingConnection.organisationId,
            shortCode: shortCode || existingConnection.shortCode,
            baseCurrency: baseCurrency || existingConnection.baseCurrency,
            organisationType:
              organisationType || existingConnection.organisationType,
            isDemoCompany: isDemoCompany ?? existingConnection.isDemoCompany,
            accessToken,
            refreshToken,
            refreshTokenIssuedAt: now, // Reset refresh token issuance time on re-auth
            expiresAt,
            scopes,
            authenticationEventId,
            xeroConnectionId:
              xeroConnectionId || existingConnection.xeroConnectionId,
            xeroCreatedDateUtc:
              xeroCreatedDateUtc || existingConnection.xeroCreatedDateUtc,
            xeroUpdatedDateUtc:
              xeroUpdatedDateUtc || existingConnection.xeroUpdatedDateUtc,
            connectionStatus: "connected",
            lastError: null, // Clear user-friendly error message
            lastErrorDetails: null, // Clear technical error details
            lastErrorType: null, // Clear error type
            lastCorrelationId: null, // Clear correlation ID
            isActive: true,
            updatedAt: now,
          })
          .where(eq(xeroConnection.id, existingConnection.id))
          .returning();

        if (!updatedConnection) {
          throw new Error("Failed to update Xero connection record");
        }
        connection = updatedConnection;
        console.log("Updated connection:", connection.id);

        await tx
          .update(xeroConnection)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(xeroConnection.userId, userId),
              ne(xeroConnection.id, existingConnection.id)
            )
          );
      } else {
        console.log("Creating new connection");
        await tx
          .update(xeroConnection)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(xeroConnection.userId, userId));

        const [createdConnection] = await tx
          .insert(xeroConnection)
          .values({
            userId,
            tenantId,
            tenantName: tenantNameValue,
            tenantType,
            // Organisation metadata (Xero best practice)
            organisationId,
            shortCode,
            baseCurrency,
            organisationType,
            isDemoCompany,
            accessToken,
            refreshToken,
            refreshTokenIssuedAt: now, // Track when refresh token was first issued
            expiresAt,
            scopes,
            authenticationEventId,
            xeroConnectionId,
            xeroCreatedDateUtc,
            xeroUpdatedDateUtc,
            connectionStatus: "connected",
            isActive: true,
            updatedAt: now,
          })
          .returning();

        if (!createdConnection) {
          throw new Error(
            "Insert operation did not return a Xero connection record"
          );
        }
        connection = createdConnection;
        console.log("Created connection:", connection.id);
      }

      if (!connection) {
        throw new Error("Failed to persist Xero connection record");
      }

      await tx
        .delete(xeroConnection)
        .where(
          and(
            eq(xeroConnection.userId, userId),
            eq(xeroConnection.tenantId, tenantId),
            ne(xeroConnection.id, connection.id)
          )
        );

      console.log(
        "Xero connection created/updated successfully:",
        connection.id
      );
      return connection;
    });
  } catch (error) {
    console.error("Failed to create Xero connection:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      tenantId,
      tenantName: tenantName?.trim() ?? null,
      expiresAt,
      scopesCount: scopes?.length,
    });
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
  authenticationEventId,
  resetRefreshTokenIssuedAt = true,
  expectedUpdatedAt,
}: {
  id: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  authenticationEventId?: string;
  resetRefreshTokenIssuedAt?: boolean;
  expectedUpdatedAt?: Date; // For optimistic locking to prevent race conditions
}): Promise<XeroConnection | null> {
  try {
    const now = new Date();
    const updates: {
      accessToken: string;
      refreshToken: string;
      expiresAt: Date;
      authenticationEventId?: string;
      updatedAt: Date;
      refreshTokenIssuedAt?: Date;
    } = {
      accessToken,
      refreshToken,
      expiresAt,
      authenticationEventId,
      updatedAt: now,
    };

    // CRITICAL: When refreshing tokens, Xero provides a NEW refresh token with a NEW 60-day expiry window
    // This is standard OAuth2 refresh token rotation behavior
    // We MUST reset the issuance timestamp to prevent incorrect expiry calculations
    if (resetRefreshTokenIssuedAt) {
      updates.refreshTokenIssuedAt = now;
    }

    // Optimistic Locking: Prevent race conditions where an older token overwrites a newer one
    // If expectedUpdatedAt is provided, only update if the current updatedAt matches
    // This ensures we don't overwrite tokens that were updated by another process
    const whereConditions = expectedUpdatedAt
      ? and(
          eq(xeroConnection.id, id),
          eq(xeroConnection.updatedAt, expectedUpdatedAt)
        )
      : eq(xeroConnection.id, id);

    const [connection] = await db
      .update(xeroConnection)
      .set(updates)
      .where(whereConditions)
      .returning();

    // If no rows were updated, handle optimistic lock failure or not found
    if (!connection) {
      if (expectedUpdatedAt) {
        console.warn(
          `⚠️ [updateXeroTokens] Optimistic lock failure for connection ${id} - another process updated the token concurrently`
        );
        return null;
      }
      throw new ChatSDKError(
        "bad_request:database",
        "Xero connection not found"
      );
    }

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

export async function activateXeroConnection(
  id: string,
  userId: string
): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // Get the connection to activate and validate ownership
      const [connection] = await tx
        .select()
        .from(xeroConnection)
        .where(
          and(eq(xeroConnection.id, id), eq(xeroConnection.userId, userId))
        )
        .limit(1);

      if (!connection) {
        throw new ChatSDKError(
          "not_found:database",
          "Xero connection not found or does not belong to user"
        );
      }

      // First, deactivate all connections for the user
      await tx
        .update(xeroConnection)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(xeroConnection.userId, connection.userId));

      // Then, activate the specific connection
      await tx
        .update(xeroConnection)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(xeroConnection.id, id));
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to activate Xero connection: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ============================================================================
// Regulatory Document Queries
// ============================================================================

/**
 * Gets regulatory documents with optional filters
 * @param filters - Optional filters for country, category, status, and limit
 * @returns Promise resolving to array of RegulatoryDocument objects
 */
export async function getRegulatoryDocuments(filters?: {
  country?: string;
  category?: string;
  status?: string;
  limit?: number;
}): Promise<RegulatoryDocument[]> {
  try {
    const conditions: SQL[] = [];

    if (filters?.country) {
      conditions.push(eq(regulatoryDocument.country, filters.country));
    }
    if (filters?.category) {
      conditions.push(eq(regulatoryDocument.category, filters.category));
    }
    if (filters?.status) {
      conditions.push(eq(regulatoryDocument.status, filters.status));
    }

    const whereCondition =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    let query = db
      .select()
      .from(regulatoryDocument)
      .orderBy(desc(regulatoryDocument.createdAt));

    if (whereCondition) {
      query = query.where(whereCondition) as typeof query;
    }

    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }

    return await query;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get regulatory documents"
    );
  }
}

/**
 * Gets a single regulatory document by ID
 * @param id - The document ID
 * @returns Promise resolving to RegulatoryDocument or null
 */
export async function getRegulatoryDocumentById(
  id: string
): Promise<RegulatoryDocument | null> {
  try {
    const [doc] = await db
      .select()
      .from(regulatoryDocument)
      .where(eq(regulatoryDocument.id, id))
      .limit(1);

    return doc ?? null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get regulatory document by id"
    );
  }
}

/**
 * Gets a single regulatory document by source URL
 * @param url - The source URL
 * @returns Promise resolving to RegulatoryDocument or null
 */
export async function getRegulatoryDocumentByUrl(
  url: string
): Promise<RegulatoryDocument | null> {
  try {
    const [doc] = await db
      .select()
      .from(regulatoryDocument)
      .where(eq(regulatoryDocument.sourceUrl, url))
      .limit(1);

    return doc ?? null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get regulatory document by url"
    );
  }
}

/**
 * Gets a single scraping job by ID
 * @param id - The job ID
 * @returns Promise resolving to RegulatoryScrapeJob or null
 */
export async function getScrapingJobById(
  id: string
): Promise<RegulatoryScrapeJob | null> {
  try {
    const [job] = await db
      .select()
      .from(regulatoryScrapeJob)
      .where(eq(regulatoryScrapeJob.id, id))
      .limit(1);

    return job ?? null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get scraping job by id"
    );
  }
}

/**
 * Gets recent scraping jobs
 * @param limit - Maximum number of jobs to return (default: 10)
 * @returns Promise resolving to array of RegulatoryScrapeJob objects
 */
export async function getRecentScrapingJobs(
  limit = 10
): Promise<RegulatoryScrapeJob[]> {
  try {
    return await db
      .select()
      .from(regulatoryScrapeJob)
      .orderBy(desc(regulatoryScrapeJob.createdAt))
      .limit(limit);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get recent scraping jobs"
    );
  }
}

/**
 * Gets Xero connections that are expiring within the specified number of days
 * @param daysThreshold - Number of days from now to check for expiring tokens
 * @returns Promise resolving to array of XeroConnection objects with expiring tokens
 */
export async function getExpiringXeroConnections(
  daysThreshold: number
): Promise<XeroConnection[]> {
  try {
    // Calculate threshold date using milliseconds to properly handle fractional days
    // e.g., 0.25 days = 6 hours
    const thresholdDate = new Date(
      Date.now() + daysThreshold * 24 * 60 * 60 * 1000
    );

    return await db
      .select()
      .from(xeroConnection)
      .where(
        and(
          eq(xeroConnection.isActive, true),
          lt(xeroConnection.expiresAt, thresholdDate)
        )
      )
      .orderBy(asc(xeroConnection.expiresAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get expiring Xero connections"
    );
  }
}

export async function getAllActiveXeroConnections(): Promise<XeroConnection[]> {
  try {
    return await db
      .select()
      .from(xeroConnection)
      .where(eq(xeroConnection.isActive, true))
      .orderBy(desc(xeroConnection.updatedAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get all active Xero connections"
    );
  }
}

export async function getAllXeroConnectionsForUser(
  userId: string
): Promise<XeroConnection[]> {
  try {
    return await db
      .select()
      .from(xeroConnection)
      .where(eq(xeroConnection.userId, userId))
      .orderBy(desc(xeroConnection.updatedAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get Xero connections for user"
    );
  }
}

export async function syncXeroConnectionMetadata(
  userId: string,
  xeroConnInfo: {
    id: string;
    authEventId: string;
    tenantId: string;
    tenantType: string;
    tenantName: string | null;
    createdDateUtc: string;
    updatedDateUtc: string;
  }
): Promise<void> {
  try {
    // Find existing connection by userId and tenantId
    const [existingConnection] = await db
      .select()
      .from(xeroConnection)
      .where(
        and(
          eq(xeroConnection.userId, userId),
          eq(xeroConnection.tenantId, xeroConnInfo.tenantId)
        )
      )
      .limit(1);

    if (existingConnection) {
      // Update metadata from Xero API
      await db
        .update(xeroConnection)
        .set({
          xeroConnectionId: xeroConnInfo.id,
          tenantName: xeroConnInfo.tenantName || existingConnection.tenantName,
          tenantType: xeroConnInfo.tenantType,
          authenticationEventId: xeroConnInfo.authEventId,
          xeroCreatedDateUtc: new Date(xeroConnInfo.createdDateUtc),
          xeroUpdatedDateUtc: new Date(xeroConnInfo.updatedDateUtc),
          connectionStatus: "connected",
          lastError: null, // Clear any previous errors on successful sync
          lastErrorType: null,
          lastCorrelationId: null,
          updatedAt: new Date(),
        })
        .where(eq(xeroConnection.id, existingConnection.id));
    }
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to sync Xero connection metadata"
    );
  }
}

export async function updateConnectionError(
  connectionId: string,
  options: {
    error: string;
    errorType?: string;
    correlationId?: string;
    technicalDetails?: string;
  }
): Promise<void> {
  try {
    await db
      .update(xeroConnection)
      .set({
        connectionStatus: "error",
        lastError: options.error, // User-friendly message
        lastErrorDetails: options.technicalDetails || null, // Technical details for debugging
        lastErrorType: options.errorType || null,
        lastCorrelationId: options.correlationId || null,
        updatedAt: new Date(),
      })
      .where(eq(xeroConnection.id, connectionId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update connection error"
    );
  }
}

export async function updateLastApiCall(connectionId: string): Promise<void> {
  try {
    await db
      .update(xeroConnection)
      .set({
        lastApiCallAt: new Date(),
        connectionStatus: "connected",
        updatedAt: new Date(),
      })
      .where(eq(xeroConnection.id, connectionId));
  } catch (_error) {
    // Don't throw error - this is just tracking, shouldn't break API calls
    console.error("Failed to update last API call timestamp:", _error);
  }
}

export async function updateRateLimitInfo(
  connectionId: string,
  rateLimitInfo: {
    minuteRemaining?: number;
    dayRemaining?: number;
    retryAfter?: number;
    problem?: string;
    resetAt?: Date;
  }
): Promise<void> {
  try {
    await db
      .update(xeroConnection)
      .set({
        rateLimitMinuteRemaining: rateLimitInfo.minuteRemaining || null,
        rateLimitDayRemaining: rateLimitInfo.dayRemaining || null,
        rateLimitResetAt: rateLimitInfo.resetAt || null,
        rateLimitProblem: rateLimitInfo.problem || null,
        updatedAt: new Date(),
      })
      .where(eq(xeroConnection.id, connectionId));
  } catch (_error) {
    // Don't throw error - rate limit tracking shouldn't break API calls
    console.error("Failed to update rate limit info:", _error);
  }
}

// ============================================================================
// Agent Trace Queries
// ============================================================================

/**
 * Creates a new agent trace record for tool execution logging
 * @param trace - The agent trace data to insert
 * @returns Promise resolving to the created AgentTrace record
 */
export async function createAgentTrace(
  trace: AgentTraceInsert
): Promise<AgentTrace> {
  try {
    const [createdTrace] = await db
      .insert(agentTrace)
      .values(trace)
      .returning();

    if (!createdTrace) {
      throw new Error("Failed to create agent trace record");
    }

    return createdTrace;
  } catch (error) {
    console.error("Failed to create agent trace:", error);
    // Don't throw error - logging failures shouldn't break agent execution
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create agent trace"
    );
  }
}

/**
 * Gets agent traces for a specific chat
 * @param chatId - The chat ID to filter traces
 * @param limit - Maximum number of traces to return (default: 50)
 * @returns Promise resolving to array of AgentTrace objects
 */
export async function getAgentTracesByChatId(
  chatId: string,
  limit = 50
): Promise<AgentTrace[]> {
  try {
    return await db
      .select()
      .from(agentTrace)
      .where(eq(agentTrace.chatId, chatId))
      .orderBy(desc(agentTrace.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("Failed to get agent traces by chat ID:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get agent traces by chat ID"
    );
  }
}

/**
 * Gets agent traces for a specific message
 * @param messageId - The message ID to filter traces
 * @returns Promise resolving to array of AgentTrace objects
 */
export async function getAgentTracesByMessageId(
  messageId: string
): Promise<AgentTrace[]> {
  try {
    return await db
      .select()
      .from(agentTrace)
      .where(eq(agentTrace.messageId, messageId))
      .orderBy(desc(agentTrace.createdAt));
  } catch (error) {
    console.error("Failed to get agent traces by message ID:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get agent traces by message ID"
    );
  }
}

/**
 * Gets agent traces by tool name
 * @param toolName - The tool name to filter traces
 * @param limit - Maximum number of traces to return (default: 100)
 * @returns Promise resolving to array of AgentTrace objects
 */
export async function getAgentTracesByToolName(
  toolName: string,
  limit = 100
): Promise<AgentTrace[]> {
  try {
    return await db
      .select()
      .from(agentTrace)
      .where(eq(agentTrace.toolName, toolName))
      .orderBy(desc(agentTrace.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("Failed to get agent traces by tool name:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get agent traces by tool name"
    );
  }
}

/**
 * Gets agent traces by status
 * @param status - The status to filter traces ('success' or 'error')
 * @param limit - Maximum number of traces to return (default: 100)
 * @returns Promise resolving to array of AgentTrace objects
 */
export async function getAgentTracesByStatus(
  status: "success" | "error",
  limit = 100
): Promise<AgentTrace[]> {
  try {
    return await db
      .select()
      .from(agentTrace)
      .where(eq(agentTrace.status, status))
      .orderBy(desc(agentTrace.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("Failed to get agent traces by status:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get agent traces by status"
    );
  }
}

/**
 * Gets recent agent traces across all chats
 * @param limit - Maximum number of traces to return (default: 100)
 * @returns Promise resolving to array of AgentTrace objects
 */
export async function getRecentAgentTraces(limit = 100): Promise<AgentTrace[]> {
  try {
    return await db
      .select()
      .from(agentTrace)
      .orderBy(desc(agentTrace.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("Failed to get recent agent traces:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get recent agent traces"
    );
  }
}

// ============================================================================
// AR Follow-up Context Queries
// ============================================================================

/**
 * Saves AR follow-up context data for caching
 * @param data - The context data to save
 * @returns Promise resolving to the context ID
 */
export async function saveArFollowUpContext(
  data: ArFollowUpContextInsert
): Promise<string> {
  try {
    const [context] = await db
      .insert(arFollowUpContext)
      .values(data)
      .returning();

    if (!context) {
      throw new Error("Failed to create AR follow-up context");
    }

    return context.id;
  } catch (error) {
    console.error("Failed to save AR follow-up context:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save AR follow-up context"
    );
  }
}

/**
 * Gets AR follow-up context by ID
 * @param contextId - The context ID
 * @param userId - The user ID for authorization
 * @returns Promise resolving to ArFollowUpContext or null
 */
export async function getArFollowUpContext(
  contextId: string,
  userId: string
): Promise<ArFollowUpContext | null> {
  try {
    const [context] = await db
      .select()
      .from(arFollowUpContext)
      .where(
        and(
          eq(arFollowUpContext.id, contextId),
          eq(arFollowUpContext.userId, userId),
          gt(arFollowUpContext.expiresAt, new Date())
        )
      )
      .limit(1);

    return context ?? null;
  } catch (error) {
    console.error("Failed to get AR follow-up context:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get AR follow-up context"
    );
  }
}

/**
 * Deletes expired AR follow-up contexts
 * @returns Promise resolving to the number of deleted contexts
 */
export async function deleteExpiredArFollowUpContexts(): Promise<number> {
  try {
    const result = await db
      .delete(arFollowUpContext)
      .where(lt(arFollowUpContext.expiresAt, new Date()))
      .returning();

    return result.length;
  } catch (error) {
    console.error("Failed to delete expired AR follow-up contexts:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete expired AR follow-up contexts"
    );
  }
}
