"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  BookOpen,
  ExternalLink,
  MessageSquareText,
  RefreshCw,
  Send,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { fetcher } from "@/lib/utils";

type RegulatoryStats = {
  awards: number;
  taxRulings: number;
  payrollTax: number;
  lastUpdated: string | null;
  totalDocuments: number;
};

type Citation = {
  title: string;
  url: string;
  category: string;
};

type MessageMetadata = {
  confidence?: number;
  citations?: Citation[];
  needsReview?: boolean;
};

const suggestedQuestions = [
  "What's the minimum wage for a Level 3 retail worker?",
  "Explain the superannuation guarantee rate for FY2024-25",
  "What are the payroll tax thresholds for NSW and VIC?",
  "When are BAS lodgements due for quarterly reporters?",
  "What Fair Work awards apply to hospitality workers?",
];

function getConfidenceBadge(confidence: number) {
  if (confidence >= 0.8) {
    return (
      <Badge className="bg-green-500 hover:bg-green-600">
        High ({(confidence * 100).toFixed(0)}%)
      </Badge>
    );
  }
  if (confidence >= 0.6) {
    return (
      <Badge className="bg-yellow-500 hover:bg-yellow-600">
        Medium ({(confidence * 100).toFixed(0)}%)
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500 hover:bg-red-600">
      Low ({(confidence * 100).toFixed(0)}%)
    </Badge>
  );
}

export default function QandAAgentPage() {
  const [streamResponses, setStreamResponses] = useState(true);
  const [showCitations, setShowCitations] = useState(true);
  const [refreshSources, setRefreshSources] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState({
    award: true,
    tax_ruling: true,
    payroll_tax: true,
  });
  const [input, setInput] = useState("");
  const [messageMetadata, _setMessageMetadata] = useState<
    Map<string, MessageMetadata>
  >(new Map());
  const [isRefreshingSources, setIsRefreshingSources] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null);

  const activeCategories = useMemo(() => {
    const enabled = Object.entries(categoryFilters)
      .filter(([, value]) => value)
      .map(([key]) => key);
    return enabled.length > 0
      ? enabled
      : ["award", "tax_ruling", "payroll_tax"];
  }, [categoryFilters]);

  // Fetch regulatory knowledge base stats
  const { data: kbStats } = useSWR<RegulatoryStats>(
    "/api/regulatory/stats",
    fetcher,
    {
      fallbackData: {
        awards: 0,
        taxRulings: 0,
        payrollTax: 0,
        lastUpdated: null,
        totalDocuments: 0,
      },
    }
  );

  // Use real chat API
  const chat = useChat({
    id: "qanda-agent",
    transport: new DefaultChatTransport({
      api: "/api/agents/qanda",
      fetch,
      prepareSendMessagesRequest(request: any) {
        return {
          body: {
            messages: request.messages,
            settings: {
              model: "anthropic-claude-sonnet-4-5",
              confidenceThreshold: 0.6,
              refreshSources,
              categories: activeCategories,
              streamResponses,
            },
          },
        };
      },
    }),
  });

  const { messages, sendMessage, status } = chat;

  const handleSendMessage = () => {
    if (!input.trim()) {
      return;
    }
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: input }],
    } as any);
    setInput("");
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  const handleManualRefresh = async () => {
    setIsRefreshingSources(true);
    setRefreshStatus("Triggering Mastra scraping job...");
    try {
      const response = await fetch("/api/regulatory/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: "AU", priority: "high" }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error ?? "Failed to start scraping job");
      }

      setRefreshStatus("Scrape job started. Fresh data will appear shortly.");
    } catch (error) {
      setRefreshStatus(
        error instanceof Error ? error.message : "Unable to refresh sources."
      );
    } finally {
      setIsRefreshingSources(false);
    }
  };

  const handleVote = async (messageId: string, isUpvoted: boolean) => {
    try {
      await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: "qanda-agent",
          messageId,
          isUpvoted,
        }),
      });
      console.log(
        `Voted ${isUpvoted ? "up" : "down"} for message ${messageId}`
      );
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-3xl">
            <BookOpen className="h-8 w-8 text-primary" />
            Advisory Q&A Agent
          </h1>
          <p className="text-muted-foreground">
            Ask questions about Australian employment law, tax regulations, and
            compliance obligations with regulatory citations and confidence
            scoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={isRefreshingSources}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshingSources ? "animate-spin" : ""}`}
            />
            Refresh Sources
          </Button>
        </div>
      </div>

      {/* Regulatory Knowledge Base Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-primary" />
            Regulatory Knowledge Base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs uppercase">
                  Modern Awards
                </p>
                <Badge variant="secondary">{kbStats?.awards ?? 0}</Badge>
              </div>
              <Progress value={kbStats?.awards ? 100 : 0} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs uppercase">
                  Tax Rulings
                </p>
                <Badge variant="secondary">{kbStats?.taxRulings ?? 0}</Badge>
              </div>
              <Progress value={kbStats?.taxRulings ? 100 : 0} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs uppercase">
                  State Payroll Tax
                </p>
                <Badge variant="secondary">{kbStats?.payrollTax ?? 0}</Badge>
              </div>
              <Progress value={kbStats?.payrollTax ? 100 : 0} />
            </div>
          </div>
          <div className="rounded-md border bg-muted/40 p-3 text-xs">
            <p className="text-muted-foreground">
              <span className="font-semibold">
                {kbStats?.totalDocuments ?? 0} regulatory documents
              </span>{" "}
              indexed across Fair Work awards, ATO rulings, and state-specific
              tax guidance.
            </p>
            {kbStats?.lastUpdated ? (
              <p className="mt-1 text-muted-foreground">
                Last updated:{" "}
                {new Date(kbStats.lastUpdated).toLocaleDateString()}
              </p>
            ) : (
              <p className="mt-1 text-muted-foreground">
                Knowledge base not yet initialized
              </p>
            )}
          </div>
          {refreshStatus && (
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <p className="text-muted-foreground">{refreshStatus}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Chat Interface */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquareText className="h-5 w-5 text-primary" />
              Advisory Workspace
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Ask questions about Australian employment law, tax regulations,
              and compliance obligations. Responses include regulatory citations
              and confidence scores.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Conversation History */}
            <ScrollArea className="h-[500px] rounded-md border bg-muted/20 p-4">
              <div className="space-y-4">
                {messages.map((message) => {
                  const metadata = message.id
                    ? messageMetadata.get(message.id)
                    : undefined;

                  return (
                    <div
                      className="rounded-lg border bg-card p-4 shadow-sm"
                      data-role={message.role}
                      key={message.id}
                    >
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span className="font-medium text-foreground capitalize">
                          {message.role}
                        </span>
                        <span>
                          {new Date().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                        {message.parts
                          ?.map((part, _idx) =>
                            part.type === "text" ? part.text : null
                          )
                          .filter(Boolean)
                          .join("") || ""}
                      </div>

                      {/* Citations */}
                      {message.role === "assistant" &&
                        showCitations &&
                        metadata?.citations &&
                        metadata.citations.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="font-medium text-xs">
                              Regulatory citations:
                            </p>
                            <div className="space-y-1">
                              {metadata.citations.map((citation, idx) => (
                                <a
                                  className="flex items-center gap-2 rounded-md border bg-muted/40 p-2 text-xs transition-colors hover:bg-muted"
                                  href={citation.url}
                                  key={idx}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                  <span className="flex-1 truncate">
                                    {citation.title}
                                  </span>
                                  <Badge className="shrink-0" variant="outline">
                                    {citation.category}
                                  </Badge>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Assistant Response Metadata */}
                      {message.role === "assistant" && (
                        <div className="mt-3 flex items-center justify-between text-muted-foreground text-xs">
                          <div className="flex items-center gap-4">
                            {metadata?.confidence !== undefined ? (
                              <span className="flex items-center gap-1">
                                Confidence:{" "}
                                {getConfidenceBadge(metadata.confidence)}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                Confidence:{" "}
                                <Badge variant="secondary">
                                  Calculating...
                                </Badge>
                              </span>
                            )}
                            {metadata?.needsReview && (
                              <Badge className="bg-orange-500 hover:bg-orange-600">
                                Requires Review
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() =>
                                message.id && handleVote(message.id, true)
                              }
                              size="icon"
                              variant="ghost"
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() =>
                                message.id && handleVote(message.id, false)
                              }
                              size="icon"
                              variant="ghost"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="rounded-md border bg-muted/40 p-4">
              <Label className="text-muted-foreground text-xs uppercase">
                Ask the agent
              </Label>
              <Textarea
                className="mt-2"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about Fair Work awards, ATO tax rulings, payroll tax obligations..."
                rows={3}
                value={input}
              />
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-4 text-muted-foreground text-xs">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={streamResponses}
                      onCheckedChange={setStreamResponses}
                    />
                    <span>Stream responses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showCitations}
                      onCheckedChange={setShowCitations}
                    />
                    <span>Show citations</span>
                  </div>
                </div>
                <Button
                  disabled={status === "streaming" || !input.trim()}
                  onClick={handleSendMessage}
                  size="sm"
                >
                  {status === "streaming" ? "Sending..." : "Send"}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Suggested Questions */}
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">Suggested Questions</CardTitle>
              <p className="text-muted-foreground text-sm">
                Common regulatory queries to get started
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestedQuestions.map((question) => (
                <Button
                  className="h-auto w-full justify-start whitespace-normal text-left"
                  key={question}
                  onClick={() => handleSuggestedQuestion(question)}
                  variant="outline"
                >
                  <span className="line-clamp-2">{question}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Agent Configuration */}
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">Agent Configuration</CardTitle>
              <p className="text-muted-foreground text-sm">
                Response quality and safety settings
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
                  <div>
                    <p className="font-medium text-sm">Regulatory Sources</p>
                    <p className="text-muted-foreground">
                      Australian tax and employment law
                    </p>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
                  <div>
                    <p className="font-medium text-sm">Xero Integration</p>
                    <p className="text-muted-foreground">
                      Access your accounting data
                    </p>
                  </div>
                  <Badge variant="secondary">Connected</Badge>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
                  <div>
                    <p className="font-medium text-sm">Confidence Threshold</p>
                    <p className="text-muted-foreground">
                      Minimum 60% for responses
                    </p>
                  </div>
                  <Badge variant="outline">60%</Badge>
                </div>
              </div>
              <div className="rounded-md border bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">
                      Refresh before answering
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Trigger Mastra to re-scrape selected sources in-line
                    </p>
                  </div>
                  <Switch
                    checked={refreshSources}
                    onCheckedChange={setRefreshSources}
                  />
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Categories
                </p>
                <div className="mt-2 space-y-2">
                  {(
                    [
                      ["award", "Fair Work awards"],
                      ["tax_ruling", "ATO tax rulings"],
                      ["payroll_tax", "State payroll tax"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      className="flex items-center justify-between rounded-md border bg-muted/30 p-2 text-sm"
                      key={key}
                    >
                      <span>{label}</span>
                      <Switch
                        checked={categoryFilters[key]}
                        onCheckedChange={(value) =>
                          setCategoryFilters((prev) => ({
                            ...prev,
                            [key]: value,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
              <Separator />
              <Button asChild className="w-full" variant="outline">
                <a href="/settings/agents">Manage Settings</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
