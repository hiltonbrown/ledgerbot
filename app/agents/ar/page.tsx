"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AlertCircle, DollarSign, MessageSquareText, Send } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const suggestedQuestions = [
  "Show me all overdue invoices",
  "List invoices overdue by more than 30 days",
  "Generate polite reminders for overdue invoices",
  "What's the payment risk for invoice INV-2025-001?",
  "Sync invoices from Xero",
];

export default function ArAgentPage() {
  const [input, setInput] = useState("");
  const [minDaysOverdue, setMinDaysOverdue] = useState("0");
  const [tone, setTone] = useState<"polite" | "firm" | "final">("polite");
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [asOf, setAsOf] = useState("");

  // Use real chat API
  const chat = useChat({
    id: "ar-agent",
    transport: new DefaultChatTransport({
      api: "/api/agents/ar",
      fetch,
      prepareSendMessagesRequest(request: unknown) {
        return {
          body: {
            messages: (request as { messages: unknown[] }).messages,
            settings: {
              model: "anthropic-claude-sonnet-4-5",
              minDaysOverdue: Number.parseInt(minDaysOverdue) || 0,
              tone,
              autoConfirm,
              asOf: asOf || undefined,
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
    } as never);
    setInput("");
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  const handleRunDunning = async () => {
    const confirmed = confirm(
      `Run dunning cycle with:\n- Min days overdue: ${minDaysOverdue}\n- Tone: ${tone}\n- Auto-confirm: ${autoConfirm ? "Yes" : "No"}\n\nProceed?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/agents/ar/run-dunning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asOf: asOf || undefined,
          minDaysOverdue: Number.parseInt(minDaysOverdue) || 0,
          tone,
          autoConfirm,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to run dunning cycle");
      }

      alert("Dunning cycle started! Check messages for results.");

      // Optionally parse SSE stream and show in chat
      // For now, just show a success message
      sendMessage({
        role: "user",
        parts: [
          {
            type: "text",
            text: `Run dunning cycle (${minDaysOverdue}+ days, ${tone} tone)`,
          },
        ],
      } as never);
    } catch (error) {
      console.error("Error running dunning cycle:", error);
      alert("Failed to run dunning cycle. Check console for details.");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">AR Agent</h1>
        <p className="text-muted-foreground">
          Accounts Receivable management with AI-powered dunning and risk
          assessment
        </p>
        <Badge className="mt-2 bg-red-500 hover:bg-red-600">
          Comms Disabled - Artefacts Only
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Filters & Controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="asOf">As-of Date</Label>
                <Input
                  id="asOf"
                  type="date"
                  value={asOf}
                  onChange={(e) => setAsOf(e.target.value)}
                  placeholder="Today"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minDaysOverdue">Min Days Overdue</Label>
                <Input
                  id="minDaysOverdue"
                  type="number"
                  min="0"
                  value={minDaysOverdue}
                  onChange={(e) => setMinDaysOverdue(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tone">Reminder Tone</Label>
                <Select
                  value={tone}
                  onValueChange={(v) =>
                    setTone(v as "polite" | "firm" | "final")
                  }
                >
                  <SelectTrigger id="tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="polite">Polite (1-30 days)</SelectItem>
                    <SelectItem value="firm">Firm (31-60 days)</SelectItem>
                    <SelectItem value="final">Final (60+ days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoConfirm">Auto-confirm</Label>
                <Switch
                  id="autoConfirm"
                  checked={autoConfirm}
                  onCheckedChange={setAutoConfirm}
                />
              </div>

              <Separator />

              <Button
                onClick={handleRunDunning}
                className="w-full"
                variant="default"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Run Dunning Cycle
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Important
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Comms are DISABLED.</strong> This agent generates
                copy-ready email and SMS artefacts only.
              </p>
              <p>You must manually copy and send communications to customers.</p>
              <p className="text-xs mt-2">
                Mock Xero data is used when credentials are not configured.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Center Panel: Chat */}
        <div className="lg:col-span-2">
          <Card className="h-[calc(100vh-12rem)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareText className="w-5 h-5" />
                AR Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col h-full p-0">
              <ScrollArea className="flex-1 px-4">
                {messages.length === 0 && (
                  <div className="space-y-4 py-4">
                    <p className="text-muted-foreground text-sm">
                      Ask me about overdue invoices, payment risk, or generate
                      reminder artefacts:
                    </p>
                    <div className="space-y-2">
                      {suggestedQuestions.map((question, i) => (
                        <Button
                          key={question}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestedQuestion(question)}
                          className="w-full justify-start text-left"
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4 py-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={
                        message.role === "user"
                          ? "flex justify-end"
                          : "flex justify-start"
                      }
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap">
                          {typeof message.content === "string"
                            ? message.content
                            : JSON.stringify(message.content)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {status === "streaming" && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                          <span className="text-muted-foreground">
                            Thinking...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <Separator />

              <div className="p-4 space-y-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask about invoices, generate reminders, or reconcile payments..."
                  className="min-h-[80px]"
                  disabled={status === "streaming"}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || status === "streaming"}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
