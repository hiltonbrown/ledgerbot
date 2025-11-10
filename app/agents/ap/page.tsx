"use client";

import {
  CreditCard, // Changed from DollarSign for AP agent
  Loader2,
  MessageSquare,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { generateUUID } from "@/lib/utils";

// Simplified ChatMessage type for AP agent
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  id: string;
  sources?: string[];
};

type AgentChatResponse = {
  text: string;
  error?: string;
  message?: string;
};

type AgentLoadSuccess = {
  docId: string; // This might need to be changed to something like 'apSessionId' or similar
  meta?: {
    contextFileId?: string;
    tokenEstimate?: number;
    fileName?: string;
    warnings?: string[];
  };
};

export default function AccountsPayableAgentPage() {
  const [contextFileId, setContextFileId] = useState<string | null>(null); // Still useful for chat context
  const [apSessionId, setApSessionId] = useState<string | null>(null); // Renamed from arSessionId
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [questionInput, setQuestionInput] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [agentReady, setAgentReady] = useState(false);
  const [isPreparingAgent, setIsPreparingAgent] = useState(false);
  const [agentStatus, setAgentStatus] = useState("Idle");
  const [agentContextMeta, setAgentContextMeta] =
    useState<AgentLoadSuccess | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);

  const appendWarnings = useCallback((messages?: string[]) => {
    if (!messages || messages.length === 0) {
      return;
    }
    setWarnings((current) => {
      const unique = new Set(current);
      for (const message of messages.filter((message) =>
        Boolean(message?.trim())
      )) {
        unique.add(message.trim());
      }
      return Array.from(unique);
    });
  }, []);

  // Restore conversation from Redis cache on mount (if available)
  useEffect(() => {
    async function restoreConversation() {
      if (!contextFileId) {
        return;
      }

      try {
        // API endpoint for AP conversation might be different
        const response = await fetch(
          `/api/agents/ap/conversation?contextFileId=${contextFileId}`
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (data.cached && data.data) {
          console.log(
            `[ap-agent] Restoring conversation with ${data.data.messages.length} messages`
          );

          setApSessionId(data.data.apSessionId); // Renamed from arSessionId

          // Restore chat messages
          const restoredMessages: ChatMessage[] = data.data.messages.map(
            (msg: ChatMessage, index: number) => ({
              ...msg,
              id: generateUUID(),
            })
          );
          setChatMessages(restoredMessages);
        }

        if (contextFileId && data.data?.apSessionId) {
          // Renamed from arSessionId
          void prepareApAgent(contextFileId, data.data.apSessionId);
        }
      } catch (error) {
        console.error("[ap-agent] Failed to restore conversation:", error);
      }
    }

    restoreConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextFileId]);

  const resetWorkflow = useCallback(() => {
    setContextFileId(null);
    setApSessionId(null); // Renamed from arSessionId
    setChatMessages([]);
    setQuestionInput("");
    setWarnings([]);
    setError(null);
    setAgentReady(false);
    setAgentContextMeta(null);
    setAgentStatus("Idle");
    setIsPreparingAgent(false);
  }, []);

  const prepareApAgent = useCallback(
    // Renamed from prepareArAgent
    async (contextId: string, apSessionIdValue?: string) => {
      // Renamed from arSessionIdValue
      setIsPreparingAgent(true);
      setAgentReady(false);
      setAgentStatus("Initializing AP agent..."); // Updated status message

      try {
        const response = await fetch("/api/agents/ap", {
          // Updated API endpoint
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "load",
            contextFileId: contextId,
            apSessionId: apSessionIdValue, // Renamed from arSessionId
          }),
        });

        const data: { doc?: AgentLoadSuccess; error?: string } =
          await response.json();

        if (!response.ok || !data.doc) {
          throw new Error(data.error ?? "Failed to prepare the AP agent."); // Updated error message
        }

        setAgentContextMeta(data.doc);
        setAgentReady(true);
        setAgentStatus(`AP Agent ready for session ${data.doc.docId}`); // Updated status message
        const warningList =
          (data.doc.meta?.warnings as string[] | undefined) ?? [];
        appendWarnings(warningList);
      } catch (prepError) {
        const message =
          prepError instanceof Error
            ? prepError.message
            : "Unable to prepare the AP agent."; // Updated error message
        setAgentStatus(message);
        setError(message);
      } finally {
        setIsPreparingAgent(false);
      }
    },
    [appendWarnings]
  );

  const handleAskQuestion = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmed = questionInput.trim();
      if (!trimmed) {
        return;
      }

      setError(null);

      const historyPayload: ChatMessage[] = chatMessages.map(
        ({ id, role, content, sources }) => ({
          id,
          role,
          content,
          sources,
        })
      );

      const userMessage: ChatMessage = {
        id: generateUUID(),
        role: "user",
        content: trimmed,
      };

      const assistantMessageId = generateUUID();

      setChatMessages((current) => [
        ...current,
        userMessage,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        },
      ]);
      setQuestionInput("");
      setIsAnswering(true);

      try {
        const response = await fetch("/api/agents/ap", {
          // Updated API endpoint
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "chat",
            contextFileId,
            apSessionId, // Renamed from arSessionId
            message: trimmed,
            history: historyPayload,
            stream: true,
          }),
        });

        const contentType = response.headers.get("content-type") ?? "";

        const updateAssistantMessage = (updater: (prev: string) => string) => {
          setChatMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    content: updater(message.content ?? ""),
                  }
                : message
            )
          );
        };

        if (contentType.includes("text/event-stream")) {
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("Streaming is not supported in this environment.");
          }

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() ?? "";

            for (const rawEvent of events) {
              const lines = rawEvent.split("\n");
              const eventLine = lines.find((line) =>
                line.startsWith("event: ")
              );
              const dataLine = lines.find((line) => line.startsWith("data: "));
              const eventName = eventLine?.slice(7) ?? "";
              if (!dataLine) {
                continue;
              }
              const payload = JSON.parse(
                dataLine.slice(6)
              ) as AgentChatResponse;

              if (eventName === "delta" && typeof payload.text === "string") {
                updateAssistantMessage((prev) => `${prev}${payload.text}`);
              } else if (eventName === "final") {
                updateAssistantMessage(() => payload.text ?? "");
              } else if (eventName === "error") {
                const fallback =
                  payload.error ??
                  "I wasn't able to answer that question. Please try again.";
                updateAssistantMessage(() => fallback);
              }
            }
          }

          setIsAnswering(false);
          return;
        }

        const data: AgentChatResponse = await response.json();

        if (!response.ok || typeof data.text !== "string") {
          throw new Error(data.error ?? "Unable to answer the question.");
        }

        updateAssistantMessage(() => data.text);
      } catch (answerError) {
        const message =
          answerError instanceof Error
            ? answerError.message
            : "Please try again in a few moments.";
        setChatMessages((current) =>
          current.map((chatMessage) =>
            chatMessage.id === assistantMessageId
              ? {
                  ...chatMessage,
                  content: `I wasn't able to answer that question. ${message}`,
                }
              : chatMessage
          )
        );
      } finally {
        setIsAnswering(false);
      }
    },
    [chatMessages, apSessionId, contextFileId, questionInput] // Updated dependencies
  );

  const canChat = Boolean(contextFileId && agentReady);
  return (
    <div className="space-y-10">
      <Card>
        <CardHeader className="flex flex-col gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" /> {/* Changed icon */}
            Accounts Payable Agent
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Manage vendor bills, approval workflows, and payment runs.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4"></div>
            <div className="space-y-4">
              <div className="rounded-md border bg-background p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">
                      Chat with AP Agent
                    </h3>
                    <Badge>
                      {agentReady ? "Agent ready" : "Sync required"}
                    </Badge>
                  </div>
                  <Button
                    disabled={!contextFileId || isPreparingAgent}
                    onClick={() => {
                      if (!contextFileId) {
                        return;
                      }
                      void prepareApAgent(
                        contextFileId,
                        apSessionId ?? undefined // Renamed from arSessionId
                      );
                    }}
                    size="sm"
                    variant="outline"
                  >
                    {isPreparingAgent ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Syncing
                      </>
                    ) : (
                      "Sync AP Session" // Updated button text
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-muted-foreground text-xs">
                  {agentReady ? agentStatus : `Agent status: ${agentStatus}`}
                  {agentContextMeta?.meta?.tokenEstimate
                    ? ` · est. ${agentContextMeta.meta.tokenEstimate} tokens`
                    : ""}
                </p>
                <ScrollArea className="mt-3 h-72 rounded-md border bg-muted/20 p-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      Ask natural-language questions to manage vendor bills,
                      approval workflows, and payment runs.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {chatMessages.map((message) => (
                        <div
                          className={
                            "rounded-md border p-3 text-sm leading-relaxed"
                          }
                          key={message.id}
                        >
                          <p className="font-semibold text-muted-foreground text-xs uppercase">
                            {message.role === "assistant" ? "LedgerBot" : "You"}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <form className="mt-3 space-y-2" onSubmit={handleAskQuestion}>
                  {!agentReady && (
                    <p className="text-muted-foreground text-xs">
                      Sync the AP session to activate LedgerBot before asking a
                      question.
                    </p>
                  )}
                  <Textarea
                    disabled={!canChat || isAnswering}
                    onChange={(event) => setQuestionInput(event.target.value)}
                    placeholder="e.g. What are the unpaid bills for vendor XYZ?"
                    rows={3}
                    value={questionInput}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-xs">
                      LedgerBot will use available AP data to answer your
                      questions.
                    </p>
                    <Button
                      disabled={
                        !canChat ||
                        isAnswering ||
                        questionInput.trim().length === 0
                      }
                      type="submit"
                    >
                      {isAnswering ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Thinking
                        </>
                      ) : (
                        "Ask"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
