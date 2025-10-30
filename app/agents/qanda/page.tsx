"use client";

import { useChat } from "@ai-sdk/react";
import {
  BookOpen,
  MessageSquareText,
  Send,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useState } from "react";
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

const suggestedQuestions = [
  "What's the minimum wage for a Level 3 retail worker?",
  "Explain the superannuation guarantee rate for FY2024-25",
  "What are the payroll tax thresholds for NSW and VIC?",
  "When are BAS lodgements due for quarterly reporters?",
  "What Fair Work awards apply to hospitality workers?",
];

export default function QandAAgentPage() {
  const [streamResponses, setStreamResponses] = useState(true);
  const [showCitations, setShowCitations] = useState(true);
  const [input, setInput] = useState("");

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
  const { messages, sendMessage, status } = useChat({
    id: "qanda-agent",
    transport: new (require("ai").DefaultChatTransport)({
      api: "/api/agents/qanda",
      fetch,
      prepareSendMessagesRequest(request: any) {
        return {
          body: {
            messages: request.messages,
            settings: {
              model: "anthropic-claude-sonnet-4-5",
              confidenceThreshold: 0.6,
            },
          },
        };
      },
    }),
  });

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

  return (
    <div className="space-y-6">
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
                {messages.map((message: any) => (
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
                      {message.content}
                    </div>

                    {/* Citations - will be added with data streaming in future update */}

                    {/* Assistant Response Metadata - placeholder for now */}
                    {message.role === "assistant" && (
                      <div className="mt-3 flex items-center justify-between text-muted-foreground text-xs">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            Confidence:{" "}
                            <Badge variant="secondary">Calculating...</Badge>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="ghost">
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost">
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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
                      Minimum 70% for responses
                    </p>
                  </div>
                  <Badge variant="outline">70%</Badge>
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
