"use client";

import {
  AlertTriangle,
  DollarSign, // Changed from Sparkles for AR agent
  FileText,
  Loader2,
  MessageSquare,
  Upload,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
// Removed PdfChatMessage, PdfGuidedQuestion, PdfSectionSummary types as they are not needed for AR
// import type {
//   PdfChatMessage,
//   PdfGuidedQuestion,
//   PdfSectionSummary,
// } from "@/lib/agents/docmanagement/types";
import { generateUUID } from "@/lib/utils";

// Simplified ChatMessage type for AR agent
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  id: string;
  sources?: string[];
};

// Removed UploadResponse, SummarizeResponse, QuestionsResponse types
// type UploadResponse = {
//   contextFileId: string;
//   fileName: string;
//   size: number;
//   status: "ready" | "needs_ocr";
//   tokenEstimate?: number;
//   usedOCR?: boolean;
//   warnings?: string[];
// };

// type SummarizeResponse = {
//   documentId: string;
//   summary: string;
//   highlights: string[];
//   sections: PdfSectionSummary[];
//   warnings: string[];
//   usage?: {
//     totalBilledTokens?: number;
//     totalInputTokens?: number;
//     totalOutputTokens?: number;
//   };
// };

// type QuestionsResponse = {
//   documentId: string;
//   questions: PdfGuidedQuestion[];
//   warnings: string[];
// };

type AgentChatResponse = {
  text: string;
  error?: string;
  message?: string;
};

type AgentLoadSuccess = {
  docId: string; // This might need to be changed to something like 'arSessionId' or similar
  pageCount?: number; // Not relevant for AR agent
  meta?: {
    contextFileId?: string;
    tokenEstimate?: number;
    fileName?: string;
    warnings?: string[];
  };
};

// Removed formatFileSize function as it's not needed
// function formatFileSize(bytes: number) {
//   if (bytes < 1024) {
//     return `${bytes} B`;
//   }
//   if (bytes < 1024 * 1024) {
//     return `${(bytes / 1024).toFixed(1)} KB`;
//   }
//   return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
// }

