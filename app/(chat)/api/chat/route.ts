import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import type { VisibilityType } from "@/components/visibility-selector";
import { buildUserContext } from "@/lib/ai/context-manager";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { type ChatModel, isReasoningModelId } from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { defaultSelectedTools, type ToolId } from "@/lib/ai/tools";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { createXeroTools, xeroToolNames } from "@/lib/ai/tools/xero-tools";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getActiveXeroConnection,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatLastContextById,
} from "@/lib/db/queries";
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
    const newParts = message.parts.map((part) => {
      if (
        part.type === "file" &&
        "extractedText" in part &&
        part.extractedText &&
        !part.mediaType?.startsWith("image/")
      ) {
        // Replace file parts with extracted text for non-image files
        return {
          type: "text" as const,
          text: `[Attachment: ${(part as any).name ?? "file"}]\n${part.extractedText}\n[End Attachment]`,
        };
      }
      return part;
    });

    return {
      ...message,
      parts: newParts,
    };
  });
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
      selectedTools,
      streamReasoning,
      showReasoningPreference,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel["id"];
      selectedVisibilityType: VisibilityType;
      selectedTools?: string[];
      streamReasoning?: boolean;
      showReasoningPreference?: boolean;
    } = requestBody;

    const user = await getAuthUser();

    if (!user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
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
    } else {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: user.id,
        title,
        visibility: selectedVisibilityType,
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

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    let finalMergedUsage: AppUsage | undefined;

    const sendReasoning = isReasoningModelId(selectedChatModel)
      ? true
      : (streamReasoning ?? false);
    const preferenceForDisplay = showReasoningPreference ?? true;

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
      execute: ({ writer: dataStream }) => {
        const activeTools: ToolId[] =
          selectedTools && selectedTools.length > 0
            ? (selectedTools as ToolId[])
            : defaultSelectedTools;

        // Add Xero tool names to active tools if connection exists
        // Cast to string[] since Xero tools are dynamically added
        const finalActiveTools: string[] = xeroConnection
          ? [...activeTools, ...xeroToolNames]
          : activeTools;

        console.log(
          "[debug] Starting streamText with model:",
          selectedChatModel,
          { chatId: id, streamId }
        );

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({
            requestHints,
            activeTools: finalActiveTools,
          }),
          messages: convertToModelMessages(includeAttachmentText(uiMessages)),
          stopWhen: stepCountIs(5),
          experimental_activeTools: finalActiveTools as any,
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: {
            getWeather,
            createDocument: createDocument({
              user,
              dataStream,
            }),
            updateDocument: updateDocument({
              user,
              dataStream,
            }),
            requestSuggestions: requestSuggestions({
              user,
              dataStream,
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

        console.log("[debug] Merging stream to dataStream", {
          chatId: id,
          streamId,
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

    console.log("[debug] Stream created, context available:", !!streamContext, {
      streamId,
      chatId: id,
    });

    if (streamContext) {
      const [resumableSource, fallbackSource] = sseStream.tee();

      try {
        const resumableStream = await streamContext.resumableStream(
          streamId,
          () => resumableSource
        );

        if (resumableStream) {
          console.log("[debug] Returning resumable stream", { streamId });
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

    console.log("[debug] No stream context, returning direct SSE stream", {
      streamId,
    });
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
