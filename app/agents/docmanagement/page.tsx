"use client";

import {
  AlertTriangle,
  FileText,
  Loader2,
  MessageSquare,
  Sparkles,
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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type {
  PdfChatMessage,
  PdfGuidedQuestion,
  PdfSectionSummary,
} from "@/lib/agents/docmanagement/types";
import { generateUUID } from "@/lib/utils";

type ChatMessage = PdfChatMessage & { id: string };

type UploadResponse = {
  contextFileId: string;
  fileName: string;
  size: number;
  status: "ready" | "needs_ocr";
  tokenEstimate?: number;
  usedOCR?: boolean;
  warnings?: string[];
};

type SummarizeResponse = {
  documentId: string;
  summary: string;
  highlights: string[];
  sections: PdfSectionSummary[];
  warnings: string[];
  usage?: {
    totalBilledTokens?: number;
    totalInputTokens?: number;
    totalOutputTokens?: number;
  };
};

type QuestionsResponse = {
  documentId: string;
  questions: PdfGuidedQuestion[];
  warnings: string[];
};

type AgentChatResponse = {
  text: string;
  error?: string;
  message?: string;
};

type AgentLoadSuccess = {
  docId: string;
  pageCount: number;
  meta?: {
    contextFileId?: string;
    tokenEstimate?: number;
    fileName?: string;
    warnings?: string[];
  };
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentManagementAgentPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [contextFileId, setContextFileId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [sections, setSections] = useState<PdfSectionSummary[]>([]);
  const [questions, setQuestions] = useState<PdfGuidedQuestion[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [questionInput, setQuestionInput] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [agentReady, setAgentReady] = useState(false);
  const [isPreparingAgent, setIsPreparingAgent] = useState(false);
  const [agentStatus, setAgentStatus] = useState("Idle");
  const [agentContextMeta, setAgentContextMeta] =
    useState<AgentLoadSuccess | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState<{
    fileName: string;
    size: number;
    tokenEstimate?: number;
  } | null>(null);
  const [summaryUsage, setSummaryUsage] = useState<
    SummarizeResponse["usage"] | null
  >(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [summaryProgress, setSummaryProgress] = useState(0);
  const [summaryStage, setSummaryStage] = useState("");

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

  const prepareDocAgent = useCallback(
    async (contextId: string, docIdValue?: string) => {
      setIsPreparingAgent(true);
      setAgentReady(false);
      setAgentStatus("Syncing PDF context...");

      try {
        const response = await fetch("/api/agents/docmanagement", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "load",
            contextFileId: contextId,
            docId: docIdValue,
          }),
        });

        const data: { doc?: AgentLoadSuccess; error?: string } =
          await response.json();

        if (!response.ok || !data.doc) {
          throw new Error(
            data.error ?? "Failed to prepare the document agent."
          );
        }

        setAgentContextMeta(data.doc);
        setAgentReady(true);
        const pageLabel = data.doc.pageCount === 1 ? "page" : "pages";
        setAgentStatus(`Indexed ${data.doc.pageCount} ${pageLabel}`);
        const warningList =
          (data.doc.meta?.warnings as string[] | undefined) ?? [];
        appendWarnings(warningList);
      } catch (prepError) {
        const message =
          prepError instanceof Error
            ? prepError.message
            : "Unable to prepare the document agent.";
        setAgentStatus(message);
        setError(message);
      } finally {
        setIsPreparingAgent(false);
      }
    },
    [appendWarnings]
  );

  // Restore conversation from Redis cache on mount (if available)
  useEffect(() => {
    async function restoreConversation() {
      if (!contextFileId) {
        return;
      }

      try {
        const response = await fetch(
          `/api/pdf/conversation?contextFileId=${contextFileId}`
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (data.cached && data.data) {
          console.log(
            `[docmanagement] Restoring conversation with ${data.data.messages.length} messages`
          );

          setDocumentId(data.data.documentId);
          setSummary(data.data.summary);

          // Restore chat messages
          const restoredMessages: ChatMessage[] = data.data.messages.map(
            (msg: PdfChatMessage, _index: number) => ({
              ...msg,
              id: generateUUID(),
            })
          );
          setChatMessages(restoredMessages);
        }

        if (contextFileId && data.data?.documentId) {
          void prepareDocAgent(contextFileId, data.data.documentId);
        }
      } catch (error) {
        console.error("[docmanagement] Failed to restore conversation:", error);
      }
    }

    restoreConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextFileId, prepareDocAgent]);

  const resetWorkflow = useCallback(() => {
    setContextFileId(null);
    setDocumentId(null);
    setSummary("");
    setHighlights([]);
    setSections([]);
    setQuestions([]);
    setChatMessages([]);
    setQuestionInput("");
    setWarnings([]);
    setUploadMetadata(null);
    setSummaryUsage(null);
    setError(null);
    setAgentReady(false);
    setAgentContextMeta(null);
    setAgentStatus("Idle");
    setIsPreparingAgent(false);
  }, []);

  const generateQuestionsForSummary = useCallback(
    async (
      contextId: string,
      docId: string,
      payload: {
        summary: string;
        highlights: string[];
        sections: PdfSectionSummary[];
      }
    ) => {
      if (!contextId || !docId) {
        return;
      }
      if (!payload.summary.trim() || payload.sections.length === 0) {
        setQuestions([]);
        return;
      }

      setIsGeneratingQuestions(true);
      try {
        const response = await fetch("/api/pdf/questions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contextFileId: contextId,
            documentId: docId,
            summary: payload.summary,
            highlights: payload.highlights,
            sections: payload.sections,
          }),
        });

        if (!response.ok) {
          const errorData: { error?: string } = await response.json();
          throw new Error(
            errorData?.error ?? "Failed to generate follow-up questions."
          );
        }
        const data: QuestionsResponse = await response.json();
        setQuestions(data.questions ?? []);
        appendWarnings(data.warnings);
        setError(null);
      } catch (generationError) {
        const message =
          generationError instanceof Error
            ? generationError.message
            : "Unable to generate guided questions.";
        setError(message);
      } finally {
        setIsGeneratingQuestions(false);
      }
    },
    [appendWarnings]
  );

  const runSummarization = useCallback(
    async (contextId: string) => {
      setIsSummarizing(true);
      setSummaryProgress(0);
      setSummaryStage("Starting...");

      try {
        const response = await fetch("/api/pdf/summarize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contextFileId: contextId,
            stream: true, // Enable SSE streaming
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to summarise the PDF.");
        }

        // Check if response is SSE stream
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("text/event-stream")) {
          // Handle SSE streaming response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error("Failed to read stream");
          }

          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE messages
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith("event: ")) {
                const event = line.slice(7);
                const nextLine = lines[lines.indexOf(line) + 1];

                if (nextLine?.startsWith("data: ")) {
                  const data = JSON.parse(nextLine.slice(6));

                  if (event === "progress") {
                    setSummaryProgress(data.progress);
                    setSummaryStage(data.message);
                  } else if (event === "complete") {
                    const summarizeData = data as SummarizeResponse;
                    setDocumentId(summarizeData.documentId);
                    setSummary(summarizeData.summary);
                    setHighlights(summarizeData.highlights ?? []);
                    setSections(summarizeData.sections ?? []);
                    setSummaryUsage(summarizeData.usage ?? null);
                    appendWarnings(summarizeData.warnings);
                    setError(null);

                    await generateQuestionsForSummary(
                      contextId,
                      summarizeData.documentId,
                      {
                        summary: summarizeData.summary,
                        highlights: summarizeData.highlights ?? [],
                        sections: summarizeData.sections ?? [],
                      }
                    );

                    void prepareDocAgent(contextId, summarizeData.documentId);
                  } else if (event === "error") {
                    throw new Error(
                      data.message || "Failed to summarise the PDF."
                    );
                  }
                }
              }
            }
          }
        } else {
          // Fallback to JSON response (non-streaming)
          const data: SummarizeResponse | { error?: string } =
            await response.json();

          const errorData = data as { error?: string };
          if (errorData.error) {
            throw new Error(errorData.error);
          }

          const summarizeData = data as SummarizeResponse;
          setDocumentId(summarizeData.documentId);
          setSummary(summarizeData.summary);
          setHighlights(summarizeData.highlights ?? []);
          setSections(summarizeData.sections ?? []);
          setSummaryUsage(summarizeData.usage ?? null);
          appendWarnings(summarizeData.warnings);
          setError(null);

          await generateQuestionsForSummary(
            contextId,
            summarizeData.documentId,
            {
              summary: summarizeData.summary,
              highlights: summarizeData.highlights ?? [],
              sections: summarizeData.sections ?? [],
            }
          );

          void prepareDocAgent(contextId, summarizeData.documentId);
        }
      } catch (summarizeError) {
        const message =
          summarizeError instanceof Error
            ? summarizeError.message
            : "LedgerBot couldn't summarise this PDF.";
        setError(message);
      } finally {
        setIsSummarizing(false);
        setSummaryProgress(0);
        setSummaryStage("");
      }
    },
    [appendWarnings, generateQuestionsForSummary, prepareDocAgent]
  );

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      resetWorkflow();
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/pdf/upload", {
          method: "POST",
          body: formData,
        });

        const data: UploadResponse | { error?: string } = await response.json();

        if (!response.ok) {
          const errorData = data as { error?: string };
          throw new Error(errorData.error ?? "Failed to upload the PDF.");
        }

        // Type narrowing: at this point, data must be UploadResponse
        const uploadData = data as UploadResponse;

        setUploadMetadata({
          fileName: uploadData.fileName,
          size: uploadData.size,
          tokenEstimate: uploadData.tokenEstimate,
        });

        // Show OCR success message if OCR was used
        if (uploadData.usedOCR) {
          appendWarnings([
            "This PDF was scanned or image-based. Text was successfully extracted using OCR.",
          ]);
        } else {
          appendWarnings(uploadData.warnings);
        }

        if (uploadData.status === "ready") {
          setContextFileId(uploadData.contextFileId);
          setAgentReady(false);
          setAgentContextMeta(null);
          setAgentStatus("Waiting for summary...");
          await runSummarization(uploadData.contextFileId);
        } else {
          setError(
            uploadData.warnings?.[0] ??
              "No searchable text detected. The PDF may be password protected or corrupted."
          );
        }
      } catch (uploadError) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : "Upload failed. Please try again.";
        setError(message);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [appendWarnings, resetWorkflow, runSummarization]
  );

  const handleRegenerateQuestions = useCallback(async () => {
    if (!contextFileId || !documentId) {
      return;
    }

    await generateQuestionsForSummary(contextFileId, documentId, {
      summary,
      highlights,
      sections,
    });
  }, [
    contextFileId,
    documentId,
    generateQuestionsForSummary,
    highlights,
    sections,
    summary,
  ]);

  const handleAskQuestion = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!contextFileId || !summary.trim() || sections.length === 0) {
        setError("Upload and summarise a PDF before asking questions.");
        return;
      }

      const trimmed = questionInput.trim();
      if (!trimmed) {
        return;
      }

      setError(null);

      const historyPayload: PdfChatMessage[] = chatMessages.map(
        ({ role, content, sources }) => ({
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
        const response = await fetch("/api/agents/docmanagement", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "chat",
            contextFileId,
            docId: documentId,
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
    [chatMessages, documentId, contextFileId, questionInput, sections, summary]
  );

  const sectionLookup = useMemo(() => {
    const map = new Map<string, { index: number; title: string }>();
    sections.forEach((section, index) => {
      map.set(section.id, { index: index + 1, title: section.title });
    });
    return map;
  }, [sections]);

  const canChat = Boolean(
    contextFileId && summary && sections.length > 0 && agentReady
  );
  const disableUpload = isUploading || isSummarizing;
  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-3xl">
            <FileText className="h-8 w-8 text-primary" />
            Document Management Agent
          </h1>
          <p className="text-muted-foreground">
            Upload invoices, receipts, or statements to generate
            compliance-aware summaries and chat with documents using LedgerBot
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="gap-2"
            disabled={!contextFileId}
            onClick={resetWorkflow}
            variant="outline"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <label
                aria-disabled={disableUpload}
                className={`flex flex-col items-center justify-center rounded-lg border border-primary/40 border-dashed bg-primary/5 p-8 text-center transition ${
                  disableUpload
                    ? "cursor-not-allowed opacity-70"
                    : "hover:border-primary hover:bg-primary/10"
                }`}
                htmlFor="pdf-upload-input"
              >
                {disableUpload ? (
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                ) : (
                  <Upload className="mb-3 h-8 w-8 text-primary" />
                )}
                <span className="font-medium">
                  {disableUpload
                    ? "Processing..."
                    : "Upload supporting documents"}
                </span>
                <span className="text-muted-foreground text-sm">
                  PDF only · 15MB max · enable OCR for scanned copies
                </span>
                <Input
                  accept="application/pdf"
                  className="hidden"
                  disabled={disableUpload}
                  id="pdf-upload-input"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  type="file"
                />
              </label>

              {uploadMetadata && (
                <div className="rounded-md border bg-muted/40 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">
                        {uploadMetadata.fileName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatFileSize(uploadMetadata.size)}
                        {typeof uploadMetadata.tokenEstimate === "number"
                          ? ` · est. ${uploadMetadata.tokenEstimate} tokens`
                          : ""}
                      </p>
                    </div>
                    <Badge
                      className="flex items-center gap-1"
                      variant="secondary"
                    >
                      {isSummarizing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Summarising
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          Ready
                        </>
                      )}
                    </Badge>
                  </div>

                  {isSummarizing && summaryProgress > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {summaryStage}
                        </span>
                        <span className="font-medium">{summaryProgress}%</span>
                      </div>
                      <Progress className="h-1.5" value={summaryProgress} />
                    </div>
                  )}

                  {summaryUsage && (
                    <p className="mt-2 text-muted-foreground text-xs">
                      Model usage · in {summaryUsage.totalInputTokens ?? 0} ·
                      out {summaryUsage.totalOutputTokens ?? 0}
                    </p>
                  )}
                </div>
              )}

              {warnings.length > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Attention needed
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-amber-600">
                    {warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {error && (
                <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-destructive text-sm">
                  {error}
                </div>
              )}

              {summary && (
                <div className="space-y-3 rounded-md border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Ledger-ready summary
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {summary}
                  </p>
                  {highlights.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase">
                        Key highlights
                      </p>
                      <ul className="mt-1 space-y-1 text-sm leading-relaxed">
                        {highlights.map((highlight) => (
                          <li key={highlight}>• {highlight}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {sections.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <FileText className="h-4 w-4 text-primary" />
                    Section breakdown
                  </div>
                  <ScrollArea className="h-72 rounded-md border bg-muted/10 p-4">
                    <div className="space-y-4">
                      {sections.map((section, index) => (
                        <div
                          className="rounded-md bg-background p-4 shadow-sm ring-1 ring-muted/40"
                          key={section.id}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-sm">
                              {index + 1}. {section.title}
                            </p>
                            {section.monetaryAmounts.length > 0 && (
                              <Badge className="text-xs" variant="outline">
                                {section.monetaryAmounts[0]}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
                            {section.summary}
                          </p>
                          {section.keyFacts.length > 0 && (
                            <div className="mt-2 text-muted-foreground text-xs">
                              <p className="font-medium text-muted-foreground/80">
                                Key facts
                              </p>
                              <ul className="mt-1 space-y-1">
                                {section.keyFacts.map((fact) => (
                                  <li key={fact}>• {fact}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {section.complianceSignals.length > 0 && (
                            <div className="mt-2 text-muted-foreground text-xs">
                              <p className="font-medium text-muted-foreground/80">
                                Compliance notes
                              </p>
                              <ul className="mt-1 space-y-1">
                                {section.complianceSignals.map((note) => (
                                  <li key={note}>• {note}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/20 p-4">
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
              </div>

              <div className="rounded-md border bg-background p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">
                      Chat with this PDF
                    </h3>
                    <Badge>
                      {agentReady ? "Agent ready" : "Sync required"}
                    </Badge>
                  </div>
                  <Button
                    disabled={
                      !contextFileId ||
                      isPreparingAgent ||
                      !summary ||
                      sections.length === 0
                    }
                    onClick={() => {
                      if (!contextFileId) {
                        return;
                      }
                      void prepareDocAgent(
                        contextFileId,
                        documentId ?? undefined
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
                      "Sync PDF"
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
                      Ask natural-language questions once a summary is
                      available. LedgerBot will use the summary and focused
                      excerpts to answer or flag missing data.
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
                          {message.sources && message.sources.length > 0 && (
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
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <form className="mt-3 space-y-2" onSubmit={handleAskQuestion}>
                  {!agentReady && (
                    <p className="text-muted-foreground text-xs">
                      Sync the PDF to activate LedgerBot before asking a
                      question.
                    </p>
                  )}
                  <Textarea
                    disabled={!canChat || isAnswering}
                    onChange={(event) => setQuestionInput(event.target.value)}
                    placeholder="e.g. What GST amount should we book from this invoice?"
                    rows={3}
                    value={questionInput}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-xs">
                      Answers combine the summary with relevant PDF excerpts.
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
