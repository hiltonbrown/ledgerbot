"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { ChatHeader } from "@/components/chat-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { isReasoningModelId } from "@/lib/ai/models";
import { defaultSelectedTools, type ToolId } from "@/lib/ai/tools";
import type { Vote } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { Artifact } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { toast } from "./toast";
import type { VisibilityType } from "@/lib/chat/visibility";

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  autoResume,
  initialLastContext,
  suggestions,
  initialDefaultReasoning,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
  initialLastContext?: AppUsage;
  suggestions?: Array<{
    id: string;
    text: string;
    enabled: boolean;
    order: number;
  }>;
  initialDefaultReasoning?: boolean;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>("");
  const [usage, setUsage] = useState<AppUsage | undefined>(initialLastContext);
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
  const [currentModelId, setCurrentModelId] = useState(initialChatModel);
  const [selectedTools, setSelectedTools] =
    useState<ToolId[]>(defaultSelectedTools);
  const [reasoningPreferences, setReasoningPreferences] = useState<
    Record<string, boolean>
  >(() =>
    isReasoningModelId(initialChatModel)
      ? { [initialChatModel]: initialDefaultReasoning ?? true }
      : {}
  );
  const currentModelIdRef = useRef(currentModelId);
  const selectedToolsRef = useRef(selectedTools);

  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  const reasoningPreferencesRef = useRef(reasoningPreferences);

  useEffect(() => {
    selectedToolsRef.current = selectedTools;
  }, [selectedTools]);

  useEffect(() => {
    reasoningPreferencesRef.current = reasoningPreferences;
  }, [reasoningPreferences]);

  const currentReasoningEnabled = useMemo(() => {
    if (!isReasoningModelId(currentModelId)) {
      return false;
    }

    const storedPreference = reasoningPreferences[currentModelId];

    return storedPreference ?? initialDefaultReasoning ?? true;
  }, [currentModelId, reasoningPreferences, initialDefaultReasoning]);

  const getReasoningPreferenceForModel = (modelId: string) => {
    if (!isReasoningModelId(modelId)) {
      return false;
    }

    const storedPreference = reasoningPreferencesRef.current[modelId];

    return storedPreference ?? initialDefaultReasoning ?? true;
  };

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
        [modelId]: initialDefaultReasoning ?? true,
      };
    });
  };

  const handleReasoningPreferenceChange = (enabled: boolean) => {
    const modelId = currentModelIdRef.current;

    if (!isReasoningModelId(modelId)) {
      return;
    }

    setReasoningPreferences((previousPreferences) => ({
      ...previousPreferences,
      [modelId]: enabled,
    }));
  };

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
    clearError,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
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
            selectedTools: selectedToolsRef.current,
            streamReasoning: isReasoningModelId(currentModelIdRef.current),
            showReasoningPreference: getReasoningPreferenceForModel(
              currentModelIdRef.current
            ),
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      console.log(
        "[debug] Client received data part:",
        dataPart.type,
        dataPart
      );
      setDataStream((ds) => {
        const newArray = ds ? [...ds] : [];
        newArray.push(dataPart as any);
        return newArray;
      });
      if (dataPart.type === "data-usage") {
        setUsage(dataPart.data as AppUsage);
      }
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        // Check if it's a credit card error
        if (
          error.message?.includes("AI Gateway requires a valid credit card")
        ) {
          setShowCreditCardAlert(true);
        } else {
          toast({
            type: "error",
            description: error.message,
          });
        }
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, "", `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Vote[]>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher
  );

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  return (
    <>
      <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
        <ChatHeader
          chatId={id}
          isReadonly={isReadonly}
        />

        <Messages
          chatId={id}
          isArtifactVisible={isArtifactVisible}
          isReadonly={isReadonly}
          messages={messages}
          regenerate={regenerate}
          selectedModelId={initialChatModel}
          setMessages={setMessages}
          status={status}
          votes={votes}
        />

        <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
          {!isReadonly && (
            <MultimodalInput
              attachments={attachments}
              chatId={id}
              clearError={clearError}
              input={input}
              isReasoningEnabled={currentReasoningEnabled}
              messages={messages}
              onModelChange={handleModelChange}
              onReasoningChange={handleReasoningPreferenceChange}
              onToolsChange={setSelectedTools}
              selectedModelId={currentModelId}
              selectedTools={selectedTools}
              selectedVisibilityType={visibilityType}
              sendMessage={sendMessage}
              setAttachments={setAttachments}
              setInput={setInput}
              setMessages={setMessages}
              status={status}
              stop={stop}
              suggestions={suggestions}
              usage={usage}
            />
          )}
        </div>
      </div>

      <Artifact
        attachments={attachments}
        chatId={id}
        clearError={clearError}
        input={input}
        isReadonly={isReadonly}
        isReasoningEnabled={currentReasoningEnabled}
        messages={messages}
        onReasoningChange={handleReasoningPreferenceChange}
        regenerate={regenerate}
        selectedModelId={currentModelId}
        selectedVisibilityType={visibilityType}
        sendMessage={sendMessage}
        setAttachments={setAttachments}
        setInput={setInput}
        setMessages={setMessages}
        status={status}
        stop={stop}
        votes={votes}
      />

      <AlertDialog
        onOpenChange={setShowCreditCardAlert}
        open={showCreditCardAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              This application requires{" "}
              {process.env.NODE_ENV === "production" ? "the owner" : "you"} to
              activate Vercel AI Gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank"
                );
                window.location.href = "/";
              }}
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
