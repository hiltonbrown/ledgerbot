import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
  type UIMessageStreamWriter,
} from "ai";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import { getUserSettings } from "@/app/(settings)/api/user/data";
import { buildUserContext } from "@/lib/ai/context-manager";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import {
  type ChatModel,
  chatModelIds,
  DEFAULT_CHAT_MODEL,
  isReasoningModelId,
} from "@/lib/ai/models";
import {
  buildLedgerbotSystemPrompt,
  type RequestHints,
} from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { defaultSelectedTools, type ToolId } from "@/lib/ai/tools";
import { abn_get_details } from "@/lib/ai/tools/abn-get-details";
import { abn_search_entity } from "@/lib/ai/tools/abn-search-entity";
import { abn_validate_xero_contact } from "@/lib/ai/tools/abn-validate-xero-contact";
import { abn_verify_xero_invoice } from "@/lib/ai/tools/abn-verify-xero-invoice";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { createXeroTools, xeroToolNames } from "@/lib/ai/tools/xero-tools";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  DEFAULT_CHAT_VISIBILITY,
  sanitizeVisibility,
  type VisibilityType,
} from "@/lib/chat/visibility";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  db,
  deleteChatById,
  getActiveXeroConnection,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChatIfNotExists,
  saveMessages,
  updateChatLastContextById,
  updateChatVisiblityById,
} from "@/lib/db/queries";
import * as schema from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import {
  createPublisherWithTtl,
  createSubscriberWrapper,
  getRedisClients,
  streamBufferTtlSeconds,
} from "@/lib/redis/config";

import type { ChatMessage } from "@/lib/types";
import type { UserType } from "@/lib/types/auth";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;
let streamContextInitialization: Promise<ResumableStreamContext | null> | null =
  null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err
      );
      return; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 } // 24 hours
);

/**
 * Lazily initializes the resumable stream context backed by Redis.
 *
 * Returns null when Redis is unavailable so the API can gracefully fall back to
 * non-resumable streaming.
 */
export async function getStreamContext(): Promise<ResumableStreamContext | null> {
  if (globalStreamContext) {
    return globalStreamContext;
  }

  if (streamContextInitialization) {
    return streamContextInitialization;
  }

  streamContextInitialization = (async () => {
    const redisClients = await getRedisClients();

    if (!redisClients) {
      return null;
    }

    try {
      const context = createResumableStreamContext({
        waitUntil: after,
        keyPrefix: "ledgerbot",
        subscriber: createSubscriberWrapper(redisClients.subscriber),
        publisher: createPublisherWithTtl(redisClients.publisher),
      });

      console.log(
        `[redis] Resumable streams enabled (ttl=${streamBufferTtlSeconds}s)`
      );

      globalStreamContext = context;
      return context;
    } catch (error) {
      console.error(
        "[redis] Failed to initialize resumable stream context",
        error
      );
      return null;
    }
  })();

  const context = await streamContextInitialization;

  if (!context) {
    streamContextInitialization = null;
  }

  return context;
}