export default function AccountsReceivableAgentPage() {
  // Removed fileInputRef
  // const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [contextFileId, setContextFileId] = useState<string | null>(null); // Still useful for chat context
  const [arSessionId, setArSessionId] = useState<string | null>(null); // Renamed from documentId
  // Removed summary, highlights, sections, questions states
  // const [summary, setSummary] = useState("");
  // const [highlights, setHighlights] = useState<string[]>([]);
  // const [sections, setSections] = useState<PdfSectionSummary[]>([]);
  // const [questions, setQuestions] = useState<PdfGuidedQuestion[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [questionInput, setQuestionInput] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [agentReady, setAgentReady] = useState(false);
  const [isPreparingAgent, setIsPreparingAgent] = useState(false);
  const [agentStatus, setAgentStatus] = useState("Idle");
  const [agentContextMeta, setAgentContextMeta] =
    useState<AgentLoadSuccess | null>(null);
  // Removed uploadMetadata, summaryUsage, isUploading, isSummarizing, isGeneratingQuestions, summaryProgress, summaryStage
  // const [uploadMetadata, setUploadMetadata] = useState<{
  //   fileName: string;
  //   size: number;
  //   tokenEstimate?: number;
  // } | null>(null);
  // const [summaryUsage, setSummaryUsage] = useState<
  //   SummarizeResponse["usage"] | null
  // >(null);
  // const [isUploading, setIsUploading] = useState(false);
  // const [isSummarizing, setIsSummarizing] = useState(false);
  // const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  // const [summaryProgress, setSummaryProgress] = useState(0);
  // const [summaryStage, setSummaryStage] = useState("");

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
        // API endpoint for AR conversation might be different
        const response = await fetch(
          `/api/agents/ar/conversation?contextFileId=${contextFileId}`
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (data.cached && data.data) {
          console.log(
            `[ar-agent] Restoring conversation with ${data.data.messages.length} messages`
          );

          setArSessionId(data.data.arSessionId); // Renamed from documentId
          // setSummary(data.data.summary); // Removed

          // Restore chat messages
          const restoredMessages: ChatMessage[] = data.data.messages.map(
            (msg: ChatMessage, index: number) => ({
              ...msg,
              id: generateUUID(),
            })
          );
          setChatMessages(restoredMessages);
        }

        if (contextFileId && data.data?.arSessionId) {
          // Renamed from documentId
          void prepareArAgent(contextFileId, data.data.arSessionId);
        }
      } catch (error) {
        console.error("[ar-agent] Failed to restore conversation:", error);
      }
    }

    restoreConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextFileId]);

  const resetWorkflow = useCallback(() => {
    setContextFileId(null);
    setArSessionId(null); // Renamed from documentId
    // Removed summary, highlights, sections, questions states
    // setSummary("");
    // setHighlights([]);
    // setSections([]);
    // setQuestions([]);
    setChatMessages([]);
    setQuestionInput("");
    setWarnings([]);
    // Removed uploadMetadata, summaryUsage
    // setUploadMetadata(null);
    // setSummaryUsage(null);
    setError(null);
    setAgentReady(false);
    setAgentContextMeta(null);
    setAgentStatus("Idle");
    setIsPreparingAgent(false);
  }, []);

  const prepareArAgent = useCallback(
    // Renamed from prepareDocAgent
    async (contextId: string, arSessionIdValue?: string) => {
      // Renamed from docIdValue
      setIsPreparingAgent(true);
      setAgentReady(false);
      setAgentStatus("Initializing AR agent..."); // Updated status message

      try {
        const response = await fetch("/api/agents/ar", {
          // Updated API endpoint
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "load",
            contextFileId: contextId,
            arSessionId: arSessionIdValue, // Renamed from docId
          }),
        });

        const data: { doc?: AgentLoadSuccess; error?: string } =
          await response.json();

        if (!response.ok || !data.doc) {
          throw new Error(data.error ?? "Failed to prepare the AR agent."); // Updated error message
        }

        setAgentContextMeta(data.doc);
        setAgentReady(true);
        // Removed pageCount related logic
        // const pageLabel = data.doc.pageCount === 1 ? "page" : "pages";
        setAgentStatus(`AR Agent ready for session ${data.doc.docId}`); // Updated status message
        const warningList =
          (data.doc.meta?.warnings as string[] | undefined) ?? [];
        appendWarnings(warningList);
      } catch (prepError) {
        const message =
          prepError instanceof Error
            ? prepError.message
            : "Unable to prepare the AR agent."; // Updated error message
        setAgentStatus(message);
        setError(message);
      } finally {
        setIsPreparingAgent(false);
      }
    },
    [appendWarnings]
  );

  // Removed generateQuestionsForSummary and runSummarization functions
  // const generateQuestionsForSummary = useCallback(
  //   async (
  //     contextId: string,
  //     docId: string,
  //     payload: {
  //       summary: string;
  //       highlights: string[];
  //       sections: PdfSectionSummary[];
  //     }
  //   ) => {
  //     if (!contextId || !docId) {
  //       return;
  //     }
  //     if (!payload.summary.trim() || payload.sections.length === 0) {
  //       setQuestions([]);
  //       return;
  //     }

  //     setIsGeneratingQuestions(true);
  //     try {
  //       const response = await fetch("/api/pdf/questions", {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({
  //           contextFileId: contextId,
  //           documentId: docId,
  //           summary: payload.summary,
  //           highlights: payload.highlights,
  //           sections: payload.sections,
  //         }),
  //       });

  //       if (!response.ok) {
  //         const errorData: { error?: string } = await response.json();
  //         throw new Error(
  //           errorData?.error ?? "Failed to generate follow-up questions."
  //         );
  //       }
  //       const data: QuestionsResponse = await response.json();
  //       setQuestions(data.questions ?? []);
  //       appendWarnings(data.warnings);
  //       setError(null);
  //     } catch (generationError) {
  //       const message =
  //         generationError instanceof Error
  //           ? generationError.message
  //           : "Unable to generate guided questions.";
  //       setError(message);
  //     } finally {
  //       setIsGeneratingQuestions(false);
  //     }
  //   },
  //   [appendWarnings]
  // );

  // const runSummarization = useCallback(
  //   async (contextId: string) => {
  //     setIsSummarizing(true);
  //     setSummaryProgress(0);
  //     setSummaryStage("Starting...");

  //     try {
  //       const response = await fetch("/api/pdf/summarize", {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({
  //           contextFileId: contextId,
  //           stream: true, // Enable SSE streaming
  //         }),
  //       });

  //       if (!response.ok) {
  //         throw new Error("Failed to summarise the PDF.");
  //       }

  //       // Check if response is SSE stream
  //       const contentType = response.headers.get("content-type") ?? "";
  //       if (contentType.includes("text/event-stream")) {
  //         // Handle SSE streaming response
  //         const reader = response.body?.getReader();
  //         const decoder = new TextDecoder();

  //         if (!reader) {
  //           throw new Error("Failed to read stream");
  //         }

  //         let buffer = "";

  //         while (true) {
  //           const { done, value } = await reader.read();

  //           if (done) {
  //             break;
  //           }

  //           buffer += decoder.decode(value, { stream: true });

  //           // Process complete SSE messages
  //           const lines = buffer.split("\n");
  //           buffer = lines.pop() || ""; // Keep incomplete line in buffer

  //           for (const line of lines) {
  //             if (line.startsWith("event: ")) {
  //               const event = line.slice(7);
  //               const nextLine = lines[lines.indexOf(line) + 1];

  //               if (nextLine?.startsWith("data: ")) {
  //                 const data = JSON.parse(
  //                   nextLine.slice(6)
  //                 );

  //                 if (event === "progress") {
  //                   setSummaryProgress(data.progress);
  //                   setSummaryStage(data.message);
  //                 } else if (event === "complete") {
  //                   const summarizeData = data as SummarizeResponse;
  //                   setDocumentId(summarizeData.documentId);
  //                   setSummary(summarizeData.summary);
  //                   setHighlights(summarizeData.highlights ?? []);
  //                   setSections(summarizeData.sections ?? []);
  //                   setSummaryUsage(summarizeData.usage ?? null);
  //                   appendWarnings(summarizeData.warnings);
  //                   setError(null);

  //                   await generateQuestionsForSummary(
  //                     contextId,
  //                     summarizeData.documentId,
  //                     {
  //                       summary: summarizeData.summary,
  //                       highlights: summarizeData.highlights ?? [],
  //                       sections: summarizeData.sections ?? [],
  //                     }
  //                   );

  //                   void prepareDocAgent(contextId, summarizeData.documentId);
  //                 } else if (event === "error") {
  //                   throw new Error(
  //                     data.message || "Failed to summarise the PDF."
  //                   );
  //                 }
  //               }
  //             }
  //           }
  //         }
  //       } else {
  //         // Fallback to JSON response (non-streaming)
  //         const data: SummarizeResponse | { error?: string } =
  //           await response.json();

  //         const errorData = data as { error?: string };
  //         if (errorData.error) {
  //           throw new Error(errorData.error);
  //         }

  //         const summarizeData = data as SummarizeResponse;
  //         setDocumentId(summarizeData.documentId);
  //         setSummary(summarizeData.summary);
  //         setHighlights(summarizeData.highlights ?? []);
  //         setSections(summarizeData.sections ?? []);
  //         setSummaryUsage(summarizeData.usage ?? null);
  //         appendWarnings(summarizeData.warnings);
  //         setError(null);

  //         await generateQuestionsForSummary(
  //           contextId,
  //           summarizeData.documentId,
  //           {
  //             summary: summarizeData.summary,
  //             highlights: summarizeData.highlights ?? [],
  //             sections: summarizeData.sections ?? [],
  //           }
  //         );

  //         void prepareDocAgent(contextId, summarizeData.documentId);
  //       }
  //     } catch (summarizeError) {
  //       const message =
  //         summarizeError instanceof Error
  //           ? summarizeError.message
  //           : "LedgerBot couldn't summarise this PDF.";
  //       setError(message);
  //     } finally {
  //       setIsSummarizing(false);
  //       setSummaryProgress(0);
  //       setSummaryStage("");
  //     }
  //   },
  //   [appendWarnings, generateQuestionsForSummary, prepareDocAgent]
  // );

  // Removed handleFileChange and handleRegenerateQuestions
  // const handleFileChange = useCallback(
  //   async (event: ChangeEvent<HTMLInputElement>) => {
  //     const file = event.target.files?.[0];
  //     if (!file) {
  //       return;
  //     }

  //     resetWorkflow();
  //     setIsUploading(true);

  //     try {
  //       const formData = new FormData();
  //       formData.append("file", file);

  //       const response = await fetch("/api/pdf/upload", {
  //         method: "POST",
  //         body: formData,
  //       });

  //       const data: UploadResponse | { error?: string } = await response.json();

  //       if (!response.ok) {
  //         const errorData = data as { error?: string };
  //         throw new Error(errorData.error ?? "Failed to upload the PDF.");
  //       }

  //       // Type narrowing: at this point, data must be UploadResponse
  //       const uploadData = data as UploadResponse;

  //       setUploadMetadata({
  //         fileName: uploadData.fileName,
  //         size: uploadData.size,
  //         tokenEstimate: uploadData.tokenEstimate,
  //       });

  //       // Show OCR success message if OCR was used
  //       if (uploadData.usedOCR) {
  //         appendWarnings([
  //           "This PDF was scanned or image-based. Text was successfully extracted using OCR.",
  //         ]);
  //       } else {
  //         appendWarnings(uploadData.warnings);
  //       }

  //       if (uploadData.status === "ready") {
  //         setContextFileId(uploadData.contextFileId);
  //         setAgentReady(false);
  //         setAgentContextMeta(null);
  //         setAgentStatus("Waiting for summary...");
  //         await runSummarization(uploadData.contextFileId);
  //       } else {
  //         setError(
  //           uploadData.warnings?.[0] ??
  //             "No searchable text detected. The PDF may be password protected or corrupted."
  //         );
  //       }
  //     } catch (uploadError) {
  //       const message =
  //         uploadError instanceof Error
  //           ? uploadError.message
  //           : "Upload failed. Please try again.";
  //       setError(message);
  //     } finally {
  //       setIsUploading(false);
  //       if (fileInputRef.current) {
  //         fileInputRef.current.value = "";
  //       }
  //     }
  //   },
  //   [appendWarnings, resetWorkflow, runSummarization]
  // );

  // const handleRegenerateQuestions = useCallback(async () => {
  //   if (!contextFileId || !documentId) {
  //     return;
  //   }

  //   await generateQuestionsForSummary(contextFileId, documentId, {
  //     summary,
  //     highlights,
  //     sections,
  //   });
  // }, [
  //   contextFileId,
  //   documentId,
  //   generateQuestionsForSummary,
  //   highlights,
  //   sections,
  //   summary,
  // ]);

  const handleAskQuestion = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      // Removed summary and sections checks
      // if (!contextFileId || !summary.trim() || sections.length === 0) {
      //   setError("Upload and summarise a PDF before asking questions.");
      //   return;
      // }

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
        const response = await fetch("/api/agents/ar", {
          // Updated API endpoint
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "chat",
            contextFileId,
            arSessionId, // Renamed from documentId
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
    [chatMessages, arSessionId, contextFileId, questionInput] // Updated dependencies
  );

  // Removed sectionLookup
  // const sectionLookup = useMemo(() => {
  //   const map = new Map<string, { index: number; title: string }>();
  //   sections.forEach((section, index) => {
  //     map.set(section.id, { index: index + 1, title: section.title });
  //   });
  //   return map;
  // }, [sections]);

  // Simplified canChat
  const canChat = Boolean(contextFileId && agentReady);
  // Removed disableUpload
  // const disableUpload = isUploading || isSummarizing;
  return (
    <div className="space-y-10">
      <Card>
        <CardHeader className="flex flex-col gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-primary" /> {/* Changed icon */}
            Accounts Receivable Agent
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Manage customer invoices, send payment reminders, predict late
            payments, and reduce Days Sales Outstanding (DSO).
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              {/* Removed file upload section */}
              {/* Removed warnings and error display for upload/summary */}
              {/* Removed summary and sections display */}
            </div>
            <div className="space-y-4">
              {/* Removed suggested follow-up questions */}
              {/* <div className="rounded-md border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">
                      Suggested follow-up questions
                    </h3>
                  </div>
                  <Button
                    disabled={
                      !contextFileId ||
                      !documentId ||
                      sections.length === 0 ||
                      isGeneratingQuestions ||
                      isSummarizing
                    }
                    onClick={handleRegenerateQuestions}
                    size="sm"
                    variant="outline"
                  >
                    {isGeneratingQuestions ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Refreshing
                      </>
                    ) : (
                      "Regenerate"
                    )}
                  </Button>
                </div>
                <div className="mt-3 space-y-2 text-sm leading-relaxed">
                  {questions.length > 0 ? (
                    questions.map((question) => (
                      <div
                        className="rounded-md border border-muted-foreground/40 border-dashed p-3"
                        key={question.id}
                      >
                        <p className="font-medium">{question.question}</p>
                        <p className="mt-1 text-muted-foreground text-xs">
                          {question.rationale}
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground uppercase">
                          {question.category} · {question.whenToAsk}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Guided prompts will appear after LedgerBot summarises the
                      PDF. Use them for client follow-ups or reconciliation
                      notes.
                    </p>
                  )}
                </div>
              </div> */}

              <div className="rounded-md border bg-background p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">
                      Chat with AR Agent
                    </h3>
                    <Badge>
                      {agentReady ? "Agent ready" : "Sync required"}
                    </Badge>
                  </div>
                  <Button
                    disabled={
                      !contextFileId || isPreparingAgent
                      // Removed summary and sections checks
                      // || !summary || sections.length === 0
                    }
                    onClick={() => {
                      if (!contextFileId) {
                        return;
                      }
                      void prepareArAgent(
                        contextFileId,
                        arSessionId ?? undefined // Renamed from documentId
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
                      "Sync AR Session" // Updated button text
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
                      Ask natural-language questions to manage customer
                      invoices, payment reminders, and DSO.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {chatMessages.map((message) => (
                        <div
                          className={`rounded-md border p-3 text-sm leading-relaxed ${
                            message.role === "assistant"
                              ? "bg-muted/40"
                              : "bg-background"
                          }`}
                          key={message.id}
                        >
                          <p className="font-semibold text-muted-foreground text-xs uppercase">
                            {message.role === "assistant" ? "LedgerBot" : "You"}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap">
                            {message.content}
                          </p>
                          {/* Removed sources display */}
                          {/* {message.sources && message.sources.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.sources.map((source) => {
                                const meta = sectionLookup.get(source);
                                const label = meta
                                  ? `Section ${meta.index}: ${meta.title}`
                                  : "Source excerpt";
                                return (
                                  <Badge
                                    className="text-xs"
                                    key={source}
                                    variant="outline"
                                  >
                                    {label}
                                  </Badge>
                                );
                              })}
                            </div>
                          )} */}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <form className="mt-3 space-y-2" onSubmit={handleAskQuestion}>
                  {!agentReady && (
                    <p className="text-muted-foreground text-xs">
                      Sync the AR session to activate LedgerBot before asking a
                      question.
                    </p>
                  )}
                  <Textarea
                    disabled={!canChat || isAnswering}
                    onChange={(event) => setQuestionInput(event.target.value)}
                    placeholder="e.g. What are the overdue invoices for customer ABC?"
                    rows={3}
                    value={questionInput}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-xs">
                      LedgerBot will use available AR data to answer your
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
