"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  AlertTriangle,
  CheckCircle,
  CreditCard,
  DollarSign,
  FileText,
  Mail,
  Send,
  Users,
  XCircle,
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

type XeroConnectionStatus = {
  connected: boolean;
  organisationName?: string;
};

const suggestedTasks = [
  "Ingest these three supplier bills and suggest GL accounts and GST codes",
  "Prepare a payment run for next Wednesday. Exclude disputed invoices.",
  "Validate this vendor's ABN: 51 824 753 556",
  "Check if this bill is a duplicate: Officeworks, $450.50, dated 2024-11-05",
  "Draft a follow-up email to a vendor about a missing tax invoice",
  "Generate a payment batch proposal for bills due this week",
];

function getRiskBadge(level: string) {
  switch (level?.toLowerCase()) {
    case "low":
      return (
        <Badge className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="mr-1 h-3 w-3" />
          Low Risk
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Medium Risk
        </Badge>
      );
    case "high":
      return (
        <Badge className="bg-orange-500 hover:bg-orange-600">
          <AlertTriangle className="mr-1 h-3 w-3" />
          High Risk
        </Badge>
      );
    case "critical":
      return (
        <Badge className="bg-red-500 hover:bg-red-600">
          <XCircle className="mr-1 h-3 w-3" />
          Critical Risk
        </Badge>
      );
    default:
      return <Badge variant="outline">{level}</Badge>;
  }
}

export default function APAgentPage() {
  const [requireABN, setRequireABN] = useState(true);
  const [gstValidation, setGstValidation] = useState(true);
  const [duplicateCheckDays, setDuplicateCheckDays] = useState(90);
  const [input, setInput] = useState("");

  // Check Xero connection status
  const { data: xeroStatus } = useSWR<XeroConnectionStatus>(
    "/api/xero/status",
    fetcher,
    {
      fallbackData: { connected: false },
    }
  );

  // Use real chat API
  const chat = useChat({
    id: "ap-agent",
    transport: new DefaultChatTransport({
      api: "/api/agents/ap",
      fetch,
      prepareSendMessagesRequest(request: any) {
        return {
          body: {
            messages: request.messages,
            settings: {
              model: "anthropic-claude-sonnet-4-5",
              requireABN,
              gstValidation,
              duplicateCheckDays,
              autoApprovalThreshold: 1000, // $1,000 auto-approval threshold
              defaultPaymentTerms: "NET30",
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

  const handleSuggestedTask = (task: string) => {
    setInput(task);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6">
      {/* AP Overview Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Accounts Payable Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs uppercase">
                  Pending Bills
                </p>
                <Badge variant="secondary">
                  <FileText className="mr-1 h-3 w-3" />0
                </Badge>
              </div>
              <Progress value={0} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs uppercase">
                  Awaiting Approval
                </p>
                <Badge variant="secondary">
                  <AlertTriangle className="mr-1 h-3 w-3" />0
                </Badge>
              </div>
              <Progress value={0} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs uppercase">
                  Due This Week
                </p>
                <Badge variant="secondary">
                  <DollarSign className="mr-1 h-3 w-3" />0
                </Badge>
              </div>
              <Progress value={0} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs uppercase">
                  Active Vendors
                </p>
                <Badge variant="secondary">
                  <Users className="mr-1 h-3 w-3" />0
                </Badge>
              </div>
              <Progress value={0} />
            </div>
          </div>

          <div className="rounded-md border bg-muted/40 p-3 text-xs">
            <div className="flex items-center gap-2">
              {xeroStatus?.connected ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <p className="text-foreground">
                    <span className="font-semibold">Xero Connected:</span>{" "}
                    {xeroStatus.organisationName}
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    <span className="font-semibold">Xero not connected.</span>{" "}
                    Connect Xero in Settings → Integrations for real-time bill
                    access.
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Chat Interface */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              AP Workspace
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Process supplier bills, validate vendors, generate payment runs,
              and draft vendor communications. All operations are GST-aware for
              Australian businesses.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Conversation History */}
            <ScrollArea className="h-[500px] rounded-md border bg-muted/20 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    <p>
                      Start a conversation or select a suggested task below
                    </p>
                  </div>
                )}

                {messages.map((message) => {
                  return (
                    <div
                      className="rounded-lg border bg-card p-4 shadow-sm"
                      data-role={message.role}
                      key={message.id}
                    >
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span className="font-medium text-foreground capitalize">
                          {message.role === "user" ? "You" : "AP Agent"}
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
                    </div>
                  );
                })}

                {status === "in_progress" && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Processing...</span>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="space-y-2">
              <Textarea
                className="min-h-[100px] resize-none"
                disabled={status === "in_progress"}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your AP task... (e.g., 'Process this Officeworks bill for $450 dated today, suggest coding')"
                value={input}
              />
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs">
                  Press Enter to send, Shift+Enter for new line
                </p>
                <Button
                  disabled={!input.trim() || status === "in_progress"}
                  onClick={handleSendMessage}
                  size="sm"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar: Settings and Quick Actions */}
        <div className="space-y-4">
          {/* Agent Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Agent Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs" htmlFor="require-abn">
                  Require ABN
                </Label>
                <Switch
                  checked={requireABN}
                  id="require-abn"
                  onCheckedChange={setRequireABN}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs" htmlFor="gst-validation">
                  GST Validation
                </Label>
                <Switch
                  checked={gstValidation}
                  id="gst-validation"
                  onCheckedChange={setGstValidation}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs" htmlFor="duplicate-days">
                  Duplicate Check Days: {duplicateCheckDays}
                </Label>
                <input
                  className="w-full"
                  id="duplicate-days"
                  max="180"
                  min="30"
                  onChange={(e) =>
                    setDuplicateCheckDays(Number.parseInt(e.target.value))
                  }
                  step="30"
                  type="range"
                  value={duplicateCheckDays}
                />
                <p className="text-muted-foreground text-xs">
                  Check for duplicates in the last {duplicateCheckDays} days
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Suggested Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Suggested Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestedTasks.map((task, idx) => (
                <Button
                  className="h-auto w-full justify-start text-wrap text-left text-xs"
                  disabled={status === "in_progress"}
                  key={idx}
                  onClick={() => handleSuggestedTask(task)}
                  size="sm"
                  variant="outline"
                >
                  {task}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Common Operations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start text-xs"
                size="sm"
                variant="outline"
              >
                <FileText className="mr-2 h-4 w-4" />
                Upload Bill PDF
              </Button>
              <Button
                className="w-full justify-start text-xs"
                size="sm"
                variant="outline"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                View Payment Runs
              </Button>
              <Button
                className="w-full justify-start text-xs"
                size="sm"
                variant="outline"
              >
                <Users className="mr-2 h-4 w-4" />
                Manage Vendors
              </Button>
              <Button
                className="w-full justify-start text-xs"
                size="sm"
                variant="outline"
              >
                <Mail className="mr-2 h-4 w-4" />
                Email Drafts
              </Button>
            </CardContent>
          </Card>

          {/* Risk Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Risk Levels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs">Low Risk</span>
                {getRiskBadge("low")}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Medium Risk</span>
                {getRiskBadge("medium")}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">High Risk</span>
                {getRiskBadge("high")}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Critical Risk</span>
                {getRiskBadge("critical")}
              </div>
              <Separator className="my-2" />
              <p className="text-muted-foreground text-xs">
                Risk scores: Low (&lt;20), Medium (20-39), High (40-59),
                Critical (60+)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