function includeAttachmentText(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) => {
    const newParts: any[] = [];

    for (const part of message.parts) {
      if (
        part.type === "file" &&
        "extractedText" in part &&
        part.extractedText &&
        !part.mediaType?.startsWith("image/")
      ) {
        // Convert file parts with extracted text to text parts
        // AI doesn't support file URLs, so we send the extracted text instead
        // This includes PDFs, DOCX, CSV, and XLSX files
        newParts.push({
          type: "text" as const,
          text: `[Attachment: ${(part as any).name ?? "file"}]\n${part.extractedText}\n[End Attachment]`,
        });
      } else {
        newParts.push(part);
      }
    }

    return {
      ...message,
      parts: newParts,
    };
  });
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;
  let json: any;

  try {
    json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
    console.error("Schema validation failed:", error);
    if (json) {
      console.error("Request body:", JSON.stringify(json, null, 2));
    }
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel: requestedChatModel,
      selectedVisibilityType,
      streamReasoning: requestedStreamReasoning,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel?: ChatModel["id"];
      selectedVisibilityType: VisibilityType;
      streamReasoning?: boolean;
    } = requestBody;

    const sanitizedVisibility = sanitizeVisibility(selectedVisibilityType);

    const user = await getAuthUser();

    if (!user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    // Fetch user settings for custom system prompt with template substitution
    const userSettings = await getUserSettings();

    // Extract AI preferences with fallbacks to system defaults
    const defaultModelId =
      userSettings.personalisation.defaultModel || DEFAULT_CHAT_MODEL;
    const defaultReasoning =
      userSettings.personalisation.defaultReasoning ?? false;

    // Apply user preferences as fallbacks when not explicitly provided
    let selectedChatModel = requestedChatModel || defaultModelId;
    const streamReasoning = requestedStreamReasoning ?? defaultReasoning;

    // Validate that the final model is valid, fall back to system default if not
    if (!chatModelIds.includes(selectedChatModel)) {
      console.error(
        `[chat/route] Invalid model ID: ${selectedChatModel}, falling back to ${DEFAULT_CHAT_MODEL}`
      );
      selectedChatModel = DEFAULT_CHAT_MODEL;
    }

    const userType: UserType = user.type;

    const messageCount = await getMessageCountByUserId({
      id: user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const chat = await getChatById({ id });

    if (chat) {
      if (chat.userId !== user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }

      if (chat.visibility !== DEFAULT_CHAT_VISIBILITY) {
        await updateChatVisiblityById({
          chatId: chat.id,
          visibility: DEFAULT_CHAT_VISIBILITY,
        });
      }
    } else {
      const title = await generateTitleFromUserMessage({
        message,
        modelId: selectedChatModel,
      });

      await saveChatIfNotExists({
        id,
        userId: user.id,
        title,
        visibility: sanitizedVisibility,
      });
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const userContext = await buildUserContext(user.id);

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
      userContext,
    };

    // Update any documents that were created without chatId
    const documentIds = message.parts
      .filter(
        (part) =>
          part.type === "file" && "documentId" in part && part.documentId
      )
      .map((part) => (part as any).documentId)
      .filter(Boolean);

    if (documentIds.length > 0) {
      try {
        await db
          .update(schema.document)
          .set({ chatId: id })
          .where(
            and(
              eq(schema.document.userId, user.id),
              inArray(schema.document.id, documentIds),
              isNull(schema.document.chatId)
            )
          )
          .returning();
      } catch (error) {
        console.warn("Failed to update document chatIds:", error);
      }
    }

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
          confidence: null,
          citations: null,
          needsReview: null,
        },
      ],
    });

    // NOTE: Spreadsheet document creation and assistant messages now happen
    // server-side in /api/files/upload. This eliminates race conditions.

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    let finalMergedUsage: AppUsage | undefined;

    // Always send reasoning parts to the client for all models
    // Reasoning models (Claude with <think> tags) will have reasoning extracted by middleware
    // Non-reasoning models won't have reasoning parts, but sendReasoning should still be true
    const sendReasoning = true;
    // Always show reasoning steps when available
    const preferenceForDisplay = true;

    const _respondWithManualStream = async (
      build: (
        writer: UIMessageStreamWriter<ChatMessage>,
        helpers: {
          registerAttachments: (
            messageId: string,
            attachments: unknown[]
          ) => void;
        }
      ) => Promise<void>
    ) => {
      const attachmentMap = new Map<string, unknown[]>();

      const stream = createUIMessageStream<ChatMessage>({
        execute: async ({ writer }) => {
          try {
            await build(writer, {
              registerAttachments: (messageId, attachments) => {
                if (attachments && attachments.length > 0) {
                  attachmentMap.set(messageId, attachments);
                }
              },
            });
          } catch (error) {
            console.error("[workflow] Failed", error);
            // Error is logged but not returned to maintain stream
          }
        },
        generateId: generateUUID,
        onFinish: async ({ messages }) => {
          await saveMessages({
            messages: messages.map((currentMessage) => ({
              id: currentMessage.id,
              role: currentMessage.role,
              parts: currentMessage.parts,
              createdAt: new Date(),
              attachments: attachmentMap.get(currentMessage.id) ?? [],
              chatId: id,
              confidence: null,
              citations: null,
              needsReview: null,
            })),
          });
        },
      });

      const streamContext = await getStreamContext();
      const sseStream = stream.pipeThrough(new JsonToSseTransformStream());

      if (streamContext) {
        const [resumableSource, fallbackSource] = sseStream.tee();

        try {
          const resumableStream = await streamContext.resumableStream(
            streamId,
            () => resumableSource
          );

          if (resumableStream) {
            return new Response(resumableStream);
          }

          console.warn(
            "[redis] Resumable deep-research stream returned null, falling back",
            { streamId }
          );
          return new Response(fallbackSource);
        } catch (redisError) {
          console.error(
            "[redis] Failed deep-research resumable stream, using fallback",
            { streamId, error: redisError }
          );
          return new Response(fallbackSource);
        }
      }

      return new Response(sseStream);
    };

    // Debug logging for API reasoning state
    if (!isProductionEnvironment) {
      console.log("API reasoning state:", {
        selectedChatModel,
        isReasoningModel: isReasoningModelId(selectedChatModel),
        streamReasoning,
        preferenceForDisplay,
        sendReasoning,
      });
    }

    // Check if user has Xero connection
    const xeroConnection = await getActiveXeroConnection(user.id);
    const xeroTools = xeroConnection ? createXeroTools(user.id) : {};

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        // Always use all default tools
        const activeTools: ToolId[] = defaultSelectedTools;

        // Add Xero tool names to active tools if connection exists
        // Cast to string[] since Xero tools are dynamically added
        const finalActiveTools: string[] = xeroConnection
          ? [...activeTools, ...xeroToolNames]
          : activeTools;

        const xeroOrgSnapshot = xeroConnection
          ? {
              organisationName: xeroConnection.tenantName,
              organisationType: xeroConnection.organisationType,
              isDemoCompany: xeroConnection.isDemoCompany,
              baseCurrency: xeroConnection.baseCurrency,
              xeroShortCode: xeroConnection.shortCode,
            }
          : undefined;

        const system = await buildLedgerbotSystemPrompt({
          requestHints,
          activeTools: finalActiveTools,
          userSystemPrompt: undefined, // Don't use the old full prompt as a fallback
          userId: user.id,
          userSettings,
          xeroOrgSnapshot,
        });

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system,
          messages: convertToModelMessages(includeAttachmentText(uiMessages)),
          stopWhen: stepCountIs(5),
          experimental_activeTools: finalActiveTools as any,
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: {
            getWeather,
            createDocument: createDocument({
              user,
              dataStream,
              modelId: selectedChatModel,
              chatId: id,
            }),
            updateDocument: updateDocument({
              user,
              dataStream,
              modelId: selectedChatModel,
            }),
            requestSuggestions: requestSuggestions({
              user,
              dataStream,
              modelId: selectedChatModel,
            }),
            abn_search_entity,
            abn_get_details,
            abn_validate_xero_contact: abn_validate_xero_contact({
              userId: user.id,
            }),
            abn_verify_xero_invoice: abn_verify_xero_invoice({
              userId: user.id,
            }),
            ...xeroTools,
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
          onFinish: async ({ usage }) => {
            try {
              const providers = await getTokenlensCatalog();
              const modelId =
                myProvider.languageModel(selectedChatModel).modelId;
              if (!modelId) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              if (!providers) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              const summary = getUsage({ modelId, usage, providers });
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            } catch (err) {
              console.warn("TokenLens enrichment failed", err);
              finalMergedUsage = usage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            }
          },
        });

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning,
            messageMetadata: () => ({
              createdAt: new Date().toISOString(),
              showReasoningPreference: preferenceForDisplay,
            }),
          })
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((currentMessage) => ({
            id: currentMessage.id,
            role: currentMessage.role,
            parts: currentMessage.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
            confidence: null,
            citations: null,
            needsReview: null,
          })),
        });

        if (finalMergedUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }
        }
      },
      onError: () => {
        return "Oops, an error occurred!";
      },
    });

    const streamContext = await getStreamContext();
    const sseStream = stream.pipeThrough(new JsonToSseTransformStream());

    if (streamContext) {
      const [resumableSource, fallbackSource] = sseStream.tee();

      try {
        const resumableStream = await streamContext.resumableStream(
          streamId,
          () => resumableSource
        );

        if (resumableStream) {
          return new Response(resumableStream);
        }

        console.warn(
          "[redis] Resumable stream returned null, falling back to direct stream",
          { streamId }
        );
        return new Response(fallbackSource);
      } catch (redisError) {
        console.error(
          "[redis] Failed to start resumable stream, falling back to direct stream",
          { streamId, error: redisError }
        );
        return new Response(fallbackSource);
      }
    }

    return new Response(sseStream);
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const user = await getAuthUser();

  if (!user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
