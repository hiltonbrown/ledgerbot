"use client";

import { useState } from "react";
import { ArrowUpRight, BookmarkPlus, MessageSquareText, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const suggestedQuestions = [
  "What did we spend on marketing last quarter?",
  "Summarise the top five variances from budget",
  "Draft an email to the CFO summarising this month's cash flow",
];

const conversationHistory = [
  {
    role: "user" as const,
    content: "How are we tracking against the R&D tax incentive this year?",
    timestamp: "12 Nov, 09:14",
  },
  {
    role: "assistant" as const,
    content:
      "You have utilised 62% of the allocated R&D spend. Based on current burn the agent expects eligibility for $182k. I've queued a task for the compliance agent to double-check supporting evidence.",
    timestamp: "12 Nov, 09:14",
    confidence: 0.86,
  },
  {
    role: "user" as const,
    content: "Please draft a note for the board with the latest runway.",
    timestamp: "12 Nov, 09:15",
  },
  {
    role: "assistant" as const,
    content:
      "Here's a concise update: 'As at 12 Nov we forecast 13.4 months runway (likely case). Upside scenario extends to 15.2 months, downside compresses to 11.1 months. See appended assumptions for detail.'",
    timestamp: "12 Nov, 09:15",
    confidence: 0.9,
  },
];

export default function QandAAgentPage() {
  const [streamResponses, setStreamResponses] = useState(true);
  const [captureFeedback, setCaptureFeedback] = useState(true);

  return (
    <div className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquareText className="h-5 w-5 text-primary" />
              Advisory workspace
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Converse with the ledger-aware assistant, escalate to humans and surface citations from the knowledge base.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-4">
              <Label className="text-xs uppercase text-muted-foreground">Ask the agent</Label>
              <Textarea className="mt-2" placeholder="Ask about cash flow, variances or compliance tasks" rows={3} />
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Switch checked={streamResponses} onCheckedChange={setStreamResponses} />
                  <span>Stream response tokens</span>
                </div>
                <Button size="sm">
                  Send prompt
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-[420px]">
              <div className="space-y-4">
                {conversationHistory.map((message, index) => (
                  <div
                    className="rounded-lg border bg-card p-4 shadow-sm"
                    data-role={message.role}
                    key={`${message.timestamp}-${index}`}
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground capitalize">{message.role}</span>
                      <span>{message.timestamp}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">{message.content}</p>
                    {message.role === "assistant" ? (
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Confidence {Math.round((message.confidence ?? 0) * 100)}%</span>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="ghost">
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost">
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost">
                            <BookmarkPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Suggested questions</CardTitle>
            <p className="text-muted-foreground text-sm">
              Jump straight into common workflows with curated prompts.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestedQuestions.map((question) => (
              <Button className="w-full justify-between" key={question} variant="outline">
                {question}
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            ))}
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <p className="font-semibold">Knowledge base coverage</p>
              <p className="text-muted-foreground">
                Powered by 1,242 documents across policies, accounting standards and operating procedures.
              </p>
            </div>
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <p className="font-semibold">Feedback capture</p>
              <div className="mt-2 flex items-center justify-between">
                <span>Ask follow-up when users downvote</span>
                <Switch checked={captureFeedback} onCheckedChange={setCaptureFeedback} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
